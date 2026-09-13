"""
Pure-Python QR Code Generator for CyberGuardian AI.
Self-contained, zero-dependency implementation of ISO/IEC 18004 QR Code.
Supports Byte mode (ISO-8859-1 / UTF-8) with Reed-Solomon Error Correction.
Returns a 2D boolean matrix (True = black module, False = white module)
ready for vector PDF canvas rendering or SVG / HTML rendering.
"""
from typing import List, Tuple


# GF(256) Math tables with primitive polynomial 0x11D (285)
_EXP = [0] * 512
_LOG = [0] * 256

def _init_gf256():
    x = 1
    for i in range(255):
        _EXP[i] = x
        _LOG[x] = i
        x <<= 1
        if x & 0x100:
            x ^= 0x11D
    for i in range(255, 512):
        _EXP[i] = _EXP[i - 255]

_init_gf256()

def _gf_mul(x: int, y: int) -> int:
    if x == 0 or y == 0:
        return 0
    return _EXP[_LOG[x] + _LOG[y]]

def _rs_generator_poly(ec_count: int) -> List[int]:
    poly = [1]
    for i in range(ec_count):
        new_poly = [0] * (len(poly) + 1)
        for j, c in enumerate(poly):
            new_poly[j] ^= _gf_mul(c, _EXP[i])
            new_poly[j + 1] ^= c
        poly = new_poly
    return poly

def _rs_encode(data: List[int], ec_count: int) -> List[int]:
    gen = _rs_generator_poly(ec_count)
    res = list(data) + [0] * ec_count
    for i in range(len(data)):
        coef = res[i]
        if coef != 0:
            for j in range(len(gen)):
                res[i + j] ^= _gf_mul(gen[j], coef)
    return res[len(data):]


# Version specifications: (version, total_codewords, ec_codewords, ec_blocks)
# For simplicity and url length (~50-80 chars), we support Version 1 to Version 6 (Medium EC)
_VERSION_SPECS = {
    # Version: (dimension, data_codewords_M, ec_codewords_per_block, num_blocks)
    1: (21, 16, 10, 1),
    2: (25, 28, 16, 1),
    3: (29, 44, 26, 1),
    4: (33, 64, 18, 2), # 2 blocks of (18 EC + 32 Data) = 64 data
    5: (37, 86, 24, 2), # 2 blocks
    6: (41, 108, 16, 4),
}

# Alignment pattern coordinates for Versions 1-6
_ALIGNMENT_COORDS = {
    1: [],
    2: [6, 18],
    3: [6, 22],
    4: [6, 26],
    5: [6, 30],
    6: [6, 34],
}


