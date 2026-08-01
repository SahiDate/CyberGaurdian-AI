# pyrefly: ignore [missing-import]
try:
    # pyrefly: ignore [missing-import]
    from langchain_community.llms import Ollama
except ImportError:
    # Fallback: attempt import from base langchain package or define a minimal stub
    try:
        from langchain.llms import Ollama  # type: ignore
    except ImportError:
        class Ollama:
            """Placeholder Ollama LLM class when the real implementation is unavailable.

            It mimics the interface used in this project by raising a clear error upon usage.
            """
            def __init__(self, model: str = "llama3"):
                raise ImportError(
                    "Ollama LLM class is unavailable because the required package "
                    "'langchain_community' is not installed. Please install it "
                    "or ensure Ollama is accessible."
                )

            def __call__(self, *args, **kwargs):
                raise NotImplementedError("Ollama placeholder cannot be called.")

# pyrefly: ignore [missing-import]
try:
    # pyrefly: ignore [missing-import]
    from langchain_core.prompts import PromptTemplate
except ImportError:
    try:
        from langchain.prompts import PromptTemplate  # type: ignore
    except ImportError:
        class PromptTemplate:  # type: ignore
            """Placeholder PromptTemplate when langchain_core is not installed."""
            def __init__(self, input_variables=None, template=""):
                self.template = template
                self.input_variables = input_variables or []

            def __or__(self, other):
                raise ImportError(
                    "langchain_core is not installed. Run: pip install langchain-core"
                )
import json
from .scanners import scan_website_headers, check_ssl_certificate, scan_ports
from .threat_intel import check_virustotal

def run_autonomous_analysis(target):
    """
    The main autonomous workflow.
    Takes an input, runs tools, and feeds results to the LLM for synthesis.
    """
    
    # 1. Run Scanners
    print(f"Running scans on {target}...")
    headers = scan_website_headers(target)
    ssl_info = check_ssl_certificate(target)
    ports = scan_ports(target)
    
    # 2. Run Threat Intel
    vt_result = check_virustotal(target)
    
    # 3. Compile Findings
    findings = {
        "target": target,
        "security_headers": headers,
        "ssl": ssl_info,
        "open_ports": ports,
        "threat_intel": vt_result
    }
    
    # 4. Generate AI Recommendations (using local Ollama)
    try:
        # Assumes Ollama is running locally with llama3 or a similar model
        llm = Ollama(model="llama3") 
        
        prompt = PromptTemplate(
            input_variables=["findings"],
            template="""
            You are CyberGuardian AI, an expert autonomous cybersecurity analyst.
            Analyze the following findings for the target and provide a final JSON report.
            Do not include any markdown formatting, only pure JSON.
            
            Findings: {findings}
            
            Your JSON output must follow this exact structure:
            {{
                "severity": "Low/Medium/High/Critical",
                "summary": "2 sentence summary of the risk",
                "recommendations": ["rec1", "rec2", "rec3"]
            }}
            """
        )
        
        chain = prompt | llm
        ai_response = chain.invoke({"findings": json.dumps(findings)})
        
        try:
            # Clean up the output in case the LLM returned markdown blocks
            clean_json = ai_response.replace('```json', '').replace('```', '').strip()
            ai_analysis = json.loads(clean_json)
        except json.JSONDecodeError:
            ai_analysis = {
                "severity": "Unknown",
                "summary": "Failed to parse AI response. Raw output: " + ai_response,
                "recommendations": []
            }
            
    except Exception as e:
        ai_analysis = {
            "severity": "Error",
            "summary": f"Could not connect to Ollama AI Agent: {str(e)}",
            "recommendations": ["Ensure Ollama is running locally with the llama3 model."]
        }
        
    findings["ai_analysis"] = ai_analysis
    return findings

def run_log_analysis_ai(parsed_data):
    """
    Synthesize parsed log data using local Ollama model to generate threats summary and recommendations.
    """
    metrics_summary = {
        "total_requests": parsed_data["total_requests"],
        "unique_ips": parsed_data["unique_ips_count"],
        "error_rate_pct": parsed_data["error_rate"],
        "brute_force_attempts_count": len(parsed_data["brute_force_ips"]),
        "brute_force_ips": [item["ip"] for item in parsed_data["brute_force_ips"]],
        "directory_scans_count": len(parsed_data["directory_scans"]),
        "directory_scan_ips": [item["ip"] for item in parsed_data["directory_scans"]]
    }

    try:
        llm = Ollama(model="llama3")
        
        prompt = PromptTemplate(
            input_variables=["metrics"],
            template="""
            You are CyberGuardian AI, an expert SOC Analyst.
            Analyze the following parsed log summary and assess the security risk.
            Do not include any markdown formatting, only pure JSON.
            
            Parsed Log Metrics: {metrics}
            
            Your JSON output must follow this exact structure:
            {{
                "severity": "Low/Medium/High/Critical",
                "summary": "2-3 sentence summary of the security risk and logs analyzed",
                "recommendations": ["rec1", "rec2", "rec3"]
            }}
            """
        )
        
        chain = prompt | llm
        ai_response = chain.invoke({"metrics": json.dumps(metrics_summary)})
        
        try:
            clean_json = ai_response.replace('```json', '').replace('```', '').strip()
            ai_analysis = json.loads(clean_json)
        except json.JSONDecodeError:
            ai_analysis = {
                "severity": "Unknown",
                "summary": "Failed to parse AI response. Raw output: " + ai_response,
                "recommendations": []
            }
            
    except Exception as e:
        # Fallback to rule-based analysis if Ollama is not active
        if metrics_summary["brute_force_attempts_count"] > 0 or metrics_summary["directory_scans_count"] > 0:
            severity = "High"
            summary = f"Detected {metrics_summary['brute_force_attempts_count']} brute force hosts and {metrics_summary['directory_scans_count']} directory scanning hosts."
            recommendations = [
                f"Block attacker IPs: {', '.join(metrics_summary['brute_force_ips'] + metrics_summary['directory_scan_ips'])}",
                "Restrict access to administrative paths (e.g. /wp-admin, .env)",
                "Implement rate-limiting on authentication and API endpoints",
                "Configure web application firewall (WAF) to filter malicious patterns"
            ]
        else:
            severity = "Low"
            summary = f"Analyzed {metrics_summary['total_requests']} requests from {metrics_summary['unique_ips']} hosts. No immediate threats found."
            recommendations = [
                "Continue standard system logging and log backups",
                "Monitor for unusual activity spikes",
                "Keep default security firewall active"
            ]
            
        ai_analysis = {
            "severity": severity,
            "summary": summary + " (Rule-based Fallback)",
            "recommendations": recommendations
        }
        
    return ai_analysis
