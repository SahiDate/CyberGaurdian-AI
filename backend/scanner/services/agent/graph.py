"""
LangGraph State Machine for Controlled Autonomous AI Security Agent.
"""
import time
import requests
from typing import Dict, Any, List, Optional
from django.contrib.auth import get_user_model

try:
    from langgraph.graph import StateGraph, END
except ImportError:
    # Graceful fallback in case langgraph is loaded in alternative namespace
    StateGraph = None
    END = "__end__"

from .state import AgentState, AgentStepData
from .config import AgentConfig, check_ollama_health
from .safety import validate_agent_target, detect_tool_loop
from .prompts import (
    SYSTEM_PROMPT, build_decision_prompt, build_assessment_prompt,
    parse_llm_json_action, parse_llm_json_assessment
)
from .tools import TOOL_REGISTRY, get_available_tools_for_target
from scanner.services.soc_engine.engine import SOCAnalysisEngine, extract_target_identifiers

User = get_user_model()


# ──────────────────────────────────────────────────────────────────────────────
# LLM Invocation Helpers
# ──────────────────────────────────────────────────────────────────────────────

def call_ollama_llm(prompt: str, system: str = SYSTEM_PROMPT, timeout: int = 30) -> Optional[str]:
    """Sends prompt to local Ollama runtime and returns text response."""
    base_url = AgentConfig.get_ollama_base_url()
    model = AgentConfig.get_ollama_model()

    try:
        payload = {
            "model": model,
            "prompt": prompt,
            "system": system,
            "stream": False,
            "options": {
                "temperature": 0.1,  # Low temperature for deterministic analysis
                "top_p": 0.9,
            }
        }
        res = requests.post(f"{base_url}/api/generate", json=payload, timeout=timeout)
        if res.status_code == 200:
            return res.json().get("response", "").strip()
    except Exception:
        pass
    return None


# ──────────────────────────────────────────────────────────────────────────────
# LangGraph Node Implementations
# ──────────────────────────────────────────────────────────────────────────────

def node_load_context(state: AgentState) -> AgentState:
    """Loads authorized target identifiers and initial historical security telemetry."""
    target = state.get("target", "").strip()
    user_id = state.get("user_id")

    identifiers = extract_target_identifiers(target)
    available_tools = get_available_tools_for_target(target)

    # Initial evidence retrieval
    initial_evidence: List[Dict[str, Any]] = []
    evidence_sources: List[str] = []

    try:
        user = User.objects.get(id=user_id) if user_id else None
        if user:
            # Query existing historical scans to seed the state
            engine = SOCAnalysisEngine()
            target_domain = identifiers.get('domain', '')
            target_hostname = identifiers.get('hostname', '')
            target_hash = identifiers.get('file_hash', '')

            # Execute auto-correlated initial SOC baseline
            init_soc = engine.analyze_evidence(
                target=target,
                threat_intel=user.threat_intel_results.filter(target__icontains=target_domain or target).first() if hasattr(user, 'threat_intel_results') else None,
                file_analysis=user.file_analyses.filter(sha256__iexact=target_hash).first() if target_hash and hasattr(user, 'file_analyses') else None,
                ssl_scan=user.ssl_scans.filter(domain__iexact=target_domain).first() if target_domain and hasattr(user, 'ssl_scans') else None,
                whois_lookup=user.whois_lookups.filter(domain__iexact=target_domain).first() if target_domain and hasattr(user, 'whois_lookups') else None,
                url_scan=user.url_scans.filter(domain__iexact=target_domain).first() if target_domain and hasattr(user, 'url_scans') else None,
                port_scan=user.port_scans.filter(target__iexact=target).first() if hasattr(user, 'port_scans') else None
            )

            state["soc_analysis"] = init_soc
            state["risk_score"] = init_soc.get("risk_score", 0)
            state["severity"] = init_soc.get("severity", "LOW")
            state["confidence"] = init_soc.get("confidence", 0)
            state["threat_level"] = init_soc.get("threat_level", "LOW")
            state["findings"] = init_soc.get("findings", [])
            state["recommendations"] = init_soc.get("recommendations", [])
            state["evidence_sources"] = init_soc.get("evidence_sources", [])
    except Exception as e:
        state["error"] = f"Error loading initial context: {str(e)}"

    state["target_identifiers"] = identifiers
    state["available_tools"] = available_tools
    state["initial_evidence"] = initial_evidence
    state["collected_evidence"] = list(initial_evidence)
    state["selected_tools"] = []
    state["execution_history"] = []
    state["tool_results"] = []
    state["steps"] = []
    state["step_count"] = 0
    state["status"] = "RUNNING"

    # Add initial Step
    step_data: AgentStepData = {
        "step_number": 1,
        "action": "LOAD_CONTEXT",
        "tool_name": "",
        "status": "COMPLETED",
        "reasoning_summary": f"Identified target as {identifiers.get('target_type', 'DOMAIN')}. Initialized available defensive tool registry.",
        "input_summary": {"target": target, "identifiers": identifiers},
        "output_summary": {"available_tools": available_tools, "initial_risk": state.get("risk_score", 0)},
        "created_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
    }
    state["steps"].append(step_data)

    return state


