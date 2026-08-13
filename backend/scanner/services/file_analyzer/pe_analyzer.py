import struct
import os
from typing import Dict, Any, List


SUSPICIOUS_WINAPI_FUNCTIONS = [
    'VirtualAlloc', 'VirtualAllocEx', 'VirtualProtect', 'WriteProcessMemory',
    'CreateRemoteThread', 'NtUnmapViewOfSection', 'URLDownloadToFileA',
    'URLDownloadToFileW', 'WinExec', 'ShellExecuteA', 'ShellExecuteW',
    'IsDebuggerPresent', 'CheckRemoteDebuggerPresent', 'SetWindowsHookExA'
]

PACKER_SECTION_NAMES = ['.upx', 'upx0', 'upx1', '.vmp0', '.vmp1', '.themida', '.pack', 'aspack']


def analyze_pe_header(file_path: str) -> Dict[str, Any]:
    """
    Perform safe static analysis on Windows PE executable files (MZ / PE header).
    Does NOT execute the file or load executable code into memory.
    """
    if not os.path.exists(file_path):
        return {"is_pe": False, "error": "File does not exist."}

    with open(file_path, 'rb') as f:
        data = f.read(4096)

    if len(data) < 64 or not data.startswith(b'MZ'):
        return {"is_pe": False, "reason": "Not a Windows Portable Executable (missing MZ signature)."}

    try:
        # e_lfanew offset to PE header is at offset 0x3C (60)
        e_lfanew = struct.unpack('<I', data[60:64])[0]

        if e_lfanew + 24 > len(data) or data[e_lfanew:e_lfanew+4] != b'PE\x00\x00':
            return {"is_pe": False, "reason": "Invalid PE header offset or signature."}

        # PE Header Architecture
        machine_code = struct.unpack('<H', data[e_lfanew+4:e_lfanew+6])[0]
        num_sections = struct.unpack('<H', data[e_lfanew+6:e_lfanew+8])[0]
        time_date_stamp = struct.unpack('<I', data[e_lfanew+8:e_lfanew+12])[0]
        characteristics = struct.unpack('<H', data[e_lfanew+22:e_lfanew+24])[0]

        arch = "x86"
        if machine_code == 0x8664:
            arch = "x64"
        elif machine_code == 0x1c0:
            arch = "ARM"

        # Optional Header Subsystem
        opt_magic = struct.unpack('<H', data[e_lfanew+24:e_lfanew+26])[0]
        is_pe64 = (opt_magic == 0x20b)

        # Inspect Digital Signature Directory entry
        # For PE32, Data Directory is at offset e_lfanew + 24 + 96 + 32 (Security Directory = 5th entry)
        # For PE32+, Data Directory is at offset e_lfanew + 24 + 112 + 32
        data_dir_offset = e_lfanew + 24 + (112 if is_pe64 else 96)
        sec_dir_offset = data_dir_offset + (4 * 8)

        has_digital_signature = False
        signature_status = "NOT_PRESENT"

        if sec_dir_offset + 8 <= len(data):
            sec_va, sec_size = struct.unpack('<II', data[sec_dir_offset:sec_dir_offset+8])
            if sec_size > 0 and sec_va > 0:
                has_digital_signature = True
                signature_status = "PRESENT"

        # Scan section names for known packers or RWX indicators
        section_headers_offset = e_lfanew + 24 + (240 if is_pe64 else 224)
        sections = []
        suspicious_sections = []

        for i in range(min(num_sections, 16)):
            sec_start = section_headers_offset + (i * 40)
            if sec_start + 40 <= len(data):
                sec_name = data[sec_start:sec_start+8].rstrip(b'\x00').decode('utf-8', errors='ignore').strip()
                sec_flags = struct.unpack('<I', data[sec_start+36:sec_start+40])[0]
                
                # Check RWX (IMAGE_SCN_MEM_EXECUTE | IMAGE_SCN_MEM_WRITE = 0x20000000 | 0x80000000)
                is_rwx = (sec_flags & 0x20000000) and (sec_flags & 0x80000000)
                
                sections.append({"name": sec_name, "is_rwx": bool(is_rwx)})
                if any(p in sec_name.lower() for p in PACKER_SECTION_NAMES) or is_rwx:
                    suspicious_sections.append(sec_name)

        # Scan for imported Win32 API names in strings
        imports_found = []
        full_text = data.decode('utf-8', errors='ignore')
        for func in SUSPICIOUS_WINAPI_FUNCTIONS:
            if func in full_text:
                imports_found.append(func)

        return {
            "is_pe": True,
            "architecture": arch,
            "num_sections": num_sections,
            "compile_timestamp": time_date_stamp,
            "has_digital_signature": has_digital_signature,
            "signature_status": signature_status,
            "sections": sections,
            "suspicious_sections": suspicious_sections,
            "suspicious_api_imports": imports_found,
        }
    except Exception as e:
        return {
            "is_pe": True,
            "error": f"Error parsing PE structures: {str(e)}"
        }
