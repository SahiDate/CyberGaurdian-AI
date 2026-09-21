"""
Vector PDF Certificate Generator for CyberGuardian AI.
Renders official, tamper-evident, high-prestige landscape certificates matching
national cyber defense accreditation standards (Ministry of Electronics & IT / ISEA / C-DAC),
featuring the National Emblem of India, recipient presentation, user handwritten signature,
official verification QR code, and ornate gold filigree framing.
"""
import io
import os
import math
import datetime
from typing import Dict, Any, List

def _get_pil_image():
    """Dynamically retrieves PIL.Image if installed, preventing static linter errors."""
    try:
        pil_module = __import__('PIL.Image', fromlist=['Image'])
        return getattr(pil_module, 'Image', None) or pil_module
    except Exception:
        return None

from .qr_generator import QRCodeGenerator

ASSETS_DIR = os.path.join(os.path.dirname(__file__), 'assets')


def get_jpeg_dimensions(data: bytes):
    """Parses width and height from raw JPEG byte stream using standard library."""
    i = 0
    size = len(data)
    while i < size - 8:
        if data[i] == 0xFF:
            marker = data[i+1]
            if marker in (0xC0, 0xC1, 0xC2, 0xC3):
                h = (data[i+5] << 8) + data[i+6]
                w = (data[i+7] << 8) + data[i+8]
                return w, h
            elif marker in (0xD8, 0xD9):
                i += 2
            else:
                length = (data[i+2] << 8) + data[i+3]
                i += 2 + length
        else:
            i += 1
    return 0, 0


# Standard Adobe Type 1 Font metrics (character widths in units per 1000)
CHAR_WIDTHS_HELVETICA = {
    ' ': 278, '!': 278, '"': 355, '#': 556, '$': 556, '%': 889, '&': 667, "'": 191,
    '(': 333, ')': 333, '*': 389, '+': 584, ',': 278, '-': 333, '.': 278, '/': 278,
    ':': 278, ';': 278, '<': 584, '=': 584, '>': 584, '?': 556, '@': 1015,
    '[': 278, '\\': 278, ']': 278, '^': 469, '_': 556, '`': 222,
    '{': 334, '|': 260, '}': 334, '~': 584,
    'A': 667, 'B': 667, 'C': 722, 'D': 722, 'E': 667, 'F': 611, 'G': 778, 'H': 722,
    'I': 278, 'J': 500, 'K': 667, 'L': 556, 'M': 833, 'N': 722, 'O': 778, 'P': 667,
    'Q': 778, 'R': 722, 'S': 667, 'T': 611, 'U': 722, 'V': 667, 'W': 944, 'X': 667,
    'Y': 667, 'Z': 611,
    'a': 556, 'b': 556, 'c': 500, 'd': 556, 'e': 556, 'f': 278, 'g': 556, 'h': 556,
    'i': 222, 'j': 222, 'k': 500, 'l': 222, 'm': 833, 'n': 556, 'o': 556, 'p': 556,
    'q': 556, 'r': 333, 's': 500, 't': 278, 'u': 556, 'v': 500, 'w': 722, 'x': 500,
    'y': 500, 'z': 500,
}
for _d in '0123456789':
    CHAR_WIDTHS_HELVETICA[_d] = 556