def node_analyze_evidence(state: AgentState) -> AgentState:
    """Correlates current evidence and evaluates baseline security risk."""
    return state


def node_decide_next_action(state: AgentState) -> AgentState:
    """
    Decides whether additional evidence is required from approved tools or to finish.
    Uses local Qwen model via Ollama if available; otherwise uses rule-based heuristic.
    """
    step_count = state.get("step_count", 0) + 1
    state["step_count"] = step_count
    max_steps = state.get("max_steps", AgentConfig.get_agent_max_steps())

    if step_count > max_steps:
        state["next_action"] = "FINISH"
        state["next_tool_reason"] = f"Reached maximum allowed analysis steps ({max_steps}). Finalizing assessment."
        return state

    target = state.get("target", "")
    identifiers = state.get("target_identifiers", {})
    available_tools = state.get("available_tools", [])
    execution_history = state.get("execution_history", [])
    evidence_sources = state.get("evidence_sources", [])
    soc_risk = state.get("risk_score", 0)
    severity = state.get("severity", "LOW")

    # Filter out already executed tools to prevent duplicate selection
    executed_tool_names = set(state.get("selected_tools", []))
    remaining_tools = [t for t in available_tools if t not in executed_tool_names]

    # Check Ollama health
    health = check_ollama_health()
    llm_decision = None

    if health.get("available") and health.get("model_available"):
        prompt = build_decision_prompt(
            target=target,
            target_type=identifiers.get("target_type", "DOMAIN"),
            evidence_summary=state.get("collected_evidence", []),
            available_tools=remaining_tools if remaining_tools else ["soc_analysis"],
            execution_history=execution_history,
            current_soc_risk=soc_risk,
            current_severity=severity,
            step_number=step_count,
            max_steps=max_steps
        )
        raw_output = call_ollama_llm(prompt, timeout=AgentConfig.get_agent_timeout())
        if raw_output:
            llm_decision = parse_llm_json_action(raw_output, available_tools)

    if llm_decision and llm_decision.get("action") in ("USE_TOOL", "FINISH"):
        state["next_action"] = llm_decision.get("action")
        state["next_tool"] = llm_decision.get("tool", "")
        state["next_tool_input"] = llm_decision.get("input", {"target": target})
        state["next_tool_reason"] = llm_decision.get("reason", "")
    else:
        # Deterministic Heuristic Fallback if Ollama is unavailable or unparsed
        if remaining_tools:
            # Pick the most relevant missing tool
            preferred_order = ["threat_intelligence", "ssl_scanner", "whois_lookup", "url_scanner", "port_scanner"]
            chosen_tool = None
            for p in preferred_order:
                if p in remaining_tools:
                    chosen_tool = p
                    break
            if not chosen_tool:
                chosen_tool = remaining_tools[0]

            state["next_action"] = "USE_TOOL"
            state["next_tool"] = chosen_tool
            state["next_tool_input"] = {"target": target}
            state["next_tool_reason"] = f"Executing {chosen_tool} to collect missing baseline security telemetry."
        else:
            state["next_action"] = "FINISH"
            state["next_tool_reason"] = "All applicable defensive security tools have been executed. Sufficient evidence for assessment."

    return state


