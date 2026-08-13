import os
import re
import zipfile
from typing import Dict, Any, List


def analyze_document(file_path: str, extension: str) -> Dict[str, Any]:
    """
    Perform safe static inspection on PDF and Microsoft Office documents.
    Does NOT open documents in application viewers or execute embedded macros.
    """
    if not os.path.exists(file_path):
        return {"is_document": False, "error": "File does not exist."}

    ext = extension.lower() if extension else os.path.splitext(file_path)[1].lower()
    has_macros = False
    indicators = []

    try:
        with open(file_path, 'rb') as f:
            raw_bytes = f.read(200000)

        # 1. PDF Analysis
        if ext == '.pdf' or raw_bytes.startswith(b'%PDF-'):
            text = raw_bytes.decode('utf-8', errors='ignore')
            pdf_actions = []
            if '/JavaScript' in text or '/JS' in text:
                pdf_actions.append("Embedded JavaScript (/JavaScript)")
            if '/Launch' in text:
                pdf_actions.append("Executable Launch Action (/Launch)")
            if '/EmbeddedFile' in text:
                pdf_actions.append("Embedded Binary File (/EmbeddedFile)")
            if '/OpenAction' in text or '/AA' in text:
                pdf_actions.append("Auto-Open Action (/OpenAction)")

            return {
                "is_document": True,
                "document_format": "PDF",
                "has_macros": False,
                "has_embedded_actions": len(pdf_actions) > 0,
                "action_indicators": pdf_actions,
            }

        # 2. Office Open XML (.docx, .xlsx, .pptx)
        if ext in {'.docx', '.xlsx', '.pptx', '.docm', '.xlsm'} and zipfile.is_zipfile(file_path):
            with zipfile.ZipFile(file_path, 'r') as z:
                namelist = z.namelist()
                if any('vbaProject.bin' in name.lower() or 'vba' in name.lower() for name in namelist):
                    has_macros = True
                    indicators.append("VBA Macro project binary (vbaProject.bin) detected inside document archive")

                # Check external relationships
                for name in namelist:
                    if name.endswith('.rels'):
                        rel_data = z.read(name).decode('utf-8', errors='ignore')
                        if 'TargetMode="External"' in rel_data:
                            indicators.append(f"External link relationship detected in {name}")

            return {
                "is_document": True,
                "document_format": "OOXML",
                "has_macros": has_macros,
                "action_indicators": indicators,
            }

        # 3. Legacy OLE Office (.doc, .xls)
        if ext in {'.doc', '.xls'} or raw_bytes.startswith(b'\xd0\xcf\x11\xe0\xa1\xb1\x1a\xe1'):
            if b'VBA' in raw_bytes or b'vbaProject' in raw_bytes or b'AutoOpen' in raw_bytes or b'Shell' in raw_bytes:
                has_macros = True
                indicators.append("VBA / OLE Macro stream indicators detected")

            return {
                "is_document": True,
                "document_format": "OLE",
                "has_macros": has_macros,
                "action_indicators": indicators,
            }

    except Exception as e:
        return {
            "is_document": True,
            "error": f"Error analyzing document structure: {str(e)}"
        }

    return {
        "is_document": True,
        "document_format": "GENERIC",
        "has_macros": False,
        "action_indicators": []
    }
