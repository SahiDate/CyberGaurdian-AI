"""
Pure-Python Deterministic Vector PDF Generator for CyberGuardian AI.
Generates compliant, professional PDF 1.4 security assessment reports with zero external C/network dependencies.
"""
import io
import zlib
import datetime
from typing import Dict, Any, List


class PDFCanvas:
    """Low-level PDF page stream assembler."""
    def __init__(self, width=612, height=792):
        self.width = width
        self.height = height
        self.ops = []

    def set_fill_color(self, r: float, g: float, b: float):
        self.ops.append(f"{r:.3f} {g:.3f} {b:.3f} rg")

    def set_stroke_color(self, r: float, g: float, b: float):
        self.ops.append(f"{r:.3f} {g:.3f} {b:.3f} RG")

    def rect(self, x: float, y: float, w: float, h: float, fill=True, stroke=True):
        self.ops.append(f"{x:.2f} {y:.2f} {w:.2f} {h:.2f} re")
        if fill and stroke:
            self.ops.append("B")
        elif fill:
            self.ops.append("f")
        elif stroke:
            self.ops.append("S")

    def line(self, x1: float, y1: float, x2: float, y2: float):
        self.ops.append(f"{x1:.2f} {y1:.2f} m {x2:.2f} {y2:.2f} l S")

    def text(self, x: float, y: float, text_str: str, font="F1", size=10, r=0.1, g=0.1, b=0.1):
        clean_text = str(text_str).replace('\\', '\\\\').replace('(', '\\(').replace(')', '\\)')
        self.ops.append("BT")
        self.ops.append(f"/{font} {size} Tf")
        self.ops.append(f"{r:.3f} {g:.3f} {b:.3f} rg")
        self.ops.append(f"1 0 0 1 {x:.2f} {y:.2f} Tm")
        self.ops.append(f"({clean_text}) Tj")
        self.ops.append("ET")

    def get_stream(self) -> bytes:
        return "\n".join(self.ops).encode("latin1", errors="replace")


