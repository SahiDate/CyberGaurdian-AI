rule Suspicious_Encoded_PowerShell {
    meta:
        description = "Detects base64 encoded PowerShell command execution flags"
        severity = "HIGH"
        score = 25
    strings:
        $ps1 = "-EncodedCommand" nocase
        $ps2 = "-enc " nocase
        $ps3 = "powershell.exe -e" nocase
        $ps4 = "-nop -w hidden" nocase
    condition:
        any of ($ps*)
}

rule Suspicious_PE_Header_Obfuscation {
    meta:
        description = "Detects hidden or non-standard section characteristics in executable"
        severity = "MEDIUM"
        score = 15
    strings:
        $u1 = "UPX0"
        $u2 = "UPX1"
        $v1 = ".vmp0"
        $v2 = ".themida"
    condition:
        any of ($u*, $v*)
}

rule Suspicious_WinAPI_Remote_Injection {
    meta:
        description = "Detects Win32 API functions commonly associated with process injection"
        severity = "HIGH"
        score = 25
    strings:
        $a1 = "VirtualAllocEx" ascii
        $a2 = "WriteProcessMemory" ascii
        $a3 = "CreateRemoteThread" ascii
        $a4 = "NtUnmapViewOfSection" ascii
        $a5 = "URLDownloadToFileA" ascii
        $a6 = "WinExec" ascii
    condition:
        3 of ($a*)
}
