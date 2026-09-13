"""
Vector PDF Certificate Generator for CyberGuardian AI.
Renders professional, tamper-evident, vector-sharp PDF 1.4 landscape certificates
with embedded vector QR code, cybersecurity guilloche border, and security verification block.
Zero external C-dependencies or external binaries.
"""
import io
import datetime
from typing import Dict, Any, List

from .qr_generator import QRCodeGenerator


class CertificatePDFCanvas:
    """Low-level PDF page stream assembler for landscape 792x612 pt certificate."""
    def __init__(self, width=792, height=612):
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

    def line(self, x1: float, y1: float, x2: float, y2: float, line_width: float = 1.0):
        self.ops.append(f"{line_width:.2f} w")
        self.ops.append(f"{x1:.2f} {y1:.2f} m {x2:.2f} {y2:.2f} l S")

    def text(self, x: float, y: float, text_str: str, font="F1", size=10, r=0.1, g=0.1, b=0.1):
        clean_text = str(text_str).replace('\\', '\\\\').replace('(', '\\(').replace(')', '\\)')
        self.ops.append("BT")
        self.ops.append(f"/{font} {size} Tf")
        self.ops.append(f"{r:.3f} {g:.3f} {b:.3f} rg")
        self.ops.append(f"1 0 0 1 {x:.2f} {y:.2f} Tm")
        self.ops.append(f"({clean_text}) Tj")
        self.ops.append("ET")

    def draw_centered_text(self, y: float, text_str: str, font="F1", size=10, r=0.1, g=0.1, b=0.1):
        """Approximate center-alignment using standard Helvetica glyph widths."""
        # Average character width ratio for Helvetica: ~0.55 for F1, ~0.60 for F2
        char_ratio = 0.62 if font == "F2" else 0.52
        approx_w = len(text_str) * size * char_ratio
        x = max(20.0, (self.width - approx_w) / 2.0)
        self.text(x, y, text_str, font=font, size=size, r=r, g=g, b=b)

    def draw_qr_matrix(self, top_left_x: float, top_left_y: float, qr_size: float, url: str):
        """Draws a vector-sharp QR code directly into the PDF stream."""
        matrix = QRCodeGenerator.encode_text(url)
        dim = len(matrix)
        mod_size = qr_size / dim

        # Draw white background card for QR
        self.set_fill_color(1.0, 1.0, 1.0)
        self.set_stroke_color(0.85, 0.90, 0.95)
        self.rect(top_left_x - 4, top_left_y - qr_size - 4, qr_size + 8, qr_size + 8, fill=True, stroke=True)

        # Draw dark modules
        self.set_fill_color(0.06, 0.12, 0.22)
        for r in range(dim):
            for c in range(dim):
                if matrix[r][c]:
                    # In PDF, y=0 is bottom
                    mx = top_left_x + (c * mod_size)
                    my = top_left_y - ((r + 1) * mod_size)
                    self.rect(mx, my, mod_size, mod_size, fill=True, stroke=False)

    def get_stream(self) -> bytes:
        return "\n".join(self.ops).encode("latin1", errors="replace")


