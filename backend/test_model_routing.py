import os
import sys
import django
import unittest
from unittest.mock import patch, MagicMock

os.environ['USE_SQLITE'] = 'True'
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'cyberguardian.settings')
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

django.setup()

from core_engine.ai_agent import (
    GENERAL_OLLAMA_MODEL,
    PHISHING_OLLAMA_MODEL,
    OLLAMA_BASE_URL,
    OLLAMA_TIMEOUT,
    _call_fast_ollama,
    run_autonomous_analysis,
    run_log_analysis_ai,
    _compute_deterministic_scan_analysis,
    _compute_deterministic_log_analysis,
    _AI_SYNTHESIS_CACHE
)


class TestModelRouting(unittest.TestCase):

    def setUp(self):
        # Clear cache before each test
        _AI_SYNTHESIS_CACHE.clear()

    def test_constants_configured(self):
        """Verify configuration constants."""
        print("\n--- Test: Configuration Constants ---")
        self.assertEqual(GENERAL_OLLAMA_MODEL, "cyberguardian-ai:latest")
        self.assertEqual(PHISHING_OLLAMA_MODEL, "cyberguardian-phishing:latest")
        self.assertEqual(OLLAMA_BASE_URL, "http://localhost:11434")
        self.assertGreaterEqual(OLLAMA_TIMEOUT, 30.0)
        print(f"PASS: GENERAL={GENERAL_OLLAMA_MODEL}, PHISHING={PHISHING_OLLAMA_MODEL}, URL={OLLAMA_BASE_URL}, TIMEOUT={OLLAMA_TIMEOUT}s")

    def test_a_website_analysis_uses_phishing_then_general_model(self):
        """Test A: Target analysis first uses cyberguardian-phishing then cyberguardian-ai."""
        print("\n--- Test A: Target Security Analysis Sequential Routing ---")
        captured_models = []

        def mock_call(prompt, model=None, timeout=None, num_predict=180):
            captured_models.append(model)
            if model == PHISHING_OLLAMA_MODEL:
                return {
                    "is_phishing": False,
                    "severity": "Low",
                    "summary": "No phishing indicators detected by specialist model.",
                    "indicators": []
                }
            return {
                "severity": "Low",
                "is_phishing": False,
                "summary": "Mock normal website analysis summary from general model.",
                "recommendations": ["Ensure regular patching"]
            }

        with patch('core_engine.ai_agent._call_fast_ollama', side_effect=mock_call), \
             patch('core_engine.ai_agent.scan_website_headers', return_value={"Strict-Transport-Security": "max-age=31536000"}), \
             patch('core_engine.ai_agent.check_ssl_certificate', return_value={"status": "Valid"}), \
             patch('core_engine.ai_agent.scan_ports', return_value=[]), \
             patch('core_engine.ai_agent.check_virustotal', return_value={"positives": 0, "status": "Clean"}):

            res = run_autonomous_analysis("safe-example.com")
            self.assertIn("ai_analysis", res)
            self.assertEqual(len(captured_models), 2)
            self.assertEqual(captured_models[0], PHISHING_OLLAMA_MODEL)
            self.assertEqual(captured_models[1], GENERAL_OLLAMA_MODEL)
            self.assertFalse(res["is_phishing"])
            print(f"PASS: Sequential routing confirmed: 1st={captured_models[0]}, 2nd={captured_models[1]}")

    def test_b_phishing_analysis_uses_phishing_then_general_model(self):
        """Test B: Phishing analysis first uses cyberguardian-phishing then cyberguardian-ai."""
        print("\n--- Test B: Phishing Attack Sequential Routing ---")
        captured_models = []

        def mock_call(prompt, model=None, timeout=None, num_predict=180):
            captured_models.append(model)
            if model == PHISHING_OLLAMA_MODEL:
                return {
                    "severity": "Critical",
                    "is_phishing": True,
                    "summary": "Active credential harvesting detected by phishing model.",
                    "indicators": ["Fake login form", "Deceptive domain"]
                }
            return {
                "severity": "Critical",
                "is_phishing": True,
                "summary": "High risk phishing infrastructure confirmed.",
                "recommendations": ["Block domain immediately across firewall"]
            }

        with patch('core_engine.ai_agent._call_fast_ollama', side_effect=mock_call), \
             patch('core_engine.ai_agent.scan_website_headers', return_value={}), \
             patch('core_engine.ai_agent.check_ssl_certificate', return_value={"status": "Error"}), \
             patch('core_engine.ai_agent.scan_ports', return_value=[80, 443, 8080]), \
             patch('core_engine.ai_agent.check_virustotal', return_value={"positives": 12, "status": "Malicious", "category": "phishing"}):

            res = run_autonomous_analysis("phishing-login-fake.com")
            self.assertIn("ai_analysis", res)
            self.assertEqual(len(captured_models), 2)
            self.assertEqual(captured_models[0], PHISHING_OLLAMA_MODEL)
            self.assertEqual(captured_models[1], GENERAL_OLLAMA_MODEL)
            self.assertTrue(res["is_phishing"])
            self.assertIn(res["ai_analysis"]["severity"], ["Critical", "High"])
            self.assertIn("Fake login form", res["phishing_indicators"])
            print(f"PASS: Phishing threat evaluated sequentially: 1st={captured_models[0]}, 2nd={captured_models[1]}")

    def test_c_soc_log_analysis_routes_to_general_model(self):
        """Test C: SOC / log analysis routes to cyberguardian-ai:latest."""
        print("\n--- Test C: SOC / Log Analysis Routing ---")
        captured_models = []

        def mock_call(prompt, model=None, *args, **kwargs):
            captured_models.append(model)
            return {
                "severity": "High",
                "summary": "Mock SOC log threat correlation",
                "recommendations": ["Block brute force attackers"]
            }

        parsed_data = {
            "total_requests": 150,
            "unique_ips_count": 12,
            "error_rate": 22.5,
            "brute_force_ips": [{"ip": "192.168.1.100", "count": 15}],
            "directory_scans": [{"ip": "192.168.1.100", "path": "/wp-login.php"}]
        }

        with patch('core_engine.ai_agent._call_fast_ollama', side_effect=mock_call):
            res = run_log_analysis_ai(parsed_data)
            self.assertEqual(len(captured_models), 1)
            self.assertEqual(captured_models[0], GENERAL_OLLAMA_MODEL)
            self.assertEqual(res["severity"], "High")
            print(f"PASS: SOC log analysis correctly routed to model: {captured_models[0]}")

    def test_d_ollama_unavailable_fallback(self):
        """Test D: Application falls back to deterministic analysis when Ollama is unavailable."""
        print("\n--- Test D: Ollama Unavailable Graceful Fallback ---")
        with patch('requests.get', side_effect=Exception("Connection refused")):
            # _call_fast_ollama should safely return None without crashing
            res_ollama = _call_fast_ollama("Test prompt", model=GENERAL_OLLAMA_MODEL)
            self.assertIsNone(res_ollama)

            # run_autonomous_analysis should produce deterministic result
            with patch('core_engine.ai_agent.scan_website_headers', return_value={}), \
                 patch('core_engine.ai_agent.check_ssl_certificate', return_value={"status": "Valid"}), \
                 patch('core_engine.ai_agent.scan_ports', return_value=[]), \
                 patch('core_engine.ai_agent.check_virustotal', return_value={"positives": 0, "status": "Clean"}):
                res = run_autonomous_analysis("offline-test.com")
                self.assertIsNotNone(res.get("ai_analysis"))
                self.assertIn("summary", res["ai_analysis"])
                self.assertIn("recommendations", res["ai_analysis"])
                self.assertEqual(res["ai_analysis"]["severity"], "Low")

            # run_log_analysis_ai should produce deterministic result
            parsed_data = {
                "total_requests": 50,
                "unique_ips_count": 2,
                "error_rate": 0,
                "brute_force_ips": [],
                "directory_scans": []
            }
            log_res = run_log_analysis_ai(parsed_data)
            self.assertIsNotNone(log_res)
            self.assertIn("summary", log_res)
            self.assertIn("recommendations", log_res)
            self.assertEqual(log_res["severity"], "Low")

            print("PASS: Application seamlessly uses deterministic analysis when Ollama is offline.")

    def test_e_unavailable_model_does_not_switch_silently(self):
        """Test E: Requesting an unavailable model returns None and does not silently use unrelated model."""
        print("\n--- Test E: Unavailable Model Handling ---")
        mock_tags = MagicMock()
        mock_tags.status_code = 200
        mock_tags.json.return_value = {
            "models": [
                {"name": "cyberguardian-ai:latest"},
                {"name": "cyberguardian-phishing:latest"}
            ]
        }
        with patch('requests.get', return_value=mock_tags):
            res = _call_fast_ollama("Test prompt", model="nonexistent-model-xyz")
            self.assertIsNone(res)
            print("PASS: Unavailable model returned None without silent model switching.")

    def test_f_guardrail_prevents_downgrade(self):
        """Test F: Security guardrail prevents LLM from downgrading confirmed phishing."""
        print("\n--- Test F: Security Guardrail Downgrade Prevention ---")
        # LLM maliciously or mistakenly claims Low severity and not phishing
        def mock_llm_downgrade(prompt, model=None, *args, **kwargs):
            return {
                "severity": "Low",
                "is_phishing": False,
                "summary": "This site looks fine!",
                "recommendations": []
            }

        with patch('core_engine.ai_agent._call_fast_ollama', side_effect=mock_llm_downgrade), \
             patch('core_engine.ai_agent.scan_website_headers', return_value={}), \
             patch('core_engine.ai_agent.check_ssl_certificate', return_value={"status": "Error"}), \
             patch('core_engine.ai_agent.scan_ports', return_value=[]), \
             patch('core_engine.ai_agent.check_virustotal', return_value={"positives": 15, "status": "Malicious", "category": "phishing"}):

            res = run_autonomous_analysis("phishing-downgrade-test.com")
            # Guardrail MUST keep is_phishing=True and severity Critical/High
            self.assertTrue(res["is_phishing"])
            self.assertEqual(res["ai_analysis"]["is_phishing"], True)
            self.assertIn(res["ai_analysis"]["severity"], ["Critical", "High"])
            self.assertLessEqual(res["security_score"], 30)
            print(f"PASS: Guardrail enforced: is_phishing={res['is_phishing']}, severity={res['ai_analysis']['severity']}")

    def test_g_phishing_model_only_available(self):
        """Test G: If general model fails/unavailable, phishing model result is safely retained."""
        print("\n--- Test G: Phishing Model Only Available ---")
        def mock_call(prompt, model=None, timeout=None, num_predict=180):
            if model == PHISHING_OLLAMA_MODEL:
                return {
                    "severity": "High",
                    "is_phishing": True,
                    "summary": "Phishing model flagged brand spoofing.",
                    "indicators": ["Spoofed logo"]
                }
            return None  # General model unavailable

        with patch('core_engine.ai_agent._call_fast_ollama', side_effect=mock_call), \
             patch('core_engine.ai_agent.scan_website_headers', return_value={}), \
             patch('core_engine.ai_agent.check_ssl_certificate', return_value={"status": "Valid"}), \
             patch('core_engine.ai_agent.scan_ports', return_value=[]), \
             patch('core_engine.ai_agent.check_virustotal', return_value={"positives": 0, "status": "Clean"}):

            res = run_autonomous_analysis("spoofed-brand.com")
            self.assertTrue(res["is_phishing"])
            self.assertEqual(res["ai_analysis"]["is_phishing"], True)
            self.assertIn("Spoofed logo", res["phishing_indicators"])
            print("PASS: Phishing model result cleanly retained when general model is offline.")

    def test_h_general_model_only_available(self):
        """Test H: If phishing model is unavailable, general model completes the scan smoothly."""
        print("\n--- Test H: General Model Only Available ---")
        def mock_call(prompt, model=None, timeout=None, num_predict=180):
            if model == PHISHING_OLLAMA_MODEL:
                return None  # Phishing model unavailable
            return {
                "severity": "Low",
                "is_phishing": False,
                "summary": "General model verified clean target.",
                "recommendations": ["Routine maintenance"]
            }

        with patch('core_engine.ai_agent._call_fast_ollama', side_effect=mock_call), \
             patch('core_engine.ai_agent.scan_website_headers', return_value={}), \
             patch('core_engine.ai_agent.check_ssl_certificate', return_value={"status": "Valid"}), \
             patch('core_engine.ai_agent.scan_ports', return_value=[]), \
             patch('core_engine.ai_agent.check_virustotal', return_value={"positives": 0, "status": "Clean"}):

            res = run_autonomous_analysis("clean-portal.org")
            self.assertFalse(res["is_phishing"])
            self.assertEqual(res["ai_analysis"]["severity"], "Low")
            print("PASS: General model completed analysis when phishing model was unavailable.")


if __name__ == '__main__':
    unittest.main()
