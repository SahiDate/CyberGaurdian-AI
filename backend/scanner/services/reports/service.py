"""
Security Report Service for CyberGuardian AI.
Coordinates report generation, storage, format export (PDF/JSON/CSV),
and access control validation.
"""
import os
import json
from typing import Dict, Any, Optional, Tuple
from django.core.files.base import ContentFile
from django.core.exceptions import PermissionDenied
from django.db import transaction

from scanner.models import SecurityReport, SOCAnalysis, AgentSession
from .builder import ReportDataBuilder
from .pdf_generator import PDFReportGenerator
from .csv_exporter import CSVReportExporter


class SecurityReportService:
    """
    Core business logic for generating, persisting, and exporting security reports.
    """

    @classmethod
    def generate_report(
        cls,
        target: str,
        user: Any,
        soc_analysis_id: Optional[int] = None,
        agent_session_id: Optional[int] = None,
        report_type: str = "COMPREHENSIVE"
    ) -> SecurityReport:
        """
        Creates and stores a SecurityReport snapshot for the given target and user.
        """
        soc_analysis = None
        if soc_analysis_id:
            # Enforce strict user ownership on input SOC analysis
            soc_analysis = SOCAnalysis.objects.filter(id=soc_analysis_id, user=user).first()
            if not soc_analysis:
                raise ValueError("Referenced SOC Analysis does not exist or does not belong to the user.")

        agent_session = None
        if agent_session_id:
            # Enforce strict user ownership on input Agent session
            agent_session = AgentSession.objects.filter(id=agent_session_id, user=user).first()
            if not agent_session:
                raise ValueError("Referenced Agent Session does not exist or does not belong to the user.")

        # If no explicit links given, attempt to find most recent matching records for user & target
        if not soc_analysis:
            soc_analysis = SOCAnalysis.objects.filter(user=user, target=target).order_by('-created_at').first()
        if not agent_session:
            agent_session = AgentSession.objects.filter(user=user, target=target).order_by('-created_at').first()

        # 1. Build standardized report snapshot payload
        structured_payload = ReportDataBuilder.build_report_payload(
            target=target,
            user=user,
            soc_analysis=soc_analysis,
            agent_session=agent_session,
            report_type=report_type
        )

        report_id = structured_payload["report_id"]
        risk = structured_payload.get("risk", {})
        risk_score = risk.get("score", 0)
        severity = risk.get("severity", "LOW")
        confidence = risk.get("confidence", 50)
        threat_level = risk.get("threat_level", "LOW")
        summary = structured_payload.get("executive_summary", "")

        # 2. Generate PDF document bytes
        status_val = "COMPLETED"
        pdf_bytes = None
        try:
            pdf_bytes = PDFReportGenerator.generate_pdf(structured_payload)
        except Exception as e:
            # If PDF rendering hits an edge case, set status to PARTIAL so structured report is not lost
            status_val = "PARTIAL"

        # 3. Create SecurityReport model record in database
        with transaction.atomic():
            report = SecurityReport.objects.create(
                report_id=report_id,
                user=user,
                target=target,
                title=structured_payload.get("title", f"Security Report: {target}"),
                report_type=report_type,
                status=status_val,
                risk_score=risk_score,
                severity=severity,
                confidence=confidence,
                threat_level=threat_level,
                summary=summary,
                soc_analysis=soc_analysis,
                agent_session=agent_session,
                structured_data=structured_payload
            )

            # Save PDF file if generated
            if pdf_bytes:
                filename = f"{report_id}_{target.replace('://', '_').replace('/', '_')}.pdf"
                report.pdf_file.save(filename, ContentFile(pdf_bytes), save=True)

        return report

    @classmethod
    def get_report_pdf(cls, report: SecurityReport, requesting_user: Any, is_admin: bool = False) -> Tuple[bytes, str]:
        """Validates permission and returns (pdf_bytes, filename)."""
        if not is_admin and report.user_id != requesting_user.id:
            raise PermissionDenied("Access denied to report.")

        filename = f"{report.report_id}_{report.target}.pdf"

        # Return existing file content if saved
        if report.pdf_file and os.path.exists(report.pdf_file.path):
            with open(report.pdf_file.path, 'rb') as f:
                return f.read(), filename

        # Fallback: Regenerate PDF on-the-fly from structured_data
        pdf_bytes = PDFReportGenerator.generate_pdf(report.structured_data)
        return pdf_bytes, filename

    @classmethod
    def get_report_json(cls, report: SecurityReport, requesting_user: Any, is_admin: bool = False) -> Tuple[Dict[str, Any], str]:
        """Validates permission and returns (json_dict, filename)."""
        if not is_admin and report.user_id != requesting_user.id:
            raise PermissionDenied("Access denied to report.")

        filename = f"{report.report_id}_{report.target}.json"
        return report.structured_data, filename

    @classmethod
    def get_report_csv(cls, report: SecurityReport, requesting_user: Any, is_admin: bool = False) -> Tuple[str, str]:
        """Validates permission and returns (csv_string, filename)."""
        if not is_admin and report.user_id != requesting_user.id:
            raise PermissionDenied("Access denied to report.")

        filename = f"{report.report_id}_{report.target}_findings.csv"
        csv_str = CSVReportExporter.export_findings_csv(report.structured_data)
        return csv_str, filename
