import math
from typing import Dict, Any


def calculate_entropy(file_path: str) -> Dict[str, Any]:
    """
    Calculate Shannon Entropy for a file (0.0 to 8.0 bits per byte).
    
    Entropy measures randomness in byte distribution:
    - Low (< 5.5): Plain text, uncompressed scripts, source code
    - Medium (5.5 - 7.1): Standard compiled code, images, documents
    - High (> 7.1): Encrypted, packed, or compressed payloads
    """
    byte_counts = [0] * 256
    total_bytes = 0

    with open(file_path, 'rb') as f:
        while chunk := f.read(65536):
            total_bytes += len(chunk)
            for byte in chunk:
                byte_counts[byte] += 1

    if total_bytes == 0:
        return {
            "entropy": 0.0,
            "category": "LOW",
            "explanation": "File is empty (0 bytes)."
        }

    entropy = 0.0
    for count in byte_counts:
        if count > 0:
            p = count / total_bytes
            entropy -= p * math.log2(p)

    entropy = round(entropy, 4)

    if entropy > 7.1:
        category = "HIGH"
        explanation = "High entropy indicates encryption, packing (e.g. UPX/Themida), or high compression."
    elif entropy >= 5.5:
        category = "MEDIUM"
        explanation = "Moderate entropy typical of compiled binary executables or binary media."
    else:
        category = "LOW"
        explanation = "Low entropy typical of plain text, source scripts, or uncompressed structures."

    return {
        "entropy": entropy,
        "category": category,
        "explanation": explanation
    }
