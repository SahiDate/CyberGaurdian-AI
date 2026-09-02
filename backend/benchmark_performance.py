import os
import sys
import time
import io
import django

# Setup Django environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'cyberguardian.settings')
os.environ.setdefault('USE_SQLITE', 'True')
django.setup()

from django.contrib.auth import get_user_model
from django.core.files.uploadedfile import SimpleUploadedFile
from scanner.services.file_analyzer.service import FileAnalyzerService
from scanner.services.threat_intel.service import ThreatIntelligenceService
from core_engine.log_parser import LogParser
from core_engine.ai_agent import run_autonomous_analysis

User = get_user_model()


def get_or_create_benchmark_user():
    user, _ = User.objects.get_or_create(username='benchmark_user', defaults={'email': 'bench@test.local'})
    return user


def benchmark_file_scanning():
    print("\n" + "="*70)
    print(" 1. BENCHMARK: FILE SCANNING & INTELLIGENT HASH CACHING")
    print("="*70)

    user = get_or_create_benchmark_user()
    service = FileAnalyzerService()

    # Create dummy test files (clean text, executable-like, and script)
    sample_content = b"echo 'CyberGuardian Autonomous Defense System Active'\n" * 500
    file_obj = SimpleUploadedFile("agent_test_script.sh", sample_content, content_type="text/x-sh")

    # 1. Cold Scan (First time analysis - full YARA, entropy, hash computation)
    t0 = time.time()
    record1 = service.analyze_uploaded_file(file_obj, user, bypass_cache=True)
    cold_time = time.time() - t0

    print(f"[*] Cold File Scan Time:       {cold_time*1000:.2f} ms")
    print(f"    - Threat Score:            {record1.threat_score}/100")
    print(f"    - Severity:                {record1.severity}")
    print(f"    - SHA-256:                 {record1.sha256[:16]}...")

    # 2. Warm / Cached Scan (Level 1 Fast SHA-256 Cache Hit)
    file_obj2 = SimpleUploadedFile("agent_test_script.sh", sample_content, content_type="text/x-sh")
    t0 = time.time()
    record2 = service.analyze_uploaded_file(file_obj2, user, bypass_cache=False)
    warm_time = time.time() - t0

    print(f"[*] Cached File Scan Time:     {warm_time*1000:.2f} ms")
    print(f"    - Threat Score:            {record2.threat_score}/100")
    print(f"    - Speedup Factor:          {cold_time / max(warm_time, 0.0001):.1f}x Faster!")

    # 3. Concurrent Multi-File Batch Scan
    batch_files = [
        SimpleUploadedFile(f"batch_sample_{i}.py", f"print('Test script {i}')\nimport os\n".encode('utf-8') * 100)
        for i in range(10)
    ]
    t0 = time.time()
    batch_results = service.analyze_multiple_files(batch_files, user, max_workers=4)
    batch_time = time.time() - t0

    print(f"[*] Batch Scan (10 files):     {batch_time*1000:.2f} ms ({len(batch_results)} files processed concurrently)")
    print(f"    - Throughput:              {len(batch_results) / max(batch_time, 0.001):.1f} files/second")


def benchmark_log_parsing():
    print("\n" + "="*70)
    print(" 2. BENCHMARK: SOC LOG PROCESSING & STREAMING DEDUPLICATION")
    print("="*70)

    # Generate synthetic log datasets:
    # Mix of normal web requests, brute force SSH attempts, and directory scans
    def generate_logs(n_lines):
        lines = []
        for i in range(n_lines):
            mod = i % 10
            if mod == 0:
                lines.append(f'192.168.1.100 - - [10/Oct/2026:13:55:36 +0000] "GET /wp-admin HTTP/1.1" 403 212 "-" "Mozilla/5.0"')
            elif mod == 1:
                lines.append(f'192.168.1.100 - - [10/Oct/2026:13:55:37 +0000] "GET /.env HTTP/1.1" 404 162 "-" "Mozilla/5.0"')
            elif mod == 2:
                lines.append(f'10.0.0.55 - - [10/Oct/2026:13:55:38 +0000] "POST /api/login HTTP/1.1" 401 54 "-" "curl/7.68.0"')
            elif mod == 3:
                lines.append(f'Jul 16 12:34:56 auth-srv sshd[1234]: Failed password for root from 198.51.100.44 port 44212 ssh2')
            else:
                lines.append(f'172.16.0.12 - - [10/Oct/2026:13:55:39 +0000] "GET /index.html HTTP/1.1" 200 4520 "-" "Mozilla/5.0"')
        return "\n".join(lines)

    for count in [100, 1000, 10000]:
        logs = generate_logs(count)
        t0 = time.time()
        parser = LogParser(logs)
        results = parser.parse()
        duration = time.time() - t0

        throughput = count / max(duration, 0.0001)
        print(f"[*] Dataset: {count:>6} lines | Time: {duration*1000:>6.2f} ms | Throughput: {throughput:>9.1f} lines/sec")
        print(f"    - Unique IPs: {results['unique_ips_count']}, Brute Force IPs: {len(results['brute_force_ips'])}, Directory Scans: {len(results['directory_scans'])}")


def benchmark_target_scan():
    print("\n" + "="*70)
    print(" 3. BENCHMARK: CONCURRENT TARGET SECURITY SCANNING")
    print("="*70)

    target = "example.com"
    t0 = time.time()
    results = run_autonomous_analysis(target)
    duration = time.time() - t0

    print(f"[*] Target: {target} | Total Duration: {duration:.2f} s")
    print(f"    - Open Ports:       {results.get('open_ports')}")
    print(f"    - SSL Status:       {results.get('ssl', {}).get('status')}")
    print(f"    - Headers Found:    {len(results.get('security_headers', {}))} security header checks")
    print(f"    - AI Synthesis:     {results.get('ai_analysis', {}).get('severity')} risk")


def main():
    print("\n" + "#"*70)
    print(" CYBERGUARDIAN-AI PERFORMANCE BENCHMARK & VERIFICATION")
    print("#"*70)

    benchmark_file_scanning()
    benchmark_log_parsing()
    benchmark_target_scan()

    print("\n" + "="*70)
    print(" ALL OPTIMIZATION BENCHMARKS COMPLETED SUCCESSFULLY")
    print("="*70 + "\n")


if __name__ == '__main__':
    main()
