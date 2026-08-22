"""
Report Data Builder for CyberGuardian AI.
Consolidates evidence from SOC Analysis, Agent Sessions, and related scanners
into an immutable, structured snapshot without sensitive credentials or raw chain-of-thought.
"""
import uuid
import datetime
from typing import Dict, Any, List, Optional
from django.utils import timezone


class ReportDataBuilder:
    """
    Builds the standardized structured data payload for SecurityReport.
    """

    @classmethod
    def generate_report_id(cls) -> str:
        short_uuid = uuid.uuid4().hex[:8].upper()
        year = timezone.now().year
        return f"RPT-{year}-{short_uuid}"

    @classmethod
    def build_report_payload(
        cls,
        target: str,
        user: Any,
        soc_analysis: Optional[Any] = None,
        agent_session: Optional[Any] = None,
        report_type: str = "COMPREHENSIVE"
    ) -> Dict[str, Any]:
        now_iso = timezone.now().isoformat()
        report_id = cls.generate_report_id()

        # 1. Target and Ownership Metadata
        target_info = {
            "target": target,
            "generated_for_user": user.username if user else "Anonymous",
            "generated_at": now_iso,
            "report_id": report_id,
            "report_type": report_type,
        }

        # 2. Risk Metrics — SOC Engine is Authoritative
        if soc_analysis:
            risk_score = soc_analysis.risk_score
            severity = soc_analysis.severity
            confidence = soc_analysis.confidence
            threat_level = soc_analysis.threat_level
            executive_summary = soc_analysis.summary or "Comprehensive security assessment completed."
            findings = getattr(soc_analysis, 'findings', []) or []
            evidence = getattr(soc_analysis, 'evidence_sources', getattr(soc_analysis, 'evidence', [])) or []
            correlations = getattr(soc_analysis, 'correlations', []) or []
            recommendations = getattr(soc_analysis, 'recommendations', []) or []
            modules_status = getattr(soc_analysis, 'source_records', getattr(soc_analysis, 'modules_status', {})) or {}
            limitations = getattr(soc_analysis, 'limitations', ["Point-in-time telemetry snapshot."]) or []
        elif agent_session:
            risk_score = agent_session.risk_score
            severity = agent_session.severity
            confidence = agent_session.confidence
            threat_level = agent_session.threat_level
            executive_summary = agent_session.summary or "AI-Assisted autonomous security assessment completed."
            findings = agent_session.findings or []
            evidence = agent_session.evidence_sources or []
            correlations = []
            recommendations = agent_session.recommendations or []
            modules_status = {"AI_AGENT": agent_session.status}
            limitations = []
        else:
            risk_score = 0
            severity = "LOW"
            confidence = 50
            threat_level = "LOW"
            executive_summary = f"Baseline assessment generated for {target}."
            findings = []
            evidence = []
            correlations = []
            recommendations = ["Conduct regular automated vulnerability and threat scans."]
            modules_status = {}
            limitations = ["No prior deep SOC correlation available; baseline metrics recorded."]

        # 3. AI Assessment Summary (Clean & Sanitized — Zero Raw Chain-of-Thought)
        ai_assessment = {}
        if agent_session:
            # Extract safe operational step summaries
            step_summaries = []
            if hasattr(agent_session, 'steps'):
                for st in agent_session.steps.all():
                    step_summaries.append({
                        "step_number": st.step_number,
                        "action": st.action,
                        "tool_name": st.tool_name,
                        "status": st.status,
                        "summary": st.reasoning_summary
                    })

            ai_assessment = {
                "available": True,
                "session_id": agent_session.id,
                "status": agent_session.status,
                "summary": agent_session.summary,
                "tools_used": agent_session.tools_used or [],
                "steps_count": agent_session.steps_completed,
                "step_audit": step_summaries
            }
        else:
            ai_assessment = {
                "available": False,
                "status": "NOT_REQUESTED",
                "summary": "Autonomous AI Agent analysis was not linked for this report generation."
            }

        # 4. Remediation Priorities Categorization
        priorities = {
            "CRITICAL": [],
            "HIGH": [],
            "MEDIUM": [],
            "LOW": []
        }

        # Match findings with priorities
        for finding in findings:
            f_sev = (finding.get("severity") or "LOW").upper()
            title = finding.get("title") or finding.get("type") or "Security Finding"
            desc = finding.get("description") or finding.get("summary") or ""
            if f_sev in priorities:
                priorities[f_sev].append({
                    "id": finding.get("id", f"FND-{len(priorities[f_sev])+1}"),
                    "title": title,
                    "description": desc,
                    "sources": finding.get("evidence_sources", [])
                })

        # 5. Security Module Summary Normalization
        module_summary_table = {}
        standard_modules = [
            "THREAT_INTELLIGENCE", "FILE_ANALYZER", "SSL_SCANNER",
            "WHOIS_LOOKUP", "URL_SCANNER", "PORT_SCANNER", "SOC_ENGINE", "AI_AGENT"
        ]
        for mod in standard_modules:
            mod_st = modules_status.get(mod, "NOT_AVAILABLE")
            if isinstance(mod_st, dict):
                status_val = mod_st.get("status", "AVAILABLE")
            else:
                status_val = str(mod_st)
            module_summary_table[mod] = status_val

        # 6. Consolidated Structured Document
        payload = {
            "report_id": report_id,
            "target": target,
            "title": f"CyberGuardian Security Report: {target}",
            "report_type": report_type,
            "created_at": now_iso,
            "target_info": target_info,
            "risk": {
                "score": int(risk_score),
                "severity": str(severity).upper(),
                "confidence": int(confidence),
                "threat_level": str(threat_level).upper(),
                "methodology": "Phase 8 Deterministic SOC Correlation Engine weighted heuristics."
            },
            "executive_summary": executive_summary,
            "module_summary": module_summary_table,
            "findings": findings,
            "evidence": evidence,
            "correlations": correlations,
            "ai_assessment": ai_assessment,
            "recommendations": recommendations,
            "remediation_priorities": priorities,
            "limitations": limitations or ["Assessment generated from point-in-time telemetry."],
            "footer": {
                "system": "CyberGuardian AI Defense Platform",
                "report_id": report_id,
                "timestamp": now_iso
            }
        }

        return payload