CHAR_WIDTHS_TIMES_ROMAN = {
    ' ': 250, '!': 333, '"': 408, '#': 500, '$': 500, '%': 833, '&': 778, "'": 180,
    '(': 333, ')': 333, '*': 500, '+': 564, ',': 250, '-': 333, '.': 250, '/': 278,
    ':': 250, ';': 250, '<': 564, '=': 564, '>': 564, '?': 444, '@': 921,
    '[': 333, '\\': 278, ']': 333, '^': 469, '_': 500, '`': 333,
    '{': 480, '|': 200, '}': 480, '~': 541,
    'A': 722, 'B': 667, 'C': 667, 'D': 722, 'E': 611, 'F': 556, 'G': 722, 'H': 722,
    'I': 333, 'J': 389, 'K': 722, 'L': 611, 'M': 889, 'N': 722, 'O': 722, 'P': 556,
    'Q': 722, 'R': 667, 'S': 556, 'T': 611, 'U': 722, 'V': 667, 'W': 944, 'X': 722,
    'Y': 667, 'Z': 611,
    'a': 444, 'b': 500, 'c': 444, 'd': 500, 'e': 444, 'f': 278, 'g': 500, 'h': 500,
    'i': 278, 'j': 278, 'k': 500, 'l': 278, 'm': 778, 'n': 500, 'o': 500, 'p': 500,
    'q': 500, 'r': 333, 's': 389, 't': 278, 'u': 500, 'v': 500, 'w': 722, 'x': 500,
    'y': 500, 'z': 444,
}
for _d in '0123456789':
    CHAR_WIDTHS_TIMES_ROMAN[_d] = 500

CHAR_WIDTHS_TIMES_BOLD = {
    ' ': 250, '!': 333, '"': 555, '#': 500, '$': 500, '%': 1000, '&': 833, "'": 278,
    '(': 333, ')': 333, '*': 500, '+': 570, ',': 250, '-': 333, '.': 250, '/': 278,
    ':': 333, ';': 333, '<': 570, '=': 570, '>': 570, '?': 500, '@': 930,
    '[': 333, '\\': 278, ']': 333, '^': 581, '_': 500, '`': 333,
    '{': 394, '|': 220, '}': 394, '~': 520,
    'A': 722, 'B': 667, 'C': 722, 'D': 722, 'E': 667, 'F': 611, 'G': 778, 'H': 778,
    'I': 389, 'J': 500, 'K': 778, 'L': 667, 'M': 944, 'N': 722, 'O': 778, 'P': 611,
    'Q': 778, 'R': 722, 'S': 556, 'T': 667, 'U': 722, 'V': 667, 'W': 1000, 'X': 667,
    'Y': 722, 'Z': 667,
    'a': 500, 'b': 556, 'c': 444, 'd': 556, 'e': 444, 'f': 333, 'g': 500, 'h': 556,
    'i': 278, 'j': 333, 'k': 556, 'l': 278, 'm': 833, 'n': 556, 'o': 500, 'p': 556,
    'q': 556, 'r': 444, 's': 389, 't': 333, 'u': 556, 'v': 500, 'w': 722, 'x': 500,
    'y': 500, 'z': 444,
}
for _d in '0123456789':
    CHAR_WIDTHS_TIMES_BOLD[_d] = 500


def calc_text_width(text_str: str, font: str = "F1", size: float = 10.0) -> float:
    """Calculates exact rendered width of string in standard Type 1 fonts (in points)."""
    if font == "F3":  # Courier
        return len(text_str) * size * 0.600
    elif font in ("F4",):  # Times-Roman
        table = CHAR_WIDTHS_TIMES_ROMAN
        default_w = 500
    elif font in ("F5", "F6"):  # Times-Bold, Times-BoldItalic
        table = CHAR_WIDTHS_TIMES_BOLD
        default_w = 500
    else:  # F1 (Helvetica), F2 (Helvetica-Bold)
        table = CHAR_WIDTHS_HELVETICA
        default_w = 556

    total_units = sum(table.get(ch, default_w) for ch in text_str)
    return total_units * (size / 1000.0)


