"""
Certificate Eligibility & Generation Service for CyberGuardian AI.
Enforces Final Business Rules:
1. Certificates can ONLY be issued when an assessment has a POSITIVE / SAFE / NO-RISK result.
2. User does NOT need to run all scanners — ANY ONE eligible completed assessment is sufficient.
3. Centralized normalization via ResultNormalizer.
4. Idempotent generation with concurrency locks.
5. Report association and complete audit trail.
"""
import secrets
import datetime
from typing import Dict, Any, Tuple, Optional, List
from django.db import transaction, models
from django.utils import timezone
from django.core.exceptions import PermissionDenied

from scanner.models import (
    Certificate, SecurityReport, SOCAnalysis, ScanResult,
    URLScanResult, SSLScanResult, PortScanResult, WhoisLookupResult,
    ThreatIntelResult, FileAnalysis, Report
)
from .result_normalizer import ResultNormalizer, ASSESSMENT_NAME_MAP, ELIGIBLE_CERTIFICATE_ASSESSMENTS
from .audit_service import log_certificate_event
from .pdf_certificate import PDFCertificateGenerator


class CertificateEligibilityService:
    """
    Validates criteria for certificate issuance across all eligible scanner and SOC modules,
    and generates certificates atomically with strict SAFE / NO-RISK criteria enforcement.
    """

    @classmethod
    def resolve_assessment_entity(
        cls,
        user: Any,
        assessment_ref: Any,
        assessment_type: Optional[str] = None
    ) -> Optional[Any]:
        """
        Resolves an assessment entity from a model instance, report_id, or formatted ID.
        Supports:
          - SecurityReport (instance or report_id like 'RPT-2026-XXXX')
          - ScanResult (instance or ID 'CG-WS-123' / 'ws_123' / 'scan_123')
          - URLScanResult (instance or ID 'CG-URL-123' / 'url_123')
          - SSLScanResult (instance or ID 'CG-SSL-123' / 'ssl_123')
          - PortScanResult (instance or ID 'CG-PORT-123' / 'port_123')
          - WhoisLookupResult (instance or ID 'CG-WHOIS-123' / 'whois_123')
          - ThreatIntelResult (instance or ID 'CG-TI-123' / 'threat_123')
          - FileAnalysis (instance or ID 'CG-FA-123' / 'file_123')
          - SOCAnalysis (instance or ID 'CG-SOC-123' / 'soc_123')
          - Target string fallback (finds most recent completed assessment)
        """
        if assessment_ref is None:
            return None

        # 1. Direct model instances
        supported_types = (
            SecurityReport, ScanResult, URLScanResult, SSLScanResult,
            PortScanResult, WhoisLookupResult, ThreatIntelResult,
            FileAnalysis, SOCAnalysis
        )
        if isinstance(assessment_ref, supported_types):
            return assessment_ref

        ref_str = str(assessment_ref).strip()

        # 2. String / Formatted ID resolution
        if ref_str.startswith('RPT-') or ref_str.startswith('CG-RPT-'):
            return SecurityReport.objects.filter(report_id=ref_str).first()

        if ref_str.startswith(('CG-WS-', 'ws_', 'scan_')):
            raw_id = ref_str.split('-')[-1].split('_')[-1]
            if raw_id.isdigit():
                return ScanResult.objects.filter(id=int(raw_id)).first()

        if ref_str.startswith(('CG-URL-', 'url_')):
            raw_id = ref_str.split('-')[-1].split('_')[-1]
            if raw_id.isdigit():
                return URLScanResult.objects.filter(id=int(raw_id)).first()

        if ref_str.startswith(('CG-SSL-', 'ssl_')):
            raw_id = ref_str.split('-')[-1].split('_')[-1]
            if raw_id.isdigit():
                return SSLScanResult.objects.filter(id=int(raw_id)).first()

        if ref_str.startswith(('CG-PORT-', 'port_')):
            raw_id = ref_str.split('-')[-1].split('_')[-1]
            if raw_id.isdigit():
                return PortScanResult.objects.filter(id=int(raw_id)).first()

        if ref_str.startswith(('CG-WHOIS-', 'whois_')):
            raw_id = ref_str.split('-')[-1].split('_')[-1]
            if raw_id.isdigit():
                return WhoisLookupResult.objects.filter(id=int(raw_id)).first()

        if ref_str.startswith(('CG-TI-', 'threat_')):
            raw_id = ref_str.split('-')[-1].split('_')[-1]
            if raw_id.isdigit():
                return ThreatIntelResult.objects.filter(id=int(raw_id)).first()

        if ref_str.startswith(('CG-FA-', 'file_')):
            raw_id = ref_str.split('-')[-1].split('_')[-1]
            if raw_id.isdigit():
                return FileAnalysis.objects.filter(id=int(raw_id)).first()

        if ref_str.startswith(('CG-SOC-', 'soc_')):
            raw_id = ref_str.split('-')[-1].split('_')[-1]
            if raw_id.isdigit():
                return SOCAnalysis.objects.filter(id=int(raw_id)).first()

        # 3. Numeric ID with explicit assessment_type
        if ref_str.isdigit():
            num_id = int(ref_str)
            type_upper = (assessment_type or '').upper()
            if type_upper in ('WEBSITE_SCAN', 'SCAN_RESULT'):
                return ScanResult.objects.filter(id=num_id).first()
            elif type_upper == 'URL_SCAN':
                return URLScanResult.objects.filter(id=num_id).first()
            elif type_upper == 'SSL_SCAN':
                return SSLScanResult.objects.filter(id=num_id).first()
            elif type_upper in ('PORT_SCAN', 'IP_SCAN'):
                return PortScanResult.objects.filter(id=num_id).first()
            elif type_upper == 'WHOIS_ANALYSIS':
                return WhoisLookupResult.objects.filter(id=num_id).first()
            elif type_upper == 'THREAT_INTELLIGENCE':
                return ThreatIntelResult.objects.filter(id=num_id).first()
            elif type_upper == 'FILE_ANALYSIS':
                return FileAnalysis.objects.filter(id=num_id).first()
            elif type_upper == 'SOC_ANALYSIS':
                return SOCAnalysis.objects.filter(id=num_id).first()
            elif type_upper in ('SECURITY_REPORT', 'REPORT'):
                return SecurityReport.objects.filter(id=num_id).first()

            # Default fallback for numeric ID: check SecurityReport first, then ScanResult, then SOCAnalysis
            rpt = SecurityReport.objects.filter(id=num_id).first()
            if rpt:
                return rpt
            ws = ScanResult.objects.filter(id=num_id).first()
            if ws:
                return ws
            soc = SOCAnalysis.objects.filter(id=num_id).first()
            if soc:
                return soc

        # 4. Target string lookup (domain or URL for user's latest assessment)
        if user and getattr(user, 'is_authenticated', False):
            # Check latest completed SecurityReport
            rpt = SecurityReport.objects.filter(
                user=user, target=ref_str, status__in=['COMPLETED', 'PARTIAL']
            ).order_by('-created_at').first()
            if rpt:
                return rpt

            # Check latest completed ScanResult
            scan = ScanResult.objects.filter(
                user=user, domain=ref_str
            ).order_by('-scanned_at').first()
            if scan:
                return scan

            # Check latest completed SOCAnalysis
            soc = SOCAnalysis.objects.filter(
                user=user, target=ref_str, status='COMPLETED'
            ).order_by('-created_at').first()
            if soc:
                return soc

            # Check latest completed URLScan
            url_scan = URLScanResult.objects.filter(
                user=user, normalized_url=ref_str, status='SUCCESS'
            ).order_by('-created_at').first()
            if url_scan:
                return url_scan

        return None

    @classmethod
    def check_eligibility(
        cls,
        user: Any,
        assessment_ref: Any,
        assessment_type: Optional[str] = None,
        request: Any = None
    ) -> Dict[str, Any]:
        """
        Validates whether the assessment meets all 5 certification criteria:
        1. User Authenticated
        2. Assessment Belongs to Authenticated User
        3. Assessment Completed Cleanly
        4. Assessment Result Met POSITIVE / SAFE / NO-RISK Criteria
        5. Assessment Report Associated
        """
        entity = cls.resolve_assessment_entity(user, assessment_ref, assessment_type)
        norm_data = ResultNormalizer.normalize(entity)

        reqs = [
            {"key": "auth", "label": "User Authenticated", "is_met": False},
            {"key": "ownership", "label": "Assessment Belongs to Authenticated User", "is_met": False},
            {"key": "completion", "label": "Assessment Completed Successfully", "is_met": False},
            {"key": "safe_result", "label": "Assessment Result Meets SAFE / NO-RISK Criteria", "is_met": False},
            {"key": "report", "label": "Security Report Associated with Assessment", "is_met": False},
        ]
        missing = []

        # 1. User Authenticated
        if user and getattr(user, 'is_authenticated', False):
            reqs[0]["is_met"] = True
        else:
            missing.append("User is not authenticated.")

        # 2. Ownership
        if entity:
            entity_user_id = getattr(entity, 'user_id', None)
            if user and entity_user_id == user.id:
                reqs[1]["is_met"] = True
            elif getattr(user, 'role', '') in ('ADMIN', 'SUPER_ADMIN') or getattr(user, 'is_staff', False):
                reqs[1]["is_met"] = True
            else:
                missing.append("Assessment record does not belong to the authenticated user.")
        else:
            missing.append(f"Assessment record '{assessment_ref}' could not be located.")

        # 3. Completion
        if norm_data["is_completed"]:
            reqs[2]["is_met"] = True
        else:
            missing.append(f"Assessment is not complete or encountered an error ({norm_data['reason']}).")

        # 4. SAFE / NO-RISK Criteria (Strict Enforcement)
        if norm_data["is_eligible"]:
            reqs[3]["is_met"] = True
        else:
            missing.append(norm_data["reason"])

        # 5. Report Association (Direct or Synthesized)
        existing_report = None
        if isinstance(entity, SecurityReport):
            existing_report = entity
            reqs[4]["is_met"] = True
        elif entity:
            # Check if an existing report links to this entity or target
            target_str = norm_data["target"]
            existing_report = SecurityReport.objects.filter(
                user=user, target=target_str
            ).order_by('-created_at').first()
            # If not yet generated, it will be automatically created on certificate generation
            reqs[4]["is_met"] = True

        # 6. Existing Certificate Lookup (Prevent duplicates)
        existing_cert = None
        if entity and user and getattr(user, 'is_authenticated', False):
            # Check by specific entity link
            model_name = entity.__class__.__name__
            if model_name == 'SecurityReport':
                existing_cert = Certificate.objects.filter(report=entity, status='VALID').first()
            elif model_name == 'ScanResult':
                existing_cert = Certificate.objects.filter(scan_result=entity, status='VALID').first()
            elif model_name == 'URLScanResult':
                existing_cert = Certificate.objects.filter(url_scan=entity, status='VALID').first()
            elif model_name == 'SSLScanResult':
                existing_cert = Certificate.objects.filter(ssl_scan=entity, status='VALID').first()
            elif model_name == 'PortScanResult':
                existing_cert = Certificate.objects.filter(port_scan=entity, status='VALID').first()
            elif model_name == 'WhoisLookupResult':
                existing_cert = Certificate.objects.filter(whois_lookup=entity, status='VALID').first()
            elif model_name == 'ThreatIntelResult':
                existing_cert = Certificate.objects.filter(threat_intel=entity, status='VALID').first()
            elif model_name == 'FileAnalysis':
                existing_cert = Certificate.objects.filter(file_analysis=entity, status='VALID').first()
            elif model_name == 'SOCAnalysis':
                existing_cert = Certificate.objects.filter(soc_analysis=entity, status='VALID').first()

            if not existing_cert and norm_data["target"]:
                # Check by user + assessment_id
                existing_cert = Certificate.objects.filter(
                    user=user,
                    assessment_id=norm_data["assessment_id"],
                    status='VALID'
                ).first()

        is_eligible = (len(missing) == 0)

        # Audit Event Logging
        log_certificate_event(
            event_type='CERTIFICATE_ELIGIBILITY_CHECKED',
            cert_id=existing_cert.certificate_id if existing_cert else "",
            assessment_id=norm_data["assessment_id"] or str(assessment_ref),
            actor=user,
            actor_type='USER' if getattr(user, 'role', 'USER') == 'USER' else 'ADMIN',
            status='ELIGIBLE' if is_eligible else 'INELIGIBLE',
            details={
                "target": norm_data["target"],
                "assessment_type": norm_data["assessment_type"],
                "normalized_result": norm_data["normalized_result"],
                "risk_level": norm_data["risk_level"],
                "is_eligible": is_eligible,
                "already_issued": existing_cert is not None,
                "missing": missing
            },
            certificate=existing_cert,
            request=request
        )

        return {
            "eligible": is_eligible,
            "is_eligible": is_eligible,
            "already_issued": existing_cert is not None,
            "certificate_id": existing_cert.certificate_id if existing_cert else None,
            "existing_certificate": existing_cert,
            "assessment_type": norm_data["assessment_type"],
            "assessment_name": norm_data["assessment_name"],
            "assessment_id": norm_data["assessment_id"],
            "result": norm_data["normalized_result"],
            "risk_level": norm_data["risk_level"],
            "risk_score": norm_data["risk_score"],
            "target": norm_data["target"],
            "reason": norm_data["reason"],
            "requirements": reqs,
            "missing": missing,
            "report_id": existing_report.report_id if existing_report else None,
            "entity": entity
        }

    @classmethod
    def get_missing_requirements(
        cls,
        user: Any,
        assessment_ref: Any,
        assessment_type: Optional[str] = None
    ) -> Dict[str, Any]:
        """Convenience method returning checklist of requirements."""
        eligibility = cls.check_eligibility(user, assessment_ref, assessment_type)
        return {
            "is_eligible": eligibility["is_eligible"],
            "already_issued": eligibility["already_issued"],
            "certificate_id": eligibility["certificate_id"],
            "requirements": eligibility["requirements"],
            "missing": eligibility["missing"],
            "result": eligibility["result"],
            "risk_level": eligibility["risk_level"],
            "reason": eligibility["reason"]
        }

    @classmethod
    def _generate_unique_certificate_id(cls) -> str:
        """
        Generates sequential certificate identifier in format: CG-CERT-YYYY-XXXXXX.
        Concurrently safe: looks up max sequence for current year.
        """
        current_year = timezone.now().year
        prefix = f"CG-CERT-{current_year}-"

        latest = Certificate.objects.filter(
            certificate_id__startswith=prefix
        ).order_by('-certificate_id').first()

        next_seq = 1
        if latest and latest.certificate_id.startswith(prefix):
            try:
                seq_part = latest.certificate_id[len(prefix):]
                next_seq = int(seq_part) + 1
            except (ValueError, IndexError):
                next_seq = Certificate.objects.filter(certificate_id__startswith=prefix).count() + 1

        return f"{prefix}{next_seq:06d}"

    @classmethod
    def generate_certificate(
        cls,
        user: Any,
        assessment_ref: Any,
        assessment_type: Optional[str] = None,
        request: Any = None
    ) -> Certificate:
        """
        Generates a certificate atomically after verifying strict SAFE / NO-RISK criteria.
        If a certificate already exists, returns it idempotently without creating duplicates.
        """
        log_certificate_event(
            event_type='CERTIFICATE_GENERATION_STARTED',
            cert_id="",
            assessment_id=str(assessment_ref),
            actor=user,
            actor_type='USER' if getattr(user, 'role', 'USER') == 'USER' else 'ADMIN',
            status='STARTED',
            request=request
        )

        with transaction.atomic():
            # 1. Check Eligibility (independent server-side evaluation)
            eligibility = cls.check_eligibility(user, assessment_ref, assessment_type, request=request)

            if eligibility["already_issued"] and eligibility["existing_certificate"]:
                # Idempotent return of existing valid certificate
                return eligibility["existing_certificate"]

            if not eligibility["is_eligible"]:
                reasons = "; ".join(eligibility["missing"]) or eligibility["reason"]
                log_certificate_event(
                    event_type='CERTIFICATE_GENERATION_FAILED',
                    cert_id="",
                    assessment_id=str(assessment_ref),
                    actor=user,
                    actor_type='USER' if getattr(user, 'role', 'USER') == 'USER' else 'ADMIN',
                    status='FAILED',
                    failure_reason=reasons,
                    request=request
                )
                raise ValueError(f"Assessment does not qualify for a certificate: {reasons}")

            entity = eligibility["entity"]
            model_name = entity.__class__.__name__

            # 2. Acquire concurrency lock on entity if supported
            if hasattr(entity, 'id') and hasattr(entity.__class__, 'objects'):
                entity.__class__.objects.select_for_update().filter(id=entity.id).first()

            # 3. Associate or create SecurityReport record
            report = None
            if model_name == 'SecurityReport':
                report = entity
            else:
                # Look for existing report for target
                target_str = eligibility["target"]
                report = SecurityReport.objects.filter(
                    user=user, target=target_str
                ).order_by('-created_at').first()

                if not report:
                    # Create dedicated assessment snapshot report
                    report_id = f"RPT-{timezone.now().year}-{secrets.token_hex(4).upper()}"
                    report = SecurityReport.objects.create(
                        report_id=report_id,
                        user=user,
                        target=target_str,
                        title=f"CyberGuardian {eligibility['assessment_name']} Report",
                        report_type='MODULE_SPECIFIC',
                        status='COMPLETED',
                        risk_score=eligibility["risk_score"] or 0,
                        severity='LOW',
                        confidence=95,
                        threat_level='LOW',
                        summary=f"Automated {eligibility['assessment_name']} completed with a verified SAFE / NO-RISK security posture.",
                        structured_data={
                            "report_id": report_id,
                            "assessment_type": eligibility["assessment_type"],
                            "assessment_id": eligibility["assessment_id"],
                            "target": target_str,
                            "findings": []
                        }
                    )

            # 4. Generate Certificate Identifiers & Metadata
            recipient_name = user.get_full_name().strip() if hasattr(user, 'get_full_name') and user.get_full_name() else user.username
            cert_id = cls._generate_unique_certificate_id()
            verification_token = secrets.token_urlsafe(32)
            verification_url = f"/verify/certificate/{cert_id}"

            meta = {
                "recipient_username": user.username,
                "target": eligibility["target"],
                "assessment_type": eligibility["assessment_type"],
                "assessment_name": eligibility["assessment_name"],
                "assessment_id": eligibility["assessment_id"],
                "result": "SAFE",
                "risk_level": "NO_RISK",
                "risk_score": eligibility["risk_score"],
                "report_id": report.report_id if report else None,
                "issuer": "CyberGuardian AI Automated Security Engine",
                "disclaimer": "This certificate verifies point-in-time automated evaluation criteria; it does not guarantee absolute security."
            }

            # Link FK pointers
            kwargs: Dict[str, Any] = {
                "certificate_id": cert_id,
                "user": user,
                "target": eligibility["target"] or "CyberGuardian Assessment Target",
                "recipient_name": recipient_name,
                "certificate_type": 'CYBERSECURITY_ANALYSIS_COMPLETION',
                "title": 'CyberGuardian AI Cybersecurity Analysis Completion Certificate',
                "assessment_type": eligibility["assessment_type"],
                "assessment_id": eligibility["assessment_id"],
                "result_status": 'SAFE',
                "risk_level": 'NO_RISK',
                "risk_score": eligibility["risk_score"],
                "report": report,
                "status": 'VALID',
                "verification_token": verification_token,
                "verification_url": verification_url,
                "metadata": meta
            }

            if model_name == 'ScanResult':
                kwargs["scan_result"] = entity
            elif model_name == 'URLScanResult':
                kwargs["url_scan"] = entity
            elif model_name == 'SSLScanResult':
                kwargs["ssl_scan"] = entity
            elif model_name == 'PortScanResult':
                kwargs["port_scan"] = entity
            elif model_name == 'WhoisLookupResult':
                kwargs["whois_lookup"] = entity
            elif model_name == 'ThreatIntelResult':
                kwargs["threat_intel"] = entity
            elif model_name == 'FileAnalysis':
                kwargs["file_analysis"] = entity
            elif model_name == 'SOCAnalysis':
                kwargs["soc_analysis"] = entity

            certificate = Certificate.objects.create(**kwargs)

            # 5. Verify PDF generation in-memory
            try:
                PDFCertificateGenerator.generate_certificate_pdf({
                    "certificate_id": cert_id,
                    "recipient_name": recipient_name,
                    "target": eligibility["target"],
                    "assessment_type": eligibility["assessment_type"],
                    "assessment_name": eligibility["assessment_name"],
                    "assessment_id": eligibility["assessment_id"],
                    "result_status": "SAFE / NO RISK",
                    "issue_date": certificate.issue_date.isoformat(),
                    "status": "VALID",
                    "verification_url": verification_url,
                    "metadata": meta
                })
            except Exception as e:
                log_certificate_event(
                    event_type='CERTIFICATE_GENERATION_FAILED',
                    cert_id=cert_id,
                    assessment_id=str(assessment_ref),
                    actor=user,
                    status='FAILED',
                    failure_reason=f"PDF rendering failed: {str(e)}",
                    request=request
                )
                raise ValueError(f"Failed to generate certificate PDF artifact: {str(e)}")

            # 6. Audit Success Event
            log_certificate_event(
                event_type='CERTIFICATE_GENERATED',
                cert_id=cert_id,
                assessment_id=eligibility["assessment_id"],
                actor=user,
                actor_type='USER' if getattr(user, 'role', 'USER') == 'USER' else 'ADMIN',
                status='SUCCESS',
                certificate=certificate,
                details={
                    "recipient_name": recipient_name,
                    "target": eligibility["target"],
                    "certificate_id": cert_id,
                    "assessment_type": eligibility["assessment_type"],
                    "result": "SAFE / NO RISK"
                },
                request=request
            )

            return certificate

    @classmethod
    def list_user_eligible_assessments(cls, user: Any) -> List[Dict[str, Any]]:
        """
        Gathers all recent assessments across all modules for the user,
        normalizes each one, checks if a certificate has already been issued,
        and returns a rich list of assessments with real-time eligibility info.
        """
        if not user or not getattr(user, 'is_authenticated', False):
            return []

        assessments = []

        # 1. Security Reports
        reports = SecurityReport.objects.filter(user=user).order_by('-created_at')[:20]
        for r in reports:
            norm = ResultNormalizer.normalize(r)
            cert = Certificate.objects.filter(report=r, status='VALID').first()
            assessments.append({
                "type": norm["assessment_type"],
                "name": norm["assessment_name"],
                "id": norm["assessment_id"],
                "target": norm["target"],
                "result": norm["normalized_result"],
                "risk_level": norm["risk_level"],
                "risk_score": norm["risk_score"],
                "is_eligible": norm["is_eligible"],
                "reason": norm["reason"],
                "already_certified": cert is not None,
                "certificate_id": cert.certificate_id if cert else None,
                "created_at": r.created_at.isoformat() if hasattr(r, 'created_at') else None
            })

        # 2. Website Scans
        scans = ScanResult.objects.filter(user=user).order_by('-scanned_at')[:20]
        for s in scans:
            norm = ResultNormalizer.normalize(s)
            cert = Certificate.objects.filter(scan_result=s, status='VALID').first()
            assessments.append({
                "type": norm["assessment_type"],
                "name": norm["assessment_name"],
                "id": norm["assessment_id"],
                "target": norm["target"],
                "result": norm["normalized_result"],
                "risk_level": norm["risk_level"],
                "risk_score": norm["risk_score"],
                "is_eligible": norm["is_eligible"],
                "reason": norm["reason"],
                "already_certified": cert is not None,
                "certificate_id": cert.certificate_id if cert else None,
                "created_at": s.scanned_at.isoformat() if hasattr(s, 'scanned_at') else None
            })

        # 3. URL Scans
        url_scans = URLScanResult.objects.filter(user=user).order_by('-created_at')[:15]
        for u in url_scans:
            norm = ResultNormalizer.normalize(u)
            cert = Certificate.objects.filter(url_scan=u, status='VALID').first()
            assessments.append({
                "type": norm["assessment_type"],
                "name": norm["assessment_name"],
                "id": norm["assessment_id"],
                "target": norm["target"],
                "result": norm["normalized_result"],
                "risk_level": norm["risk_level"],
                "risk_score": norm["risk_score"],
                "is_eligible": norm["is_eligible"],
                "reason": norm["reason"],
                "already_certified": cert is not None,
                "certificate_id": cert.certificate_id if cert else None,
                "created_at": u.created_at.isoformat() if hasattr(u, 'created_at') else None
            })

        # 4. SSL Scans
        ssl_scans = SSLScanResult.objects.filter(user=user).order_by('-created_at')[:15]
        for ssl in ssl_scans:
            norm = ResultNormalizer.normalize(ssl)
            cert = Certificate.objects.filter(ssl_scan=ssl, status='VALID').first()
            assessments.append({
                "type": norm["assessment_type"],
                "name": norm["assessment_name"],
                "id": norm["assessment_id"],
                "target": norm["target"],
                "result": norm["normalized_result"],
                "risk_level": norm["risk_level"],
                "risk_score": norm["risk_score"],
                "is_eligible": norm["is_eligible"],
                "reason": norm["reason"],
                "already_certified": cert is not None,
                "certificate_id": cert.certificate_id if cert else None,
                "created_at": ssl.created_at.isoformat() if hasattr(ssl, 'created_at') else None
            })

        # 5. SOC Analyses
        soc_list = SOCAnalysis.objects.filter(user=user).order_by('-created_at')[:15]
        for soc in soc_list:
            norm = ResultNormalizer.normalize(soc)
            cert = Certificate.objects.filter(soc_analysis=soc, status='VALID').first()
            assessments.append({
                "type": norm["assessment_type"],
                "name": norm["assessment_name"],
                "id": norm["assessment_id"],
                "target": norm["target"],
                "result": norm["normalized_result"],
                "risk_level": norm["risk_level"],
                "risk_score": norm["risk_score"],
                "is_eligible": norm["is_eligible"],
                "reason": norm["reason"],
                "already_certified": cert is not None,
                "certificate_id": cert.certificate_id if cert else None,
                "created_at": soc.created_at.isoformat() if hasattr(soc, 'created_at') else None
            })

        # 6. File Analyses
        fa_list = FileAnalysis.objects.filter(user=user).order_by('-created_at')[:15]
        for fa in fa_list:
            norm = ResultNormalizer.normalize(fa)
            cert = Certificate.objects.filter(file_analysis=fa, status='VALID').first()
            assessments.append({
                "type": norm["assessment_type"],
                "name": norm["assessment_name"],
                "id": norm["assessment_id"],
                "target": norm["target"],
                "result": norm["normalized_result"],
                "risk_level": norm["risk_level"],
                "risk_score": norm["risk_score"],
                "is_eligible": norm["is_eligible"],
                "reason": norm["reason"],
                "already_certified": cert is not None,
                "certificate_id": cert.certificate_id if cert else None,
                "created_at": fa.created_at.isoformat() if hasattr(fa, 'created_at') else None
            })

        return assessments
