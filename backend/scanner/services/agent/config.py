"""
Autonomous AI Security Agent Configuration and Health Diagnostics.
"""
import os
import requests
from typing import Dict, Any, List


class AgentConfig:
    """Reads environment configurations for the AI Security Agent."""

    @staticmethod
    def get_ollama_base_url() -> str:
        return os.environ.get('OLLAMA_BASE_URL', 'http://localhost:11434').rstrip('/')

    @staticmethod
    def get_ollama_model() -> str:
        return os.environ.get('OLLAMA_MODEL', 'qwen2.5:7b')

    @staticmethod
    def get_agent_timeout() -> int:
        try:
            return int(os.environ.get('AGENT_TIMEOUT', '45'))
        except ValueError:
            return 45

    @staticmethod
    def get_agent_max_steps() -> int:
        try:
            return int(os.environ.get('AGENT_MAX_STEPS', '5'))
        except ValueError:
            return 5

    @staticmethod
    def is_agent_enabled() -> bool:
        return os.environ.get('AGENT_ENABLED', 'True').lower() in ('true', '1', 'yes', 'on')

    @staticmethod
    def get_max_concurrent_sessions() -> int:
        try:
            return int(os.environ.get('MAX_CONCURRENT_AGENT_SESSIONS', '3'))
        except ValueError:
            return 3


def check_ollama_health() -> Dict[str, Any]:
    """
    Checks Ollama server availability and whether the configured model is installed.
    Returns a structured status dictionary.
    """
    base_url = AgentConfig.get_ollama_base_url()
    configured_model = AgentConfig.get_ollama_model()
    enabled = AgentConfig.is_agent_enabled()

    if not enabled:
        return {
            "status": "DISABLED",
            "available": False,
            "model_available": False,
            "configured_model": configured_model,
            "base_url": base_url,
            "installed_models": [],
            "message": "AI Security Agent is currently disabled by configuration (AGENT_ENABLED=False).",
            "setup_instructions": "Set AGENT_ENABLED=True in .env to enable the AI Agent."
        }

    try:
        response = requests.get(f"{base_url}/api/tags", timeout=3)
        if response.status_code == 200:
            data = response.json()
            raw_models: List[Dict[str, Any]] = data.get('models', [])
            installed_models = [m.get('name', '') for m in raw_models if m.get('name')]

            # Match model name either by exact match, tag prefix, or clean name
            # e.g. "qwen2.5:7b" matches "qwen2.5:7b" or "qwen2.5:latest" or "cybersec-ai"
            clean_config = configured_model.lower().split(':')[0]
            model_exists = any(
                configured_model.lower() == m.lower() or
                m.lower().startswith(f"{clean_config}:") or
                clean_config == m.lower()
                for m in installed_models
            )

            return {
                "status": "HEALTHY" if model_exists else "MODEL_MISSING",
                "available": True,
                "model_available": model_exists,
                "configured_model": configured_model,
                "base_url": base_url,
                "installed_models": installed_models,
                "message": f"Ollama is running with model '{configured_model}' available." if model_exists
                           else f"Ollama is reachable, but model '{configured_model}' is not installed.",
                "setup_instructions": "" if model_exists else f"Run 'ollama pull {configured_model}' in your terminal to install the model."
            }
        else:
            return {
                "status": "ERROR",
                "available": False,
                "model_available": False,
                "configured_model": configured_model,
                "base_url": base_url,
                "installed_models": [],
                "message": f"Ollama returned HTTP status {response.status_code}.",
                "setup_instructions": "Verify that your Ollama server is running properly."
            }
    except Exception as e:
        return {
            "status": "UNAVAILABLE",
            "available": False,
            "model_available": False,
            "configured_model": configured_model,
            "base_url": base_url,
            "installed_models": [],
            "message": f"Could not connect to Ollama runtime at {base_url}.",
            "setup_instructions": "Ensure Ollama is installed and running (e.g. run 'ollama serve' or start the Ollama desktop app)."
        }