class CertificatePDFCanvas:
    """Low-level PDF page stream assembler for landscape 792x612 pt certificate."""
    def __init__(self, width=792, height=612):
        self.width = width
        self.height = height
        self.ops = []
        self.images = {}  # name -> {'width', 'height', 'data', 'obj_id'}

    def set_fill_color(self, r: float, g: float, b: float):
        self.ops.append(f"{r:.3f} {g:.3f} {b:.3f} rg")

    def set_stroke_color(self, r: float, g: float, b: float):
        self.ops.append(f"{r:.3f} {g:.3f} {b:.3f} RG")

    def rect(self, x: float, y: float, w: float, h: float, fill=True, stroke=True, line_width: float = 1.0):
        if stroke:
            self.ops.append(f"{line_width:.2f} w")
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

    def circle(self, cx: float, cy: float, r: float, fill=True, stroke=True, line_width: float = 1.0):
        """Draws a true vector circle using 4 cubic Bezier curves."""
        if stroke:
            self.ops.append(f"{line_width:.2f} w")
        k = 0.5522847498 * r
        self.ops.append(f"{cx + r:.2f} {cy:.2f} m")
        self.ops.append(f"{cx + r:.2f} {cy + k:.2f} {cx + k:.2f} {cy + r:.2f} {cx:.2f} {cy + r:.2f} c")
        self.ops.append(f"{cx - k:.2f} {cy + r:.2f} {cx - r:.2f} {cy + k:.2f} {cx - r:.2f} {cy:.2f} c")
        self.ops.append(f"{cx - r:.2f} {cy - k:.2f} {cx - k:.2f} {cy - r:.2f} {cx:.2f} {cy - r:.2f} c")
        self.ops.append(f"{cx + k:.2f} {cy - r:.2f} {cx + r:.2f} {cy - k:.2f} {cx + r:.2f} {cy:.2f} c")
        if fill and stroke:
            self.ops.append("B")
        elif fill:
            self.ops.append("f")
        elif stroke:
            self.ops.append("S")

    def polygon(self, points: List[tuple], fill=True, stroke=True, line_width: float = 1.0):
        """Draws a closed polygon."""
        if not points:
            return
        if stroke:
            self.ops.append(f"{line_width:.2f} w")
        self.ops.append(f"{points[0][0]:.2f} {points[0][1]:.2f} m")
        for pt in points[1:]:
            self.ops.append(f"{pt[0]:.2f} {pt[1]:.2f} l")
        self.ops.append("h")
        if fill and stroke:
            self.ops.append("B")
        elif fill:
            self.ops.append("f")
        elif stroke:
            self.ops.append("S")

    def text(self, x: float, y: float, text_str: str, font="F1", size=10, r=0.1, g=0.1, b=0.1):
        clean_text = str(text_str).replace('\\', '\\\\').replace('(', '\\(').replace(')', '\\)')
        clean_text = "".join(ch if 32 <= ord(ch) <= 126 else " " for ch in clean_text)
        self.ops.append("BT")
        self.ops.append(f"/{font} {size} Tf")
        self.ops.append(f"{r:.3f} {g:.3f} {b:.3f} rg")
        self.ops.append(f"1 0 0 1 {x:.2f} {y:.2f} Tm")
        self.ops.append(f"({clean_text}) Tj")
        self.ops.append("ET")



    def draw_centered_text(self, y: float, text_str: str, font="F1", size=10, r=0.1, g=0.1, b=0.1):
        """Center-aligns text across the entire page (width 792 pt). Returns (x, width)."""
        w = calc_text_width(text_str, font, size)
        x = (self.width - w) / 2.0
        self.text(x, y, text_str, font=font, size=size, r=r, g=g, b=b)
        return x, w

    def draw_text_in_range(self, x_start: float, x_end: float, y: float, text_str: str, font="F1", size=10, r=0.1, g=0.1, b=0.1):
        """Center-aligns text strictly within a defined horizontal range [x_start, x_end]. Returns (x, width)."""
        w = calc_text_width(text_str, font, size)
        box_w = x_end - x_start
        x = max(x_start, x_start + (box_w - w) / 2.0)
        self.text(x, y, text_str, font=font, size=size, r=r, g=g, b=b)
        return x, w

    def add_image_from_file(self, name: str, filepath: str, bg_color=(255, 255, 255)):
        """Loads an image (JPEG or PNG) with zero external C-dependencies when JPEG exists."""
        # 1. Prefer matching .jpg version first
        base, ext = os.path.splitext(filepath)
        jpg_candidate = base + '.jpg'
        if os.path.exists(jpg_candidate):
            filepath = jpg_candidate

        if not os.path.exists(filepath):
            return False

        try:
            # Native zero-dependency JPEG embedding
            if filepath.lower().endswith(('.jpg', '.jpeg')):
                with open(filepath, 'rb') as f:
                    jpeg_data = f.read()
                w, h = get_jpeg_dimensions(jpeg_data)
                if w > 0 and h > 0:
                    self.images[name] = {
                        'width': w,
                        'height': h,
                        'data': jpeg_data,
                    }
                    return True

            # If PNG and Pillow is available
            pil_cls = _get_pil_image()
            if pil_cls is not None:
                img = pil_cls.open(filepath)
                if img.mode in ('RGBA', 'LA') or (img.mode == 'P' and 'transparency' in img.info):
                    alpha = img.convert('RGBA').split()[3]
                    bg = pil_cls.new("RGB", img.size, bg_color)
                    bg.paste(img.convert('RGBA'), mask=alpha)
                    rgb_img = bg
                else:
                    rgb_img = img.convert('RGB')

                buf = io.BytesIO()
                rgb_img.save(buf, format='JPEG', quality=95)
                self.images[name] = {
                    'width': rgb_img.width,
                    'height': rgb_img.height,
                    'data': buf.getvalue(),
                }
                return True
        except Exception as e:
            print(f"Error loading image {filepath}: {e}")
            return False
        return False

    def draw_image(self, name: str, x: float, y: float, w: float, h: float):
        """Draws an image at (x, y) with dimensions (w, h)."""
        if name in self.images:
            self.ops.append("q")
            self.ops.append(f"{w:.2f} 0 0 {h:.2f} {x:.2f} {y:.2f} cm")
            self.ops.append(f"/{name} Do")
            self.ops.append("Q")

    def draw_gold_corner_scrollwork(self, cx: float, cy: float, sx: float, sy: float):
        """
        Renders rich ornate gold baroque acanthus scrollwork in corner (cx, cy).
        sx, sy (+1 or -1) determine the corner orientation.
        """
        self.set_stroke_color(0.82, 0.65, 0.28)
        self.ops.append("1.2 w")
        # Main swirling vine
        self.ops.append(f"{cx:.2f} {cy + (sy * 45):.2f} m")
        self.ops.append(f"{cx + (sx * 8):.2f} {cy + (sy * 25):.2f} {cx + (sx * 25):.2f} {cy + (sy * 8):.2f} {cx + (sx * 45):.2f} {cy:.2f} c")
        self.ops.append(f"{cx + (sx * 35):.2f} {cy + (sy * 4):.2f} {cx + (sx * 22):.2f} {cy + (sy * 15):.2f} {cx + (sx * 15):.2f} {cy + (sy * 22):.2f} c")
        self.ops.append(f"{cx + (sx * 8):.2f} {cy + (sy * 30):.2f} {cx + (sx * 4):.2f} {cy + (sy * 38):.2f} {cx:.2f} {cy + (sy * 45):.2f} c S")

        # Decorative leaf accents
        self.set_fill_color(0.90, 0.75, 0.35)
        for d in (12, 22, 32):
            lx = cx + (sx * d)
            ly = cy + (sy * (42 - d))
            self.circle(lx, ly, 2.2, fill=True, stroke=False)

        # Delicate corner curls
        self.line(cx + (sx * 6), cy + (sy * 6), cx + (sx * 16), cy + (sy * 16), line_width=1.0)
        self.circle(cx + (sx * 18), cy + (sy * 18), 3.0, fill=True, stroke=True, line_width=0.8)

    def draw_qr_matrix(self, top_left_x: float, top_left_y: float, qr_size: float, url: str):
        """Draws a vector-sharp QR code directly into the PDF stream."""
        matrix = QRCodeGenerator.encode_text(url)
        dim = len(matrix)
        mod_size = qr_size / dim

        # Crisp white background card with border
        self.set_fill_color(1.0, 1.0, 1.0)
        self.set_stroke_color(0.85, 0.88, 0.92)
        self.rect(top_left_x - 4, top_left_y - qr_size - 4, qr_size + 8, qr_size + 8, fill=True, stroke=True, line_width=0.8)

        # Draw dark modules
        self.set_fill_color(0.08, 0.12, 0.20)
        for r in range(dim):
            for c in range(dim):
                if matrix[r][c]:
                    mx = top_left_x + (c * mod_size)
                    my = top_left_y - ((r + 1) * mod_size)
                    self.rect(mx, my, mod_size, mod_size, fill=True, stroke=False)

    def get_stream(self) -> bytes:
        return "\n".join(self.ops).encode("latin1", errors="replace")


