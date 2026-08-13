import os
import zipfile
from typing import Dict, Any, List


SUSPICIOUS_ARCHIVE_EXTENSIONS = {'.exe', '.dll', '.scr', '.bat', '.ps1', '.vbs', '.js', '.cpl', '.com'}


def analyze_archive(file_path: str) -> Dict[str, Any]:
    """
    Perform safe static inspection on ZIP and compressed archive files.
    Does NOT extract archive contents to disk blindly.
    """
    if not os.path.exists(file_path):
        return {"is_archive": False, "error": "File does not exist."}

    if not zipfile.is_zipfile(file_path):
        return {"is_archive": False, "reason": "Not a standard ZIP zipfile archive."}

    path_traversal_found = False
    suspicious_files_found = []
    total_uncompressed_size = 0
    compressed_size = os.path.getsize(file_path)
    entry_count = 0
    max_nesting_depth = 0

    try:
        with zipfile.ZipFile(file_path, 'r') as z:
            infolist = z.infolist()
            entry_count = len(infolist)

            for info in infolist:
                filename = info.filename
                total_uncompressed_size += info.file_size

                # Nesting depth calculation
                depth = filename.count('/') + filename.count('\\')
                if depth > max_nesting_depth:
                    max_nesting_depth = depth

                # Path traversal detection
                if '../' in filename or '..\\' in filename or filename.startswith('/') or (len(filename) > 2 and filename[1] == ':'):
                    path_traversal_found = True

                # Suspicious executable entry detection
                ext = os.path.splitext(filename)[1].lower()
                if ext in SUSPICIOUS_ARCHIVE_EXTENSIONS:
                    suspicious_files_found.append(filename)

        # Archive Bomb Check (ratio > 100:1 and total uncompressed > 50 MB)
        ratio = round(total_uncompressed_size / max(compressed_size, 1), 2)
        is_archive_bomb = bool(ratio > 100 and total_uncompressed_size > 50 * 1024 * 1024)

        return {
            "is_archive": True,
            "entry_count": entry_count,
            "compressed_size": compressed_size,
            "uncompressed_size": total_uncompressed_size,
            "compression_ratio": ratio,
            "path_traversal_detected": path_traversal_found,
            "is_archive_bomb": is_archive_bomb,
            "suspicious_contained_files": suspicious_files_found[:10],
            "max_nesting_depth": max_nesting_depth
        }

    except Exception as e:
        return {
            "is_archive": True,
            "error": f"Error inspecting archive zipfile entries: {str(e)}"
        }
