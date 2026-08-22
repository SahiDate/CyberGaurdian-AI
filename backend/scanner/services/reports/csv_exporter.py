"""
CSV Report Exporter for CyberGuardian AI.
Generates structured CSV export of security findings for SOC analysts.
"""
import io
import csv
from typing import Dict, Any, List


class CSVReportExporter:
    """
    Exports report findings into standardized CSV tabular format.
    """

    HEADERS = [
        "Finding ID",
        "Category",
        "Title",
        "Severity",
        "Confidence",
        "Source",
        "Target",
        "Description",
        "Recommendation",
        "Created At"
    ]

    @classmethod
    def export_findings_csv(cls, report_data: Dict[str, Any]) -> str:
        output = io.StringIO()
        writer = csv.writer(output, quoting=csv.QUOTE_MINIMAL)

        # Write header
        writer.writerow(cls.HEADERS)

        findings = report_data.get("findings", [])
        target = report_data.get("target", "")
        created_at = report_data.get("created_at", "")
        recommendations = report_data.get("recommendations", [])
        default_rec = recommendations[0] if recommendations else "Remediate identified risk."

        for idx, f in enumerate(findings, 1):
            finding_id = f.get("id") or f"FND-{idx:03d}"
            category = f.get("category") or f.get("type") or "GENERAL_SECURITY"
            title = f.get("title") or f.get("type") or "Security Finding"
            severity = f.get("severity") or "LOW"
            confidence = f.get("confidence") or report_data.get("risk", {}).get("confidence", 50)
            sources = ", ".join(f.get("evidence_sources", [])) or "SOC_ENGINE"
            description = f.get("description") or f.get("summary") or ""
            rec = f.get("recommendation") or default_rec

            writer.writerow([
                finding_id,
                category,
                title,
                severity,
                f"{confidence}%",
                sources,
                target,
                description,
                rec,
                created_at
            ])

        # If no specific findings, provide baseline summary row
        if not findings:
            writer.writerow([
                "FND-000",
                "BASELINE",
                "Clean Security Baseline",
                "LOW",
                "100%",
                "SOC_ENGINE",
                target,
                "No critical security findings or vulnerabilities detected.",
                "Continue standard continuous monitoring.",
                created_at
            ])

        return output.getvalue()