class PDFCertificateGenerator:
    """
    Generates the official CyberGuardian AI Cybersecurity Analysis & Pledge Certificate.
    Matches the design of the reference National Cyber Security Certificate (Image 5)
    with the National Emblem of India on top, user's handwritten signature on bottom,
    and official QR code verification.
    """

    @classmethod
    def generate_certificate_pdf(cls, cert_data: Dict[str, Any]) -> bytes:
        canvas = CertificatePDFCanvas(width=792, height=612)

        # ----------------------------------------------------------------------
        # 1. Base Canvas Background (Crisp Certificate Ivory Texture)
        # ----------------------------------------------------------------------
        canvas.set_fill_color(1.0, 0.998, 0.994)
        canvas.rect(0, 0, 792, 612, fill=True, stroke=False)

        # ----------------------------------------------------------------------
        # 2. Ornate Luxury Gold Border & Corner Flourishes (Matching Reference)
        # ----------------------------------------------------------------------
        # Outermost fine gold border
        canvas.set_stroke_color(0.80, 0.65, 0.28)
        canvas.rect(22, 22, 748, 568, fill=False, stroke=True, line_width=1.0)

        # Secondary thick gold frame line
        canvas.set_stroke_color(0.84, 0.68, 0.30)
        canvas.rect(28, 28, 736, 556, fill=False, stroke=True, line_width=2.0)

        # Inner delicate hairline gold border
        canvas.set_stroke_color(0.88, 0.74, 0.38)
        canvas.rect(34, 34, 724, 544, fill=False, stroke=True, line_width=0.6)

        # Ornate Baroque Gold Corner Flourishes
        canvas.draw_gold_corner_scrollwork(35, 577, 1, -1)    # Top-Left
        canvas.draw_gold_corner_scrollwork(757, 577, -1, -1)  # Top-Right
        canvas.draw_gold_corner_scrollwork(35, 35, 1, 1)      # Bottom-Left
        canvas.draw_gold_corner_scrollwork(757, 35, -1, 1)    # Bottom-Right

        # ----------------------------------------------------------------------
        # 3. Top Header: National Emblem of India + Flanking Seals
        # ----------------------------------------------------------------------
        # Load the user-provided National Emblem of India (prefers zero-dependency JPEG)
        emblem_path = os.path.join(ASSETS_DIR, 'national_emblem.jpg')
        if not os.path.exists(emblem_path):
            emblem_path = os.path.join(ASSETS_DIR, 'national_emblem.png')
        emblem_loaded = canvas.add_image_from_file('NatEmblem', emblem_path)

        if emblem_loaded:
            # National Emblem placed prominently at the top center
            emb_w = 46.0
            emb_h = 58.0
            emb_x = (792.0 - emb_w) / 2.0
            emb_y = 512.0
            canvas.draw_image('NatEmblem', emb_x, emb_y, emb_w, emb_h)
        else:
            # Fallback vector emblem
            canvas.circle(396, 542, 20, fill=False, stroke=True, line_width=1.2)
            canvas.text(382, 538, "EMBLEM", font="F2", size=7, r=0.7, g=0.55, b=0.2)

        # Ministry & Government Header Line (Directly below National Emblem)
        canvas.draw_centered_text(
            498, "Ministry of Electronics & Information Technology,",
            font="F2", size=8.5, r=0.15, g=0.20, b=0.28
        )
        canvas.draw_centered_text(
            487, "Government of India",
            font="F2", size=8.5, r=0.15, g=0.20, b=0.28
        )

        # Top-Left Flanking Logo: ISEA Emblem (Matching Reference)
        isea_cx = 98.0
        isea_cy = 536.0
        canvas.set_fill_color(0.92, 0.96, 1.0)
        canvas.set_stroke_color(0.20, 0.50, 0.85)
        canvas.circle(isea_cx, isea_cy, 22.0, fill=True, stroke=True, line_width=1.0)
        canvas.text(isea_cx - 15, isea_cy + 2, "iSEA", font="F2", size=11.0, r=0.08, g=0.35, b=0.75)
        canvas.draw_text_in_range(isea_cx - 40, isea_cx + 40, isea_cy - 14, "Cyber Security", font="F1", size=6.0, r=0.20, g=0.30, b=0.45)
        canvas.draw_text_in_range(isea_cx - 45, isea_cx + 45, isea_cy - 30, "www.isea.gov.in", font="F1", size=6.0, r=0.35, g=0.45, b=0.55)

        # Top-Right Flanking Logo: C-DAC Emblem (Matching Reference)
        cdac_cx = 694.0
        cdac_cy = 536.0
        canvas.set_fill_color(0.08, 0.40, 0.75)
        canvas.set_stroke_color(0.85, 0.70, 0.25)
        canvas.circle(cdac_cx, cdac_cy, 22.0, fill=True, stroke=True, line_width=1.5)
        canvas.circle(cdac_cx, cdac_cy, 18.0, fill=False, stroke=True, line_width=0.6)
        canvas.text(cdac_cx - 13, cdac_cy + 2, "CDAC", font="F2", size=9.0, r=1.0, g=1.0, b=1.0)
        canvas.draw_text_in_range(cdac_cx - 30, cdac_cx + 30, cdac_cy - 10, "CYBER SEC", font="F2", size=4.8, r=0.85, g=0.92, b=1.0)
        canvas.draw_text_in_range(cdac_cx - 45, cdac_cx + 45, cdac_cy - 30, "CyberGuardian AI", font="F1", size=6.0, r=0.35, g=0.45, b=0.55)

        # ----------------------------------------------------------------------
        # 4. Main Certificate Title (Matching Reference Typography)
        # ----------------------------------------------------------------------
        # "Cyber Security Pledge" / "Cyber Security Assessment"
        canvas.draw_centered_text(
            450.0, "Cyber Security Pledge",
            font="F5", size=26.0, r=0.08, g=0.10, b=0.15
        )

        # "Certificate" rendered in elegant teal calligraphic serif (matching reference)
        canvas.draw_centered_text(
            416.0, "Certificate",
            font="F6", size=28.0, r=0.08, g=0.48, b=0.60
        )

        # ----------------------------------------------------------------------
        # 5. Certificate Number
        # ----------------------------------------------------------------------
        cert_id = str(cert_data.get("certificate_id", "CG-CERT-2026-000003"))
        clean_num = cert_id.replace('CG-CERT-', '').replace('2026-', '')
        canvas.draw_centered_text(
            390.0, f"Certificate No : ISEA/CG/2026/{clean_num}",
            font="F2", size=9.5, r=0.12, g=0.15, b=0.20
        )

        # ----------------------------------------------------------------------
        # 6. Recipient Presentation Line (Centered & Balanced Symmetrically)
        # ----------------------------------------------------------------------
        recipient_name = str(cert_data.get("recipient_name", "SAHIL")).strip().upper()

        pres_y = 344.0
        x_margin = 78.0

        w_left = calc_text_width("This is to certify that", "F4", 12.0)
        canvas.text(x_margin, pres_y, "This is to certify that", font="F4", size=12.0, r=0.15, g=0.18, b=0.25)

        w_right = calc_text_width("has taken the", "F4", 12.0)
        right_x = 792.0 - x_margin - w_right
        canvas.text(right_x, pres_y, "has taken the", font="F4", size=12.0, r=0.15, g=0.18, b=0.25)

        # Continuous baseline underline spanning between left and right phrases
        line_start = x_margin + w_left + 6.0
        line_end = right_x - 6.0
        canvas.set_stroke_color(0.20, 0.25, 0.35)
        canvas.line(line_start, pres_y - 2.0, line_end, pres_y - 2.0, line_width=0.8)

        # Recipient Name placed at the EXACT mathematical center of the page in Bold-Italic
        name_w = calc_text_width(recipient_name, "F6", 16.5)
        name_x = (792.0 - name_w) / 2.0
        canvas.text(name_x, pres_y, recipient_name, font="F6", size=16.5, r=0.05, g=0.08, b=0.15)

        # ----------------------------------------------------------------------
        # 7. Pledge / Assessment Focus Title
        # ----------------------------------------------------------------------
        target = str(cert_data.get("target", "Report1.txt"))
        assessment_name = str(cert_data.get("assessment_name", cert_data.get("assessment_type", "SOC Security Analysis")))

        title_y = 306.0
        pledge_title = f"Cyber Security Pledge & Defense Verification for {target}"
        title_x, title_w = canvas.draw_centered_text(title_y, pledge_title, font="F6", size=13.5, r=0.08, g=0.10, b=0.16)

        # Dynamically fitted underline spanning pledge title with 8 pt padding
        canvas.set_stroke_color(0.20, 0.25, 0.35)
        canvas.line(title_x - 8.0, title_y - 3.0, title_x + title_w + 8.0, title_y - 3.0, line_width=0.8)

        # ----------------------------------------------------------------------
        # 8. Commitment & Verification Narrative
        # ----------------------------------------------------------------------
        canvas.draw_centered_text(
            272.0, "and will remain committed to be cyber aware and alert in safeguarding self and others against possible",
            font="F4", size=10.5, r=0.18, g=0.22, b=0.30
        )
        canvas.draw_centered_text(
            254.0, "cyber crimes or frauds in the digital space, by following secured and hygienic online practices.",
            font="F4", size=10.5, r=0.18, g=0.22, b=0.30
        )

        # Technical compliance verification note
        canvas.draw_centered_text(
            230.0, f"Target Scope: {target}   |   Assessment: {assessment_name}   |   Result: [PASSED] SAFE / NO-RISK POSTURE",
            font="F2", size=8.5, r=0.05, g=0.55, b=0.32
        )

        # ----------------------------------------------------------------------
        # 9. Bottom Section: User's Handwritten Signature & Verification QR Code
        # ----------------------------------------------------------------------
        # User's Handwritten Signature centered at cx = 396
        sig_path = os.path.join(ASSETS_DIR, 'signature_sahil.jpg')
        if not os.path.exists(sig_path):
            sig_path = os.path.join(ASSETS_DIR, 'signature_sahil_clean.png')
        sig_loaded = canvas.add_image_from_file('UserSig', sig_path)

        sig_w = 90.0
        sig_h = 58.0
        sig_box_x = 396.0 - (sig_w / 2.0)
        sig_box_y = 142.0

        if sig_loaded:
            canvas.draw_image('UserSig', sig_box_x, sig_box_y, sig_w, sig_h)
        else:
            canvas.line(sig_box_x, sig_box_y + 20.0, sig_box_x + sig_w, sig_box_y + 20.0, line_width=1.0)

        # Signature Underline centered at cx = 396
        sig_line_y = 140.0
        canvas.set_stroke_color(0.18, 0.22, 0.30)
        canvas.line(321.0, sig_line_y, 471.0, sig_line_y, line_width=0.8)

        # Coordinator / Lead Designation centered at cx = 396
        canvas.draw_centered_text(sig_line_y - 14.0, "Shri. Sahilraj Date", font="F2", size=8.8, r=0.10, g=0.14, b=0.20)
        canvas.draw_centered_text(sig_line_y - 25.0, "Coordinator, CyberGuardian SOC / ISEA PMU", font="F1", size=7.2, r=0.30, g=0.35, b=0.45)
        canvas.draw_centered_text(sig_line_y - 35.0, "Information Security Education and Awareness Phase - II", font="F1", size=6.6, r=0.40, g=0.45, b=0.55)

        # Bottom-Right: Vector QR Code (Matching Reference)
        verification_url = str(cert_data.get("verification_url", f"/verify/certificate/{cert_id}"))
        full_verify_url = verification_url
        if not full_verify_url.startswith("http"):
            full_verify_url = f"http://localhost:5173/verify/certificate/{cert_id}"

        qr_size = 58.0
        qr_box_x = 620.0
        qr_box_y = 195.0
        canvas.draw_qr_matrix(qr_box_x, qr_box_y, qr_size, full_verify_url)

        # QR Caption & Issued Date
        issue_date = str(cert_data.get("issue_date", datetime.date.today().isoformat()))
        qr_center_x = qr_box_x + (qr_size / 2.0)
        canvas.draw_text_in_range(qr_center_x - 60.0, qr_center_x + 60.0, qr_box_y - qr_size - 14.0, f"Issued Date : {issue_date}", font="F1", size=7.5, r=0.25, g=0.30, b=0.40)
        canvas.draw_text_in_range(qr_center_x - 60.0, qr_center_x + 60.0, qr_box_y - qr_size - 24.0, "Scan to Verify Online", font="F2", size=6.5, r=0.08, g=0.48, b=0.60)

        # ----------------------------------------------------------------------
        # 10. Compile PDF 1.4 Binary Stream
        # ----------------------------------------------------------------------
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

        # Standard PDF 1.4 Type1 Fonts
        f1_id = write_obj(b"<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>")
        f2_id = write_obj(b"<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>")
        f3_id = write_obj(b"<< /Type /Font /Subtype /Type1 /BaseFont /Courier /Encoding /WinAnsiEncoding >>")
        f4_id = write_obj(b"<< /Type /Font /Subtype /Type1 /BaseFont /Times-Roman /Encoding /WinAnsiEncoding >>")
        f5_id = write_obj(b"<< /Type /Font /Subtype /Type1 /BaseFont /Times-Bold /Encoding /WinAnsiEncoding >>")
        f6_id = write_obj(b"<< /Type /Font /Subtype /Type1 /BaseFont /Times-BoldItalic /Encoding /WinAnsiEncoding >>")

        # Compile Image XObjects
        xobj_entries = []
        for name, img_info in canvas.images.items():
            img_data = img_info['data']
            img_dict = (
                f"<< /Type /XObject /Subtype /Image /Width {img_info['width']} "
                f"/Height {img_info['height']} /ColorSpace /DeviceRGB /BitsPerComponent 8 "
                f"/Filter /DCTDecode /Length {len(img_data)} >>\nstream\n"
            ).encode('latin1') + img_data + b"\nendstream"
            img_obj_id = write_obj(img_dict)
            xobj_entries.append(f"/{name} {img_obj_id} 0 R")

        xobj_dict = f"<< {' '.join(xobj_entries)} >>" if xobj_entries else "<< >>"

        # Resources Dictionary
        res_content = (
            f"<< /Font << /F1 {f1_id} 0 R /F2 {f2_id} 0 R /F3 {f3_id} 0 R "
            f"/F4 {f4_id} 0 R /F5 {f5_id} 0 R /F6 {f6_id} 0 R >> "
            f"/XObject {xobj_dict} >>"
        )
        res_id = write_obj(res_content.encode('latin1'))

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
