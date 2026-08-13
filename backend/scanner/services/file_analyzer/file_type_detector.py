import os
import re
from typing import Dict, Any


MAGIC_SIGNATURES = [
    (b'MZ', 'PE', 'application/vnd.microsoft.portable-executable'),
    (b'\x7fELF', 'ELF', 'application/x-executable'),
    (b'%PDF-', 'DOCUMENT', 'application/pdf'),
    (b'PK\x03\x04', 'ZIP_BASED', 'application/zip'),
    (b'\xd0\xcf\x11\xe0\xa1\xb1\x1a\xe1', 'DOCUMENT', 'application/msword'),
]

SCRIPT_EXTENSIONS = {'.js', '.ps1', '.py', '.vbs', '.bat', '.cmd', '.sh', '.php', '.asp', '.aspx'}
DOC_EXTENSIONS = {'.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx', '.pdf', '.rtf'}
ARCHIVE_EXTENSIONS = {'.zip', '.tar', '.gz', '.7z', '.rar', '.bz2', '.iso'}
EXEC_EXTENSIONS = {'.exe', '.dll', '.sys', '.scr', '.cpl', '.ocx', '.drv'}
MOBILE_EXTENSIONS = {'.apk', '.aab', '.ipa'}


def detect_file_type(file_path: str, original_filename: str) -> Dict[str, Any]:
    """
    Detect actual file type using magic byte header inspection.
    Detects mismatch between declared filename extension and actual magic bytes.
    """
    ext = os.path.splitext(original_filename)[1].lower() if original_filename else ''
    
    header = b''
    file_size = 0

    if os.path.exists(file_path):
        file_size = os.path.getsize(file_path)
        with open(file_path, 'rb') as f:
            header = f.read(512)

    detected_type = 'GENERIC'
    mime_type = 'application/octet-stream'
    mismatch_detected = False

    # 1. Inspect Magic Bytes
    if header.startswith(b'MZ'):
        detected_type = 'PE'
        mime_type = 'application/vnd.microsoft.portable-executable'
    elif header.startswith(b'\x7fELF'):
        detected_type = 'ELF'
        mime_type = 'application/x-executable'
    elif header.startswith(b'%PDF-'):
        detected_type = 'DOCUMENT'
        mime_type = 'application/pdf'
    elif header.startswith(b'PK\x03\x04'):
        if ext == '.apk':
            detected_type = 'MOBILE'
            mime_type = 'application/vnd.android.package-archive'
        elif ext in {'.docx', '.xlsx', '.pptx'}:
            detected_type = 'DOCUMENT'
            mime_type = 'application/vnd.openxmlformats-officedocument'
        else:
            detected_type = 'ARCHIVE'
            mime_type = 'application/zip'
    elif header.startswith(b'\xd0\xcf\x11\xe0\xa1\xb1\x1a\xe1'):
        detected_type = 'DOCUMENT'
        mime_type = 'application/msword'
    else:
        # Check if text script file
        try:
            sample_text = header[:256].decode('utf-8', errors='ignore')
            if sample_text.startswith('#!') or ext in SCRIPT_EXTENSIONS or any(k in sample_text for k in ['<?php', '<script', 'WScript.', 'param(', 'Import-Module']):
                detected_type = 'SCRIPT'
                mime_type = 'text/plain'
            elif ext in ARCHIVE_EXTENSIONS:
                detected_type = 'ARCHIVE'
            elif ext in DOC_EXTENSIONS:
                detected_type = 'DOCUMENT'
            elif ext in EXEC_EXTENSIONS:
                detected_type = 'PE'
            elif ext in MOBILE_EXTENSIONS:
                detected_type = 'MOBILE'
        except Exception:
            pass

    # 2. Extension Mismatch Detection
    declared_category = 'GENERIC'
    if ext in EXEC_EXTENSIONS:
        declared_category = 'PE'
    elif ext in SCRIPT_EXTENSIONS:
        declared_category = 'SCRIPT'
    elif ext in DOC_EXTENSIONS:
        declared_category = 'DOCUMENT'
    elif ext in ARCHIVE_EXTENSIONS:
        declared_category = 'ARCHIVE'
    elif ext in MOBILE_EXTENSIONS:
        declared_category = 'MOBILE'

    if declared_category != 'GENERIC' and declared_category != detected_type:
        mismatch_detected = True

    return {
        "declared_type": declared_category,
        "detected_type": detected_type,
        "mime_type": mime_type,
        "extension": ext,
        "file_size": file_size,
        "mismatch_detected": mismatch_detected,
    }
