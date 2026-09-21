import os
import sys
import io
import django

os.environ['USE_SQLITE'] = 'True'
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'cyberguardian.settings')
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

django.setup()

from django.test import Client
from django.contrib.auth import get_user_model
from django.core.files.uploadedfile import SimpleUploadedFile

User = get_user_model()

def run_soc_tests():
    print("=== STARTING SOC LOG ANALYZER COMPREHENSIVE TESTS ===")
    user, _ = User.objects.get_or_create(username="soc_test_user", defaults={"email": "soc@test.com", "role": "USER"})
    user.set_password("SecurePass123!")
    user.save()

    client = Client()
    client.force_login(user)

    # 1. Test Benign .log File Upload
    print("\n1. Testing Benign .log File Upload...")
    benign_content = b"""192.168.1.10 - - [21/Sep/2026:10:00:01 +0000] "GET /index.html HTTP/1.1" 200 4523 "-" "Mozilla/5.0"
192.168.1.10 - - [21/Sep/2026:10:00:05 +0000] "GET /assets/style.css HTTP/1.1" 200 1200 "-" "Mozilla/5.0"
192.168.1.10 - - [21/Sep/2026:10:00:10 +0000] "GET /assets/app.js HTTP/1.1" 200 3400 "-" "Mozilla/5.0"
192.168.1.15 - - [21/Sep/2026:10:01:00 +0000] "GET /about HTTP/1.1" 200 2100 "-" "Mozilla/5.0"
"""
    uploaded_benign = SimpleUploadedFile("access_benign.log", benign_content, content_type="text/plain")
    res1 = client.post('/api/soc/analyze/', {'file': uploaded_benign, 'analysis_type': 'log', 'source': 'user_upload'})
    print(f"Status: {res1.status_code}")
    data1 = res1.json()
    assert res1.status_code == 200, f"Expected 200, got {res1.status_code}: {data1}"
    assert data1["success"] is True
    assert data1["result"] == "SAFE", f"Expected SAFE, got {data1['result']}"
    assert data1["risk_level"] == "NO_RISK"
    assert data1["risk_score"] == 0
    assert data1["certificate_eligible"] is True
    print(f"PASS: Benign log is SAFE, risk_score: 0, certificate_eligible: True, analysis_id: {data1['analysis_id']}")

    # 2. Test Threat Log (Brute Force + Directory Scan)
    print("\n2. Testing Threat Log Upload...")
    threat_content = b"""10.0.0.99 - - [21/Sep/2026:11:00:01 +0000] "POST /wp-login.php HTTP/1.1" 401 512
10.0.0.99 - - [21/Sep/2026:11:00:02 +0000] "POST /wp-login.php HTTP/1.1" 401 512
10.0.0.99 - - [21/Sep/2026:11:00:03 +0000] "POST /wp-login.php HTTP/1.1" 401 512
10.0.0.99 - - [21/Sep/2026:11:00:04 +0000] "POST /wp-login.php HTTP/1.1" 401 512
10.0.0.99 - - [21/Sep/2026:11:00:10 +0000] "GET /.env HTTP/1.1" 404 120
10.0.0.99 - - [21/Sep/2026:11:00:11 +0000] "GET /etc/passwd HTTP/1.1" 404 120
10.0.0.99 - - [21/Sep/2026:11:00:12 +0000] "GET /config.php HTTP/1.1" 404 120
"""
    uploaded_threat = SimpleUploadedFile("auth_threats.log", threat_content, content_type="text/plain")
    res2 = client.post('/api/soc/analyze/', {'file': uploaded_threat, 'analysis_type': 'log', 'source': 'user_upload'})
    data2 = res2.json()
    assert res2.status_code == 200, f"Expected 200, got {res2.status_code}: {data2}"
    assert data2["result"] == "THREAT_DETECTED", f"Expected THREAT_DETECTED, got {data2['result']}"
    assert data2["risk_score"] >= 70, f"Expected elevated risk score, got {data2['risk_score']}"
    assert data2["certificate_eligible"] is False
    assert len(data2["brute_force_ips"]) > 0
    assert len(data2["directory_scans"]) > 0
    print(f"PASS: Threats detected correctly. Risk score: {data2['risk_score']}, certificate_eligible: False")

    # 3. Test Script .bat File (Static Analysis Only, NO EXECUTION)
    print("\n3. Testing .bat Script File Static Security Analysis...")
    bat_content = b"""@echo off
echo Starting system maintenance...
powershell -nop -w hidden -enc JABjAGwAaQBlAG4AdAAgAD0AIABOAGUAdwAtAE8AYgBqAGUAYwB0ACA...
vssadmin delete shadows /all /quiet
net user backdoor P@ssw0rd123! /add
net localgroup administrators backdoor /add
Set-MpPreference -DisableRealtimeMonitoring $true
"""
    uploaded_bat = SimpleUploadedFile("maintenance.bat", bat_content, content_type="application/octet-stream")
    res3 = client.post('/api/soc/analyze/', {'file': uploaded_bat, 'analysis_type': 'log', 'source': 'user_upload'})
    data3 = res3.json()
    assert res3.status_code == 200, f"Expected 200, got {res3.status_code}: {data3}"
    assert data3["result"] == "THREAT_DETECTED"
    assert len(data3["suspicious_commands"]) >= 3, f"Expected at least 3 flagged commands, got {len(data3['suspicious_commands'])}"
    assert data3["certificate_eligible"] is False
    print(f"PASS: Script statically analyzed: {len(data3['suspicious_commands'])} high-severity commands flagged without execution.")

    # 4. Test Binary File Rejection (.exe / .zip / null bytes)
    print("\n4. Testing Binary File Rejection...")
    binary_content = b"MZ\x90\x00\x03\x00\x00\x00\x04\x00\x00\x00\xff\xff\x00\x00This is a fake PE binary"
    uploaded_bin = SimpleUploadedFile("malware.exe", binary_content, content_type="application/x-msdownload")
    res4 = client.post('/api/soc/analyze/', {'file': uploaded_bin, 'analysis_type': 'log', 'source': 'user_upload'})
    data4 = res4.json()
    assert res4.status_code == 415, f"Expected 415, got {res4.status_code}: {data4}"
    assert data4["error"]["code"] == "BINARY_FILE_DETECTED"
    assert data4["suggest_file_analyzer"] is True
    print("PASS: Binary file safely rejected with code BINARY_FILE_DETECTED and suggest_file_analyzer=True.")

    # 5. Test Pasted Raw Logs (via /api/soc/analyze/ JSON)
    print("\n5. Testing Pasted Raw Logs via JSON...")
    pasted_text = """Sep 21 10:22:31 debian sshd[1234]: Failed password for root from 192.168.1.200 port 44322 ssh2
Sep 21 10:22:33 debian sshd[1234]: Failed password for root from 192.168.1.200 port 44324 ssh2
Sep 21 10:22:35 debian sshd[1234]: Failed password for root from 192.168.1.200 port 44326 ssh2
"""
    res5 = client.post('/api/soc/analyze/', {'raw_logs': pasted_text, 'analysis_type': 'log', 'source': 'manual_input'}, content_type='application/json')
    data5 = res5.json()
    assert res5.status_code == 200, f"Expected 200, got {res5.status_code}: {data5}"
    assert data5["result"] == "THREAT_DETECTED"
    assert data5["events_analyzed"] == 3
    print(f"PASS: Pasted raw logs analyzed successfully. Events: {data5['events_analyzed']}, Threat: {data5['result']}")

    # 6. Test /api/analyze-logs/ backwards compatibility
    print("\n6. Testing /api/analyze-logs/ compatibility...")
    res6 = client.post('/api/analyze-logs/', {'log_text': benign_content.decode('utf-8')}, content_type='application/json')
    data6 = res6.json()
    assert res6.status_code == 200
    assert data6["result"] == "SAFE"
    print("PASS: /api/analyze-logs/ works with identical normalized output.")

    # 7. Test Empty Input Handling
    print("\n7. Testing Empty Input...")
    res7 = client.post('/api/soc/analyze/', {'analysis_type': 'log', 'raw_logs': '   '}, content_type='application/json')
    data7 = res7.json()
    assert res7.status_code == 400
    assert data7["error"]["code"] == "EMPTY_LOG_CONTENT"
    print("PASS: Empty input handled safely with 400 error.")

    print("\n=== ALL SOC HARDENING TESTS PASSED SUCCESSFULLY! ===")

if __name__ == "__main__":
    run_soc_tests()