def node_validate_tool(state: AgentState) -> AgentState:
    """Validates requested tool against Tool Registry, SSRF rules, and loop protection."""
    tool_name = state.get("next_tool", "")
    tool_input = state.get("next_tool_input", {})
    target = tool_input.get("target") or state.get("target")

    # 1. Registry check
    if tool_name not in TOOL_REGISTRY:
        state["next_action"] = "FINISH"
        state["reasoning_summary"] = f"Requested tool '{tool_name}' is not in the approved tool registry."
        return state

    # 2. SSRF & Target Safety check
    is_safe, error_msg = validate_agent_target(target)
    if not is_safe:
        state["next_action"] = "FINISH"
        state["error"] = error_msg
        state["reasoning_summary"] = f"Target safety check failed: {error_msg}"
        return state

    # 3. Loop protection check
    if detect_tool_loop(state.get("execution_history", []), tool_name, tool_input):
        state["next_action"] = "FINISH"
        state["reasoning_summary"] = f"Tool loop detected for '{tool_name}'. Terminating repetitive analysis."
        return state

    return state


def node_execute_tool(state: AgentState) -> AgentState:
    """Executes the approved tool from TOOL_REGISTRY with user-bound context."""
    tool_name = state.get("next_tool", "")
    tool_input = state.get("next_tool_input", {})
    target = tool_input.get("target") or state.get("target")
    user_id = state.get("user_id")

    tool_def = TOOL_REGISTRY.get(tool_name)
    if not tool_def:
        return state

    executor = tool_def["executor"]
    user = User.objects.filter(id=user_id).first() if user_id else None

    start_t = time.time()
    exec_result = executor(target=target, user=user, params=tool_input)
    duration = round(time.time() - start_t, 2)

    # Record history
    history_entry = {
        "step": state.get("step_count", 1),
        "tool": tool_name,
        "input": tool_input,
        "status": exec_result.status,
        "summary": exec_result.evidence.get("summary", f"{tool_name} executed successfully."),
        "duration": duration,
        "error": exec_result.error
    }
    state["execution_history"].append(history_entry)
    state["selected_tools"].append(tool_name)
    state["tool_results"].append(exec_result.to_dict())

    # Add Step to telemetry
    step_data: AgentStepData = {
        "step_number": len(state.get("steps", [])) + 1,
        "action": f"EXECUTE_{tool_name.upper()}",
        "tool_name": tool_name,
        "status": exec_result.status,
        "reasoning_summary": state.get("next_tool_reason") or f"Executed defensive tool '{tool_name}'.",
        "input_summary": tool_input,
        "output_summary": exec_result.evidence or {"error": exec_result.error},
        "created_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
    }
    state["steps"].append(step_data)

    return state


def node_normalize_result(state: AgentState) -> AgentState:
    """Normalizes new tool findings into collected evidence array."""
    for tr in state.get("tool_results", []):
        ev = tr.get("evidence", {})
        if ev and ev not in state.get("collected_evidence", []):
            state["collected_evidence"].append(ev)
    return state


