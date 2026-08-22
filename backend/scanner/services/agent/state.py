"""
Agent State Definition for LangGraph State Machine.
"""
from typing import TypedDict, List, Dict, Any, Optional


class AgentStepData(TypedDict, total=False):
    step_number: int
    action: str
    tool_name: str
    status: str
    reasoning_summary: str
    input_summary: Dict[str, Any]
    output_summary: Dict[str, Any]
    created_at: str


class AgentState(TypedDict, total=False):
    """
    Structured AgentState passed across LangGraph nodes.
    Ensures type safety and strict isolation. No secret credentials or
    chain-of-thought dumps are preserved in state.
    """
    session_id: int
    user_id: int
    username: str
    target: str
    target_identifiers: Dict[str, Any]
    analysis_mode: str

    # Evidence collections
    initial_evidence: List[Dict[str, Any]]
    collected_evidence: List[Dict[str, Any]]
    evidence_sources: List[str]

    # Tool registries & selections
    available_tools: List[str]
    selected_tools: List[str]
    execution_history: List[Dict[str, Any]]
    tool_results: List[Dict[str, Any]]

    # Deterministic SOC Engine State (Authoritative)
    soc_analysis: Dict[str, Any]
    risk_score: int
    severity: str
    confidence: int
    threat_level: str

    # Agent reasoning & planning
    reasoning_summary: str
    next_action: str  # 'USE_TOOL' or 'FINISH'
    next_tool: str
    next_tool_input: Dict[str, Any]
    next_tool_reason: str

    # Session progress & results
    steps: List[AgentStepData]
    status: str  # 'PENDING', 'RUNNING', 'COMPLETED', 'PARTIAL', 'FAILED', 'FAILED_AI'
    error: Optional[str]
    step_count: int
    max_steps: int

    # Final outputs
    summary: str
    findings: List[Dict[str, Any]]
    recommendations: List[str]