class PDFReportGenerator:
    """
    Builds a professional multi-page security assessment PDF report.
    """

    @classmethod
    def generate_pdf(cls, report_data: Dict[str, Any]) -> bytes:
        pages: List[PDFCanvas] = []
        target = report_data.get("target", "Unknown Target")
        report_id = report_data.get("report_id", "RPT-0000")
        risk = report_data.get("risk", {})
        score = risk.get("score", 0)
        severity = risk.get("severity", "LOW")
        confidence = risk.get("confidence", 0)
        threat_level = risk.get("threat_level", "LOW")
        created_at = report_data.get("created_at", datetime.datetime.now().isoformat())

        # ── PAGE 1: COVER PAGE ──────────────────────────────────────────────
        p1 = PDFCanvas()

        # Background header accent
        p1.set_fill_color(0.06, 0.09, 0.13) # #0f172a
        p1.rect(0, 500, 612, 292, fill=True, stroke=False)

        # Brand Title
        p1.text(50, 720, "CYBERGUARDIAN AI", font="F2", size=24, r=0.35, g=0.65, b=1.0)
        p1.text(50, 695, "Autonomous Security Intelligence & Threat Assessment", font="F1", size=11, r=0.7, g=0.75, b=0.85)

        # Horizontal accent line
        p1.set_stroke_color(0.22, 0.55, 0.99)
        p1.rect(50, 680, 512, 2, fill=True, stroke=False)

        # Assessment Document Title
        p1.text(50, 630, "SECURITY ASSESSMENT REPORT", font="F2", size=20, r=1.0, g=1.0, b=1.0)
        p1.text(50, 605, f"Target: {target}", font="F2", size=13, r=0.9, g=0.9, b=0.95)
        p1.text(50, 585, f"Report ID: {report_id}  |  Date: {created_at[:10]}", font="F1", size=10, r=0.6, g=0.65, b=0.75)

        # Risk Overview Card on Cover Page
        p1.set_fill_color(0.96, 0.97, 0.98)
        p1.set_stroke_color(0.85, 0.88, 0.92)
        p1.rect(50, 320, 512, 145, fill=True, stroke=True)

        # Severity color selection
        sev_colors = {
            "CRITICAL": (0.85, 0.15, 0.15),
            "HIGH": (0.85, 0.45, 0.05),
            "MEDIUM": (0.85, 0.65, 0.10),
            "LOW": (0.15, 0.65, 0.25)
        }
        sr, sg, sb = sev_colors.get(severity, (0.4, 0.4, 0.4))

        p1.text(70, 435, "OVERALL SECURITY RISK ASSESSMENT", font="F2", size=11, r=0.2, g=0.25, b=0.35)

        # Score box
        p1.set_fill_color(0.92, 0.94, 0.97)
        p1.rect(70, 345, 110, 75, fill=True, stroke=False)
        p1.text(85, 395, "SOC Risk Score", font="F1", size=9, r=0.3, g=0.35, b=0.45)
        p1.text(85, 360, f"{score}/100", font="F2", size=22, r=sr, g=sg, b=sb)

        # Severity box
        p1.set_fill_color(0.92, 0.94, 0.97)
        p1.rect(195, 345, 110, 75, fill=True, stroke=False)
        p1.text(210, 395, "Severity Level", font="F1", size=9, r=0.3, g=0.35, b=0.45)
        p1.text(210, 365, severity, font="F2", size=16, r=sr, g=sg, b=sb)

        # Confidence box
        p1.set_fill_color(0.92, 0.94, 0.97)
        p1.rect(320, 345, 110, 75, fill=True, stroke=False)
        p1.text(335, 395, "Confidence", font="F1", size=9, r=0.3, g=0.35, b=0.45)
        p1.text(335, 365, f"{confidence}%", font="F2", size=16, r=0.15, g=0.45, b=0.85)

        # Threat level box
        p1.set_fill_color(0.92, 0.94, 0.97)
        p1.rect(445, 345, 100, 75, fill=True, stroke=False)
        p1.text(455, 395, "Threat Level", font="F1", size=9, r=0.3, g=0.35, b=0.45)
        p1.text(455, 365, threat_level, font="F2", size=14, r=sr, g=sg, b=sb)

        # Executive Summary Snippet
        p1.text(50, 270, "EXECUTIVE SUMMARY", font="F2", size=12, r=0.1, g=0.15, b=0.25)
        summary_lines = cls._wrap_text(report_data.get("executive_summary", "Assessment completed."), 80)
        curr_y = 250
        for line in summary_lines[:5]:
            p1.text(50, curr_y, line, font="F1", size=9.5, r=0.2, g=0.25, b=0.3)
            curr_y -= 15

        # Confidentiality disclaimer
        p1.text(50, 70, "CONFIDENTIAL — STRICTLY FOR AUTHORIZED CYBERGUARDIAN AI STAKEHOLDERS", font="F2", size=8, r=0.6, g=0.2, b=0.2)
        p1.text(50, 55, "Generated automatically by CyberGuardian AI Security Assessment Subsystem.", font="F1", size=8, r=0.5, g=0.5, b=0.5)

        pages.append(p1)

        # ── PAGE 2: MODULE SUMMARY & FINDINGS ──────────────────────────────
        p2 = PDFCanvas()
        cls._add_header_footer(p2, report_id, page_num=2, total_pages=3)

        p2.text(50, 715, "1. SECURITY MODULE TELEMETRY SUMMARY", font="F2", size=13, r=0.1, g=0.15, b=0.25)
        p2.line(50, 708, 562, 708)

        # Table header
        p2.set_fill_color(0.92, 0.94, 0.97)
        p2.rect(50, 680, 512, 20, fill=True, stroke=False)
        p2.text(60, 686, "SECURITY MODULE", font="F2", size=8.5, r=0.2, g=0.25, b=0.35)
        p2.text(320, 686, "EXECUTION STATUS", font="F2", size=8.5, r=0.2, g=0.25, b=0.35)
        p2.text(460, 686, "TELEMETRY", font="F2", size=8.5, r=0.2, g=0.25, b=0.35)

        mod_y = 660
        modules = report_data.get("module_summary", {})
        for mod_name, mod_status in list(modules.items())[:8]:
            p2.text(60, mod_y, str(mod_name), font="F1", size=8.5, r=0.15, g=0.2, b=0.25)
            p2.text(320, mod_y, str(mod_status), font="F2", size=8.5, r=0.1, g=0.5, b=0.2 if "COMPLETED" in str(mod_status) else 0.5)
            p2.text(460, mod_y, "Correlated", font="F1", size=8.5, r=0.3, g=0.35, b=0.4)
            p2.line(50, mod_y - 4, 562, mod_y - 4)
            mod_y -= 18

        # Section 2: Key Findings
        find_y = mod_y - 20
        p2.text(50, find_y, "2. UNIFIED SECURITY FINDINGS", font="F2", size=13, r=0.1, g=0.15, b=0.25)
        p2.line(50, find_y - 7, 562, find_y - 7)
        find_y -= 25

        findings = report_data.get("findings", [])
        if not findings:
            p2.text(60, find_y, "No critical security vulnerabilities or threat indicators identified.", font="F1", size=9, r=0.3, g=0.6, b=0.3)
        else:
            for f in findings[:4]:
                f_title = f.get("title") or f.get("type") or "Security Finding"
                f_sev = f.get("severity", "LOW")
                f_desc = f.get("description") or f.get("summary") or ""
                
                # Finding Header
                p2.set_fill_color(0.96, 0.97, 0.99)
                p2.rect(50, find_y - 5, 512, 18, fill=True, stroke=False)
                p2.text(60, find_y, f"[{f_sev}] {f_title}", font="F2", size=9, r=0.8 if f_sev in ['CRITICAL','HIGH'] else 0.2, g=0.2, b=0.2)
                find_y -= 18

                for desc_line in cls._wrap_text(f_desc, 90)[:2]:
                    p2.text(65, find_y, desc_line, font="F1", size=8.5, r=0.3, g=0.35, b=0.4)
                    find_y -= 13
                find_y -= 8

        pages.append(p2)

        # ── PAGE 3: AI ASSESSMENT & RECOMMENDATIONS ─────────────────────────
        p3 = PDFCanvas()
        cls._add_header_footer(p3, report_id, page_num=3, total_pages=3)

        p3.text(50, 715, "3. AUTONOMOUS AI SECURITY ASSESSMENT", font="F2", size=13, r=0.1, g=0.15, b=0.25)
        p3.line(50, 708, 562, 708)

        ai_sec = report_data.get("ai_assessment", {})
        ai_summary = ai_sec.get("summary") or "AI assessment completed using localized reasoning."
        tools_used = ai_sec.get("tools_used", [])

        p3.text(60, 685, f"AI Agent Status: {ai_sec.get('status', 'COMPLETED')}  |  Tools Executed: {', '.join(tools_used) or 'None'}", font="F2", size=9, r=0.2, g=0.4, b=0.7)
        ai_y = 665
        for line in cls._wrap_text(ai_summary, 90)[:6]:
            p3.text(60, ai_y, line, font="F1", size=9, r=0.25, g=0.3, b=0.35)
            ai_y -= 14

        # Section 4: Actionable Recommendations
        rec_y = ai_y - 20
        p3.text(50, rec_y, "4. DEFENSIVE REMEDIATION RECOMMENDATIONS", font="F2", size=13, r=0.1, g=0.15, b=0.25)
        p3.line(50, rec_y - 7, 562, rec_y - 7)
        rec_y -= 25

        recommendations = report_data.get("recommendations", [])
        if not recommendations:
            recommendations = ["Maintain continuous monitoring and periodic SOC threat intelligence review."]

        for idx, rec in enumerate(recommendations[:5], 1):
            p3.text(60, rec_y, f"{idx}.", font="F2", size=9, r=0.15, g=0.45, b=0.85)
            for rline in cls._wrap_text(rec, 85)[:2]:
                p3.text(75, rec_y, rline, font="F1", size=9, r=0.2, g=0.25, b=0.3)
                rec_y -= 14
            rec_y -= 4

        # Section 5: Limitations
        lim_y = rec_y - 15
        p3.text(50, lim_y, "5. ASSESSMENT METHODOLOGY & LIMITATIONS", font="F2", size=11, r=0.3, g=0.35, b=0.45)
        lim_y -= 18
        limits = report_data.get("limitations", ["Assessment based on point-in-time security telemetry."])
        for lim in limits[:2]:
            p3.text(60, lim_y, f"• {lim}", font="F1", size=8.5, r=0.4, g=0.45, b=0.5)
            lim_y -= 13

        pages.append(p3)

        # ── COMPILE PDF BINARY ──────────────────────────────────────────────
        return cls._assemble_pdf(pages)

    @classmethod
    def _add_header_footer(cls, canvas: PDFCanvas, report_id: str, page_num: int, total_pages: int):
        # Header
        canvas.text(50, 760, "CYBERGUARDIAN AI — SECURITY ASSESSMENT REPORT", font="F2", size=8, r=0.4, g=0.45, b=0.55)
        canvas.text(480, 760, f"ID: {report_id}", font="F1", size=8, r=0.4, g=0.45, b=0.55)
        canvas.set_stroke_color(0.85, 0.88, 0.92)
        canvas.line(50, 752, 562, 752)

        # Footer
        canvas.line(50, 45, 562, 45)
        canvas.text(50, 32, "CONFIDENTIAL — CYBERGUARDIAN AI DEFENSE PLATFORM", font="F1", size=7.5, r=0.5, g=0.55, b=0.6)
        canvas.text(500, 32, f"Page {page_num} of {total_pages}", font="F2", size=7.5, r=0.4, g=0.45, b=0.55)

    @classmethod
    def _wrap_text(cls, text: str, max_chars: int) -> List[str]:
        words = str(text).split()
        lines = []
        curr = []
        curr_len = 0
        for w in words:
            if curr_len + len(w) + 1 > max_chars:
                lines.append(" ".join(curr))
                curr = [w]
                curr_len = len(w)
            else:
                curr.append(w)
                curr_len += len(w) + 1
        if curr:
            lines.append(" ".join(curr))
        return lines

    @classmethod
    def _assemble_pdf(cls, pages: List[PDFCanvas]) -> bytes:
        """Assembles standard PDF 1.4 binary structure with valid xref table and trailer."""
        out = io.BytesIO()
        out.write(b"%PDF-1.4\n")
        out.write(b"%\xe2\xe3\xcf\xd3\n")

        offsets = []
        obj_id = 1

        def write_obj(content: bytes) -> int:
            nonlocal obj_id
            pos = out.tell()
            offsets.append(pos)
            out.write(f"{obj_id} 0 obj\n".encode("latin1"))
            out.write(content)
            out.write(b"\nendobj\n")
            current_id = obj_id
            obj_id += 1
            return current_id

        # 1. Font standard objects (Helvetica, Helvetica-Bold)
        f1_id = write_obj(b"<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>")
        f2_id = write_obj(b"<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>")

        # 2. Resources object
        res_id = write_obj(f"<< /Font << /F1 {f1_id} 0 R /F2 {f2_id} 0 R >> >>".encode("latin1"))

        # 3. Content streams and Page objects
        page_obj_ids = []
        for p in pages:
            stream_data = p.get_stream()
            stream_obj_id = write_obj(
                f"<< /Length {len(stream_data)} >>\nstream\n".encode("latin1") +
                stream_data +
                b"\nendstream"
            )
            # Page dict (Pages parent will be obj_id + len(pages) - idx)
            # We will patch parent ID next
            page_obj_id = write_obj(
                f"<< /Type /Page /Parent 0 0 R /MediaBox [0 0 612 792] /Contents {stream_obj_id} 0 R /Resources {res_id} 0 R >>".encode("latin1")
            )
            page_obj_ids.append(page_obj_id)

        # 4. Pages Root object
        kids_str = " ".join([f"{pid} 0 R" for pid in page_obj_ids])
        pages_root_id = write_obj(
            f"<< /Type /Pages /Kids [{kids_str}] /Count {len(page_obj_ids)} >>".encode("latin1")
        )

        # 5. Catalog object
        catalog_id = write_obj(f"<< /Type /Catalog /Pages {pages_root_id} 0 R >>".encode("latin1"))

        # Write xref table
        xref_pos = out.tell()
        out.write(b"xref\n")
        out.write(f"0 {obj_id}\n".encode("latin1"))
        out.write(b"0000000000 65535 f \n")
        for off in offsets:
            out.write(f"{off:010d} 00000 n \n".encode("latin1"))

        # Write trailer
        out.write(b"trailer\n")
        out.write(f"<< /Size {obj_id} /Root {catalog_id} 0 R >>\n".encode("latin1"))
        out.write(b"startxref\n")
        out.write(f"{xref_pos}\n".encode("latin1"))
        out.write(b"%%EOF\n")

        return out.getvalue()