def node_soc_analysis(state: AgentState) -> AgentState:
    """
    Invokes the deterministic Phase 8 SOC Analysis Engine.
    This maintains the SOC Engine as the 100% authoritative risk source.
    """
    target = state.get("target", "")
    user_id = state.get("user_id")
    user = User.objects.filter(id=user_id).first() if user_id else None

    if user:
        engine = SOCAnalysisEngine()
        identifiers = extract_target_identifiers(target)
        target_domain = identifiers.get('domain', '')
        target_hostname = identifiers.get('hostname', '')
        target_hash = identifiers.get('file_hash', '')

        soc_res = engine.analyze_evidence(
            target=target,
            threat_intel=user.threat_intel_results.filter(target__icontains=target_domain or target).order_by('-detected_at').first() if hasattr(user, 'threat_intel_results') else None,
            file_analysis=user.file_analyses.filter(sha256__iexact=target_hash).order_by('-created_at').first() if target_hash and hasattr(user, 'file_analyses') else None,
            ssl_scan=user.ssl_scans.filter(domain__iexact=target_domain).order_by('-created_at').first() if target_domain and hasattr(user, 'ssl_scans') else None,
            whois_lookup=user.whois_lookups.filter(domain__iexact=target_domain).order_by('-created_at').first() if target_domain and hasattr(user, 'whois_lookups') else None,
            url_scan=user.url_scans.filter(domain__iexact=target_domain).order_by('-created_at').first() if target_domain and hasattr(user, 'url_scans') else None,
            port_scan=user.port_scans.filter(target__iexact=target).order_by('-created_at').first() if hasattr(user, 'port_scans') else None
        )

        state["soc_analysis"] = soc_res
        state["risk_score"] = soc_res.get("risk_score", 0)
        state["severity"] = soc_res.get("severity", "LOW")
        state["confidence"] = soc_res.get("confidence", 80)
        state["threat_level"] = soc_res.get("threat_level", "LOW")
        state["findings"] = soc_res.get("findings", [])
        state["recommendations"] = soc_res.get("recommendations", [])
        state["evidence_sources"] = soc_res.get("evidence_sources", [])

    return state


def node_check_completeness(state: AgentState) -> AgentState:
    """Evaluates whether further steps are allowed or needed."""
    step_count = state.get("step_count", 0)
    max_steps = state.get("max_steps", AgentConfig.get_agent_max_steps())

    if step_count >= max_steps:
        state["next_action"] = "FINISH"

    return state


def node_final_assessment(state: AgentState) -> AgentState:
    """
    Synthesizes the final executive assessment, summary, and defensive recommendations.
    Uses Qwen LLM for executive phrasing while strictly preserving deterministic SOC scores.
    """
    target = state.get("target", "")
    identifiers = state.get("target_identifiers", {})
    risk_score = state.get("risk_score", 0)
    severity = state.get("severity", "LOW")
    threat_level = state.get("threat_level", "LOW")
    confidence = state.get("confidence", 80)
    findings = state.get("findings", [])
    recommendations = state.get("recommendations", [])
    correlations = state.get("soc_analysis", {}).get("correlations", [])
    evidence_sources = state.get("evidence_sources", [])
    tools_used = state.get("selected_tools", [])

    # Default baseline summary from SOC engine
    baseline_summary = state.get("soc_analysis", {}).get("summary") or (
        f"Autonomous security assessment for '{target}' completed across {len(tools_used)} tools. "
        f"Composite SOC Risk Score: {risk_score}/100 ({severity}). Threat Level: {threat_level}."
    )

    health = check_ollama_health()
    llm_assessment = None

    if health.get("available") and health.get("model_available"):
        prompt = build_assessment_prompt(
            target=target,
            target_type=identifiers.get("target_type", "DOMAIN"),
            risk_score=risk_score,
            severity=severity,
            threat_level=threat_level,
            confidence=confidence,
            findings=findings,
            correlations=correlations,
            evidence_sources=evidence_sources,
            tools_used=tools_used
        )
        raw_output = call_ollama_llm(prompt, timeout=AgentConfig.get_agent_timeout())
        if raw_output:
            llm_assessment = parse_llm_json_assessment(raw_output)

    if llm_assessment:
        state["summary"] = llm_assessment.get("summary", baseline_summary)
        if llm_assessment.get("recommendations"):
            state["recommendations"] = llm_assessment.get("recommendations")
        state["status"] = "COMPLETED"
    else:
        state["summary"] = baseline_summary
        # If Ollama was offline, record clean status
        if not (health.get("available") and health.get("model_available")):
            state["status"] = "FAILED_AI"
            state["summary"] += " (Synthesized using deterministic SOC Engine rules; AI model offline)"
        else:
            state["status"] = "COMPLETED"

    # Final step record
    step_data: AgentStepData = {
        "step_number": len(state.get("steps", [])) + 1,
        "action": "FINAL_ASSESSMENT",
        "tool_name": "",
        "status": "COMPLETED",
        "reasoning_summary": "Synthesized executive cybersecurity assessment and defensive recommendations.",
        "input_summary": {"risk_score": risk_score, "severity": severity, "tools_used": tools_used},
        "output_summary": {"summary": state.get("summary"), "recommendations_count": len(state.get("recommendations", []))},
        "created_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
    }
    state["steps"].append(step_data)

    return state