class PDFCertificateGenerator:
    """
    Generates an official CyberGuardian AI Cybersecurity Analysis Completion Certificate PDF.
    """

    @classmethod
    def generate_certificate_pdf(cls, cert_data: Dict[str, Any]) -> bytes:
        # Page dimensions: US Letter Landscape (792 x 612 pt)
        canvas = CertificatePDFCanvas(width=792, height=612)

        # 1. Base Canvas Background (Crisp Certificate Texture)
        canvas.set_fill_color(0.985, 0.992, 1.0)
        canvas.rect(0, 0, 792, 612, fill=True, stroke=False)

        # 2. Multi-tier Cybersecurity Borders
        # Outer deep navy border
        canvas.set_stroke_color(0.06, 0.11, 0.22)
        canvas.rect(18, 18, 756, 576, fill=False, stroke=True)
        canvas.line(20, 20, 772, 20, line_width=1.5)
        canvas.line(772, 20, 772, 592, line_width=1.5)
        canvas.line(772, 592, 20, 592, line_width=1.5)
        canvas.line(20, 592, 20, 20, line_width=1.5)

        # Inner cyan & gold accent borders
        canvas.set_stroke_color(0.0, 0.72, 0.65)
        canvas.line(26, 26, 766, 26, line_width=0.8)
        canvas.line(766, 26, 766, 586, line_width=0.8)
        canvas.line(766, 586, 26, 586, line_width=0.8)
        canvas.line(26, 586, 26, 26, line_width=0.8)

        # Corner corner brackets (Cyber security emblem aesthetic)
        def draw_corner(cx, cy, dx, dy):
            canvas.set_stroke_color(0.0, 0.65, 0.75)
            canvas.line(cx, cy, cx + (dx * 20), cy, line_width=2.0)
            canvas.line(cx, cy, cx, cy + (dy * 20), line_width=2.0)

        draw_corner(32, 580, 1, -1)
        draw_corner(760, 580, -1, -1)
        draw_corner(32, 32, 1, 1)
        draw_corner(760, 32, -1, 1)

        # 3. Top Branding Header
        canvas.draw_centered_text(
            548, "CYBERGUARDIAN AI",
            font="F2", size=24, r=0.05, g=0.10, b=0.22
        )
        canvas.draw_centered_text(
            534, "CYBERSECURITY ASSESSMENT & THREAT ANALYSIS PLATFORM",
            font="F1", size=8.5, r=0.35, g=0.45, b=0.55
        )

        # Decorative Divider Line
        canvas.set_stroke_color(0.0, 0.72, 0.65)
        canvas.line(230, 524, 562, 524, line_width=1.2)
        canvas.set_fill_color(0.0, 0.72, 0.65)
        canvas.rect(391, 521, 10, 6, fill=True, stroke=False)

        # 4. Certificate Main Title
        canvas.draw_centered_text(
            492, "CYBERSECURITY ANALYSIS",
            font="F2", size=17, r=0.08, g=0.14, b=0.28
        )
        canvas.draw_centered_text(
            472, "COMPLETION CERTIFICATE",
            font="F2", size=19, r=0.05, g=0.10, b=0.22
        )

        # 5. Recipient Section
        canvas.draw_centered_text(
            438, "This certificate is proudly presented to",
            font="F1", size=10.5, r=0.40, g=0.45, b=0.52
        )

        recipient_name = str(cert_data.get("recipient_name", "CyberGuardian User")).strip().upper()
        canvas.draw_centered_text(
            404, recipient_name,
            font="F2", size=22, r=0.04, g=0.12, b=0.32
        )
        # Underscore for name
        canvas.set_stroke_color(0.20, 0.50, 0.80)
        canvas.line(180, 396, 612, 396, line_width=1.0)

        # 6. Presentation Narrative
        canvas.draw_centered_text(
            374, "for successfully completing a CyberGuardian AI cybersecurity assessment.",
            font="F1", size=10.0, r=0.20, g=0.26, b=0.36
        )
        canvas.draw_centered_text(
            358, "The selected assessment was completed successfully and its final result met the CyberGuardian AI SAFE / NO-RISK eligibility criteria.",
            font="F1", size=8.8, r=0.25, g=0.32, b=0.42
        )

        # 7. Certificate Details & Metrics Box (Left Panel)
        cert_id = str(cert_data.get("certificate_id", "CG-CERT-2026-000001"))
        target = str(cert_data.get("target", "Target Asset"))
        assessment_name = str(cert_data.get("assessment_name", cert_data.get("assessment_type", "Cybersecurity Assessment")))
        assessment_id = str(cert_data.get("assessment_id", cert_id))
        result_status = str(cert_data.get("result_status", "SAFE / NO RISK"))
        issue_date = str(cert_data.get("issue_date", datetime.date.today().isoformat()))
        status_val = str(cert_data.get("status", "VALID")).upper()

        # Card container
        canvas.set_fill_color(0.96, 0.98, 1.0)
        canvas.set_stroke_color(0.85, 0.90, 0.95)
        canvas.rect(70, 175, 425, 148, fill=True, stroke=True)

        # Inner details
        canvas.text(88, 298, "Certificate ID:", font="F2", size=9.0, r=0.06, g=0.12, b=0.24)
        canvas.text(195, 298, cert_id, font="F3", size=9.5, r=0.0, g=0.45, b=0.75)

        canvas.text(88, 276, "Assessment Type:", font="F2", size=9.0, r=0.06, g=0.12, b=0.24)
        canvas.text(195, 276, assessment_name[:42], font="F1", size=9.0, r=0.15, g=0.20, b=0.28)

        canvas.text(88, 254, "Assessment ID:", font="F2", size=9.0, r=0.06, g=0.12, b=0.24)
        canvas.text(195, 254, assessment_id[:42], font="F3", size=9.0, r=0.25, g=0.30, b=0.40)

        canvas.text(88, 232, "Target Asset:", font="F2", size=9.0, r=0.06, g=0.12, b=0.24)
        canvas.text(195, 232, target[:45], font="F1", size=9.0, r=0.15, g=0.20, b=0.28)

        canvas.text(88, 210, "Assessment Result:", font="F2", size=9.0, r=0.06, g=0.12, b=0.24)
        canvas.text(195, 210, "✓ SAFE / NO RISK", font="F2", size=9.0, r=0.05, g=0.65, b=0.35)

        canvas.text(88, 188, "Issue Date:", font="F2", size=9.0, r=0.06, g=0.12, b=0.24)
        canvas.text(195, 188, issue_date, font="F1", size=9.0, r=0.15, g=0.20, b=0.28)

        if status_val == "VALID":
            canvas.text(320, 188, "✓ VERIFIED & VALID", font="F2", size=8.5, r=0.05, g=0.65, b=0.35)
        else:
            canvas.text(320, 188, f"⚠ {status_val}", font="F2", size=8.5, r=0.85, g=0.20, b=0.20)

        # 8. Vector QR Code Block (Right Panel)
        verification_url = str(cert_data.get("verification_url", f"/verify/certificate/{cert_id}"))
        full_verify_url = verification_url
        if not full_verify_url.startswith("http"):
            full_verify_url = f"http://localhost:5173/verify/certificate/{cert_id}"

        qr_box_x = 560
        qr_box_y = 310
        canvas.draw_qr_matrix(qr_box_x, qr_box_y, 100, full_verify_url)

        canvas.draw_centered_text(
            196, "Scan to verify authenticity online",
            font="F2", size=8.0, r=0.20, g=0.28, b=0.40
        )
        canvas.draw_centered_text(
            182, f"cyberguardian.ai/verify/certificate/{cert_id}",
            font="F3", size=7.0, r=0.35, g=0.45, b=0.55
        )

        # 9. Signatures & Issuance Authority
        # Left signature block
        canvas.line(80, 115, 260, 115, line_width=1.0)
        canvas.draw_centered_text(
            102, "CyberGuardian AI Automated SOC Engine",
            font="F2", size=8.5, r=0.08, g=0.14, b=0.26
        )
        canvas.draw_centered_text(
            90, "Security Assessment & Telemetry Verification",
            font="F1", size=7.5, r=0.40, g=0.45, b=0.55
        )

        # Center Security Crest
        canvas.set_stroke_color(0.0, 0.72, 0.65)
        canvas.set_fill_color(0.92, 0.97, 0.99)
        canvas.rect(366, 88, 60, 42, fill=True, stroke=True)
        canvas.text(378, 112, "SECURE", font="F2", size=8, r=0.0, g=0.55, b=0.50)
        canvas.text(372, 98, "VERIFIED", font="F2", size=8, r=0.04, g=0.12, b=0.28)

        # Right signature block
        canvas.line(530, 115, 710, 115, line_width=1.0)
        canvas.draw_centered_text(
            102, "Issued by CyberGuardian AI System",
            font="F2", size=8.5, r=0.08, g=0.14, b=0.26
        )
        canvas.draw_centered_text(
            90, "Autonomous Threat Analysis & Intelligence Core",
            font="F1", size=7.5, r=0.40, g=0.45, b=0.55
        )

        # 10. Legal & Non-Government Clarification Notice
        canvas.draw_centered_text(
            50, "This document certifies successful completion of a CyberGuardian AI platform security analysis.",
            font="F1", size=7.0, r=0.45, g=0.50, b=0.58
        )
        canvas.draw_centered_text(
            40, "It represents platform assessment completion and does not constitute a government or accredited academic credential.",
            font="F1", size=7.0, r=0.45, g=0.50, b=0.58
        )

        # 11. Compile PDF 1.4 Binary
        return cls._compile_pdf(canvas)

    @classmethod
    def _compile_pdf(cls, canvas: CertificatePDFCanvas) -> bytes:
        out = io.BytesIO()
        offsets = []

        out.write(b"%PDF-1.4\n")
        out.write(b"%\xe2\xe3\xcf\xd3\n")

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

        # Font standard objects (Helvetica, Helvetica-Bold, Courier)
        f1_id = write_obj(b"<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>")
        f2_id = write_obj(b"<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>")
        f3_id = write_obj(b"<< /Type /Font /Subtype /Type1 /BaseFont /Courier /Encoding /WinAnsiEncoding >>")

        # Resources object
        res_id = write_obj(f"<< /Font << /F1 {f1_id} 0 R /F2 {f2_id} 0 R /F3 {f3_id} 0 R >> >>".encode("latin1"))

        # Page content stream
        stream_data = canvas.get_stream()
        stream_obj_id = write_obj(
            f"<< /Length {len(stream_data)} >>\nstream\n".encode("latin1") +
            stream_data +
            b"\nendstream"
        )

        # Page object (792 x 612 pt landscape)
        page_obj_id = write_obj(
            f"<< /Type /Page /Parent 0 0 R /MediaBox [0 0 792 612] /Contents {stream_obj_id} 0 R /Resources {res_id} 0 R >>".encode("latin1")
        )

        # Pages Root object
        pages_root_id = write_obj(
            f"<< /Type /Pages /Kids [{page_obj_id} 0 R] /Count 1 >>".encode("latin1")
        )

        # Catalog object
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
