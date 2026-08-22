"""
Autonomous AI Security Agent Orchestration Service.
Coordinates LangGraph execution, persistence to AgentSession / AgentStep / AgentToolExecution,
concurrency limits, and telemetry.
"""
import time
from typing import Dict, Any, Optional
from django.utils import timezone
from django.db import transaction

from scanner.models import AgentSession, AgentStep, AgentToolExecution, AIActivity
from .config import AgentConfig, check_ollama_health
from .safety import validate_agent_target
from .state import AgentState
from .graph import create_agent_graph, node_load_context, node_analyze_evidence, node_decide_next_action, node_validate_tool, node_execute_tool, node_normalize_result, node_soc_analysis, node_check_completeness, node_final_assessment


class AutonomousAIAgentService:
    """
    Service layer for orchestrating the AI Security Agent.
    """

    def __init__(self):
        self.app = create_agent_graph()

    def run_session(
        self,
        target: str,
        user: Any,
        max_steps: Optional[int] = None,
        analysis_mode: str = "SECURITY_ASSESSMENT"
    ) -> AgentSession:
        """
        Executes a controlled Agent session for given user and target.
        """
        # 1. Concurrency Check
        max_concurrent = AgentConfig.get_max_concurrent_sessions()
        running_count = AgentSession.objects.filter(user=user, status='RUNNING').count()
        if running_count >= max_concurrent:
            session = AgentSession.objects.create(
                user=user,
                target=target,
                analysis_mode=analysis_mode,
                status='FAILED',
                error_message=f"Maximum concurrent AI Agent sessions limit ({max_concurrent}) reached. Please wait for previous sessions to finish.",
                summary="Session rejected due to concurrency rate limiting."
            )
            return session

        # 2. Target Safety Validation
        is_safe, error_msg = validate_agent_target(target)
        if not is_safe:
            session = AgentSession.objects.create(
                user=user,
                target=target,
                analysis_mode=analysis_mode,
                status='FAILED',
                error_message=error_msg,
                summary=f"Analysis aborted: {error_msg}"
            )
            return session

        # 3. Create Session Record in Database
        session = AgentSession.objects.create(
            user=user,
            target=target,
            analysis_mode=analysis_mode,
            status='RUNNING'
        )

        effective_max_steps = max_steps or AgentConfig.get_agent_max_steps()
        start_time = time.time()

        # 4. Initialize State
        initial_state: AgentState = {
            "session_id": session.id,
            "user_id": user.id,
            "username": user.username,
            "target": target,
            "analysis_mode": analysis_mode,
            "max_steps": effective_max_steps,
            "initial_evidence": [],
            "collected_evidence": [],
            "selected_tools": [],
            "execution_history": [],
            "tool_results": [],
            "steps": [],
            "step_count": 0,
            "status": "RUNNING"
        }

        # 5. Run Workflow (LangGraph compiled app or direct step-through engine)
        try:
            if self.app is not None:
                final_state = self.app.invoke(initial_state)
            else:
                # Direct step-through fallback execution
                final_state = self._run_step_through_fallback(initial_state)
        except Exception as e:
            duration = round(time.time() - start_time, 2)
            session.status = 'FAILED'
            session.error_message = f"Agent workflow execution error: {str(e)}"
            session.duration_seconds = duration
            session.save(update_fields=['status', 'error_message', 'duration_seconds', 'updated_at'])
            return session

        duration = round(time.time() - start_time, 2)

        # 6. Persist Steps and Tool Executions in DB
        with transaction.atomic():
            for step_data in final_state.get("steps", []):
                AgentStep.objects.create(
                    session=session,
                    step_number=step_data.get("step_number", 1),
                    action=step_data.get("action", "EVALUATE"),
                    tool_name=step_data.get("tool_name", ""),
                    status=step_data.get("status", "COMPLETED"),
                    reasoning_summary=step_data.get("reasoning_summary", ""),
                    input_summary=step_data.get("input_summary", {}),
                    output_summary=step_data.get("output_summary", {})
                )

            for tr in final_state.get("tool_results", []):
                AgentToolExecution.objects.create(
                    session=session,
                    tool_name=tr.get("evidence", {}).get("source", "UNKNOWN_TOOL"),
                    status=tr.get("status", "SUCCESS"),
                    duration_seconds=tr.get("duration", 0.0),
                    error_message=tr.get("error")
                )

            # Update Session with final results
            session.status = final_state.get("status", "COMPLETED")
            session.risk_score = final_state.get("risk_score", 0)
            session.severity = final_state.get("severity", "LOW")
            session.confidence = final_state.get("confidence", 80)
            session.threat_level = final_state.get("threat_level", "LOW")
            session.summary = final_state.get("summary", "")
            session.findings = final_state.get("findings", [])
            session.recommendations = final_state.get("recommendations", [])
            session.evidence_sources = final_state.get("evidence_sources", [])
            session.tools_used = final_state.get("selected_tools", [])
            session.steps_completed = len(final_state.get("steps", []))
            session.duration_seconds = duration
            session.error_message = final_state.get("error")
            session.save()

            # 7. Backward Compatibility: Create legacy AIActivity record
            try:
                AIActivity.objects.create(
                    user=user,
                    request_text=f"AI Security Assessment on {target}",
                    target=target,
                    tools_selected=session.tools_used,
                    execution_status=session.status,
                    result_summary=session.summary[:500],
                    risk_score=session.risk_score
                )
            except Exception:
                pass

        return session

    def _run_step_through_fallback(self, state: AgentState) -> AgentState:
        """Direct step-through state machine fallback in case LangGraph is unavailable."""
        state = node_load_context(state)
        state = node_analyze_evidence(state)

        max_steps = state.get("max_steps", 5)
        for _ in range(max_steps):
            state = node_decide_next_action(state)
            if state.get("next_action") == "FINISH":
                break
            state = node_validate_tool(state)
            if state.get("next_action") == "FINISH":
                break
            state = node_execute_tool(state)
            state = node_normalize_result(state)
            state = node_soc_analysis(state)
            state = node_check_completeness(state)
            if state.get("next_action") == "FINISH":
                break

        state = node_final_assessment(state)
        return state