# ──────────────────────────────────────────────────────────────────────────────
# Conditional Routing Functions
# ──────────────────────────────────────────────────────────────────────────────

def route_after_decision(state: AgentState) -> str:
    """Routes to tool validation if action is USE_TOOL, otherwise to final assessment."""
    action = state.get("next_action", "FINISH")
    if action == "USE_TOOL":
        return "validate_tool"
    return "final_assessment"


def route_after_validation(state: AgentState) -> str:
    """Routes to tool execution if valid, or check completeness if skipped/invalid."""
    action = state.get("next_action", "FINISH")
    if action == "USE_TOOL":
        return "execute_tool"
    return "check_completeness"


def route_after_completeness(state: AgentState) -> str:
    """Routes to next decision if steps remain, or final assessment if complete."""
    action = state.get("next_action", "FINISH")
    step_count = state.get("step_count", 0)
    max_steps = state.get("max_steps", AgentConfig.get_agent_max_steps())

    if action == "FINISH" or step_count >= max_steps:
        return "final_assessment"
    return "decide_next_action"


# ──────────────────────────────────────────────────────────────────────────────
# LangGraph Workflow Builder
# ──────────────────────────────────────────────────────────────────────────────

def create_agent_graph():
    """Builds and compiles the LangGraph StateGraph state machine."""
    if StateGraph is None:
        return None

    workflow = StateGraph(AgentState)

    # Add Nodes
    workflow.add_node("load_context", node_load_context)
    workflow.add_node("analyze_evidence", node_analyze_evidence)
    workflow.add_node("decide_next_action", node_decide_next_action)
    workflow.add_node("validate_tool", node_validate_tool)
    workflow.add_node("execute_tool", node_execute_tool)
    workflow.add_node("normalize_result", node_normalize_result)
    workflow.add_node("soc_analysis", node_soc_analysis)
    workflow.add_node("check_completeness", node_check_completeness)
    workflow.add_node("final_assessment", node_final_assessment)

    # Set Entry Point
    workflow.set_entry_point("load_context")

    # Add Edges & Conditional Branches
    workflow.add_edge("load_context", "analyze_evidence")
    workflow.add_edge("analyze_evidence", "decide_next_action")

    workflow.add_conditional_edges(
        "decide_next_action",
        route_after_decision,
        {
            "validate_tool": "validate_tool",
            "final_assessment": "final_assessment"
        }
    )

    workflow.add_conditional_edges(
        "validate_tool",
        route_after_validation,
        {
            "execute_tool": "execute_tool",
            "check_completeness": "check_completeness"
        }
    )

    workflow.add_edge("execute_tool", "normalize_result")
    workflow.add_edge("normalize_result", "soc_analysis")
    workflow.add_edge("soc_analysis", "check_completeness")

    workflow.add_conditional_edges(
        "check_completeness",
        route_after_completeness,
        {
            "decide_next_action": "decide_next_action",
            "final_assessment": "final_assessment"
        }
    )

    workflow.add_edge("final_assessment", END)

    return workflow.compile()
