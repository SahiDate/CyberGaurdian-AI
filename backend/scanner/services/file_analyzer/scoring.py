from typing import Dict, Any, Tuple, List


def calculate_file_threat_score(
    type_info: Dict[str, Any],
    entropy_info: Dict[str, Any],
    yara_info: Dict[str, Any],
    pe_info: Dict[str, Any],
    script_info: Dict[str, Any],
    doc_info: Dict[str, Any],
    archive_info: Dict[str, Any],
    vt_info: Dict[str, Any]
) -> Tuple[int, str, int, Dict[str, Any]]:
    """
    Calculate initial deterministic risk score (0-100), severity, confidence, and correlated evidence.
    
    Severity Thresholds:
    - 0 - 24 : LOW
    - 25 - 49 : MEDIUM
    - 50 - 74 : HIGH
    - 75 - 100 : CRITICAL
    """
    score = 0
    signals: List[str] = []
    evidence_count = 0

    # 1. VirusTotal SHA-256 Reputation Signals
    if vt_info and vt_info.get("status") == "SUCCESS":
        evidence_count += 1
        mal = vt_info.get("malicious", 0)
        susp = vt_info.get("suspicious", 0)

        if mal > 0:
            vt_score = min(70, mal * 12 + susp * 4)
            score += vt_score
            signals.append(f"VirusTotal hash lookup: {mal} security vendors flagged hash as malicious (+{vt_score})")
        elif susp > 0:
            score += 15
            signals.append(f"VirusTotal hash lookup: {susp} vendors flagged hash as suspicious (+15)")
        else:
            signals.append("VirusTotal hash lookup: 0 vendor detections (Clean hash)")

    # 2. YARA Rule Matches
    yara_matches = yara_info.get("matches", []) if yara_info else []
    if yara_matches:
        evidence_count += 1
        yara_score = sum(m.get("score", 15) for m in yara_matches)
        yara_score = min(60, yara_score)
        score += yara_score
        rule_names = ", ".join([m["rule_name"] for m in yara_matches])
        signals.append(f"YARA static analysis matched defensive rules [{rule_names}] (+{yara_score})")

    # 3. File Extension vs Magic Signature Mismatch
    if type_info.get("mismatch_detected"):
        evidence_count += 1
        score += 20
        signals.append(f"File extension mismatch: Declared '{type_info.get('extension')}' but magic signature detected '{type_info.get('detected_type')}' (+20)")

    # 4. Shannon Entropy
    entropy_cat = entropy_info.get("category")
    if entropy_cat == "HIGH":
        evidence_count += 1
        score += 15
        signals.append(f"High Shannon entropy ({entropy_info.get('entropy')}/8.0): Indicates packing, encryption, or compression (+15)")

    # 5. PE Executable Static Analysis
    if pe_info and pe_info.get("is_pe"):
        evidence_count += 1
        if pe_info.get("suspicious_sections"):
            score += 15
            signals.append(f"PE executable contains suspicious sections or RWX memory permissions: {pe_info['suspicious_sections']} (+15)")
        if pe_info.get("suspicious_api_imports"):
            score += 15
            signals.append(f"PE executable imports suspicious Win32 API functions: {pe_info['suspicious_api_imports']} (+15)")
        if not pe_info.get("has_digital_signature"):
            score += 5
            signals.append("PE executable lacks a digital signature (+5)")

    # 6. Script Static Analysis
    if script_info and script_info.get("is_script"):
        evidence_count += 1
        if script_info.get("is_obfuscated"):
            score += 25
            signals.append(f"Script analysis detected obfuscation or dynamic code execution indicators: {script_info.get('indicators')} (+25)")
        elif script_info.get("indicator_count", 0) > 0:
            score += 15
            signals.append(f"Script analysis detected suspicious API/command references: {script_info.get('indicators')} (+15)")

    # 7. Document Static Analysis
    if doc_info and doc_info.get("is_document"):
        evidence_count += 1
        if doc_info.get("has_macros"):
            score += 25
            signals.append("Document contains embedded VBA macros or macro project binary (+25)")
        if doc_info.get("action_indicators"):
            score += 15
            signals.append(f"Document contains embedded auto-launch or external link actions: {doc_info['action_indicators']} (+15)")

    # 8. Archive Static Analysis
    if archive_info and archive_info.get("is_archive"):
        evidence_count += 1
        if archive_info.get("path_traversal_detected"):
            score += 35
            signals.append("Archive contains path traversal filenames (../ or \\..) (+35)")
        if archive_info.get("is_archive_bomb"):
            score += 35
            signals.append("Archive exhibits archive bomb characteristics (excessive compression ratio) (+35)")
        if archive_info.get("suspicious_contained_files"):
            score += 15
            signals.append(f"Archive contains executable payload files: {archive_info['suspicious_contained_files']} (+15)")

    # Normalize Score 0-100
    final_score = min(100, max(0, score))

    # Map Severity
    if final_score >= 75:
        severity = "CRITICAL"
    elif final_score >= 50:
        severity = "HIGH"
    elif final_score >= 25:
        severity = "MEDIUM"
    else:
        severity = "LOW"

    # Calculate Confidence (60% to 95%)
    confidence = min(95, max(60, 60 + (evidence_count * 7)))

    summary = {
        "signals": signals,
        "evidence_source_count": evidence_count,
        "base_risk_components": {
            "vt_malicious": vt_info.get("malicious", 0) if vt_info else 0,
            "yara_matches_count": len(yara_matches),
            "entropy": entropy_info.get("entropy", 0.0),
            "mismatch": type_info.get("mismatch_detected", False)
        }
    }

    return final_score, severity, confidence, summary
