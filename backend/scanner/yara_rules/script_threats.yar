rule WebShell_Backdoor_Indicators {
    meta:
        description = "Detects web shell backdoor command execution patterns"
        severity = "HIGH"
        score = 30
    strings:
        $w1 = "c99shell" nocase
        $w2 = "r57shell" nocase
        $w3 = "eval(base64_decode" nocase
        $w4 = "passthru($_POST" nocase
        $w5 = "system($_GET" nocase
        $w6 = "WScript.Shell" nocase
        $w7 = "cmd.exe /c" nocase
    condition:
        2 of ($w*)
}

rule Suspicious_JS_Obfuscation {
    meta:
        description = "Detects heavy JavaScript string obfuscation and eval execution"
        severity = "MEDIUM"
        score = 15
    strings:
        $js1 = "eval(function(p,a,c,k,e,r)" ascii
        $js2 = "unescape('%" ascii
        $js3 = "String.fromCharCode(" ascii
        $js4 = "\\x75\\x73\\x65\\x72" ascii
    condition:
        2 of ($js*)
}