class QRCodeGenerator:
    """
    Encodes text into a standard QR code matrix.
    """

    @classmethod
    def encode_text(cls, text: str) -> List[List[bool]]:
        """
        Encodes `text` using Byte mode (Medium error correction).
        Returns a square 2D boolean grid (True=Dark, False=Light).
        """
        raw_bytes = text.encode('utf-8')
        data_len = len(raw_bytes)

        # Select minimum sufficient version
        version = None
        for v in range(1, 7):
            dim, max_data, ec_len, num_blocks = _VERSION_SPECS[v]
            # Header in byte mode: 4 bits mode + 8 bits count = 12 bits -> 1.5 bytes + data_len <= max_data
            if data_len + 2 <= max_data:
                version = v
                break

        if version is None:
            version = 6  # fallback to version 6

        dim, max_data, ec_len, num_blocks = _VERSION_SPECS[version]

        # 1. Build data bit stream
        # Mode indicator: 0100 for Byte
        bits = [0, 1, 0, 0]
        # Character count indicator (8 bits for versions 1-9 in byte mode)
        for i in range(7, -1, -1):
            bits.append((data_len >> i) & 1)
        # Data bytes
        for b in raw_bytes:
            for i in range(7, -1, -1):
                bits.append((b >> i) & 1)

        # Terminator up to 4 zeroes
        rem_cap = max_data * 8 - len(bits)
        bits.extend([0] * min(4, rem_cap))
        # Pad to byte boundary
        while len(bits) % 8 != 0:
            bits.append(0)

        # Convert bits to bytes
        codewords = []
        for i in range(0, len(bits), 8):
            val = 0
            for bit in bits[i:i + 8]:
                val = (val << 1) | bit
            codewords.append(val)

        # Pad with 0xEC, 0x11 alternating bytes
        pad_bytes = [0xEC, 0x11]
        pad_idx = 0
        while len(codewords) < max_data:
            codewords.append(pad_bytes[pad_idx % 2])
            pad_idx += 1

        # Error correction code calculation per block
        data_per_block = max_data // num_blocks
        data_blocks = []
        ec_blocks = []
        for b in range(num_blocks):
            sub_data = codewords[b * data_per_block:(b + 1) * data_per_block]
            data_blocks.append(sub_data)
            ec_blocks.append(_rs_encode(sub_data, ec_len))

        # Interleave data codewords then EC codewords
        final_codewords = []
        for i in range(data_per_block):
            for b in range(num_blocks):
                final_codewords.append(data_blocks[b][i])
        for i in range(ec_len):
            for b in range(num_blocks):
                final_codewords.append(ec_blocks[b][i])

        # 2. Build Matrix
        matrix = [[None] * dim for _ in range(dim)]
        is_reserved = [[False] * dim for _ in range(dim)]

        def place_finder(top_x, top_y):
            for r in range(7):
                for c in range(7):
                    is_reserved[top_y + r][top_x + c] = True
                    if r in (0, 6) or c in (0, 6) or (2 <= r <= 4 and 2 <= c <= 4):
                        matrix[top_y + r][top_x + c] = True
                    else:
                        matrix[top_y + r][top_x + c] = False
            # Separator
            for r in range(-1, 8):
                for c in range(-1, 8):
                    y, x = top_y + r, top_x + c
                    if 0 <= y < dim and 0 <= x < dim and not (0 <= r <= 6 and 0 <= c <= 6):
                        is_reserved[y][x] = True
                        matrix[y][x] = False

        place_finder(0, 0)
        place_finder(dim - 7, 0)
        place_finder(0, dim - 7)

        # Alignment patterns for version >= 2
        align_coords = _ALIGNMENT_COORDS.get(version, [])
        if len(align_coords) >= 2:
            for cy in align_coords:
                for cx in align_coords:
                    # Don't place on top of finders
                    if (cx < 9 and cy < 9) or (cx > dim - 9 and cy < 9) or (cx < 9 and cy > dim - 9):
                        continue
                    for r in range(-2, 3):
                        for c in range(-2, 3):
                            y, x = cy + r, cx + c
                            is_reserved[y][x] = True
                            if abs(r) == 2 or abs(c) == 2 or (r == 0 and c == 0):
                                matrix[y][x] = True
                            else:
                                matrix[y][x] = False

        # Timing patterns
        for i in range(8, dim - 8):
            is_reserved[6][i] = True
            is_reserved[i][6] = True
            matrix[6][i] = (i % 2 == 0)
            matrix[i][6] = (i % 2 == 0)

        # Dark module
        matrix[4 * version + 9][8] = True
        is_reserved[4 * version + 9][8] = True

        # Reserve format info areas
        for i in range(9):
            if not is_reserved[8][i]:
                is_reserved[8][i] = True
            if not is_reserved[i][8]:
                is_reserved[i][8] = True
        for i in range(8):
            is_reserved[8][dim - 1 - i] = True
            is_reserved[dim - 1 - i][8] = True

        # 3. Place Data Bits in Zigzag
        data_bits = []
        for cw in final_codewords:
            for i in range(7, -1, -1):
                data_bits.append((cw >> i) & 1)

        bit_idx = 0
        total_bits = len(data_bits)
        x = dim - 1
        upward = True
        while x > 0:
            if x == 6:  # Skip vertical timing pattern column
                x -= 1
            y_range = range(dim - 1, -1, -1) if upward else range(dim)
            for y in y_range:
                for col in (x, x - 1):
                    if not is_reserved[y][col]:
                        val = data_bits[bit_idx] if bit_idx < total_bits else 0
                        bit_idx += 1
                        # Apply standard mask pattern 0: (row + column) % 2 == 0
                        mask_condition = ((y + col) % 2 == 0)
                        matrix[y][col] = bool(val ^ (1 if mask_condition else 0))
            upward = not upward
            x -= 2

        # 4. Format Info for ECC Level M (00) and Mask 0 (000)
        # Format string for (M, Mask 0): 101010000010010 (BCH 15,5 error corrected)
        fmt = [1, 0, 1, 0, 1, 0, 0, 0, 0, 0, 1, 0, 0, 1, 0]
        # Top-left copy
        coords_tl = [
            (8, 0), (8, 1), (8, 2), (8, 3), (8, 4), (8, 5),
            (8, 7), (8, 8), (7, 8), (5, 8), (4, 8), (3, 8), (2, 8), (1, 8), (0, 8)
        ]
        for i, (r, c) in enumerate(coords_tl):
            matrix[r][c] = bool(fmt[i])

        # Bottom-left and Top-right copy
        coords_other = [
            (dim - 1, 8), (dim - 2, 8), (dim - 3, 8), (dim - 4, 8), (dim - 5, 8), (dim - 6, 8), (dim - 7, 8),
            (8, dim - 8), (8, dim - 7), (8, dim - 6), (8, dim - 5), (8, dim - 4), (8, dim - 3), (8, dim - 2), (8, dim - 1)
        ]
        for i, (r, c) in enumerate(coords_other):
            matrix[r][c] = bool(fmt[i])

        # Convert any remaining None to False
        clean_matrix = [[bool(cell) for cell in row] for row in matrix]
        return clean_matrix

    @classmethod
    def to_svg(cls, text: str, size: int = 160) -> str:
        """Helper to render the QR matrix into inline SVG string."""
        grid = cls.encode_text(text)
        n = len(grid)
        border = 2
        total_dim = n + border * 2
        scale = size / total_dim
        rects = []
        for r in range(n):
            for c in range(n):
                if grid[r][c]:
                    x = (c + border) * scale
                    y = (r + border) * scale
                    rects.append(f'<rect x="{x:.1f}" y="{y:.1f}" width="{scale:.1f}" height="{scale:.1f}" fill="#0f172a" />')
        return f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {size} {size}" width="{size}" height="{size}"><rect width="100%" height="100%" fill="#ffffff" rx="8"/>{"".join(rects)}</svg>'
