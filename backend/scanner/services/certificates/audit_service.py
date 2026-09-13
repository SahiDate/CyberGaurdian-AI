"""
Certificate Audit Logging Service for CyberGuardian AI.
Records tamper-evident audit events into CertificateAuditLog and bridges
with AdminAuditLog for administrative traceability.
Strictly sanitizes metadata to never expose passwords, tokens, API keys, or raw confidential evidence.
"""
from typing import Optional, Dict, Any
from scanner.models import CertificateAuditLog, Certificate
from users.models import AdminAuditLog


def log_certificate_event(
    event_type: str,
    cert_id: str,
    assessment_id: str = "",
    actor: Any = None,
    actor_type: str = "USER",
    status: str = "SUCCESS",
    ip_address: Optional[str] = None,
    endpoint: str = "",
    request_id: str = "",
    failure_reason: str = "",
    details: Optional[Dict[str, Any]] = None,
    certificate: Optional[Certificate] = None,
    request: Any = None
) -> CertificateAuditLog:
    """
    Persists an immutable audit log entry for certificate lifecycle operations.
    """
    if request:
        if not ip_address:
            ip_address = request.META.get('HTTP_X_FORWARDED_FOR', request.META.get('REMOTE_ADDR'))
        if not endpoint:
            endpoint = request.path

    actor_user = actor if getattr(actor, 'is_authenticated', False) else None
    actor_username = getattr(actor, 'username', '') if actor else ''
    if not actor_username and actor_type == 'PUBLIC':
        actor_username = 'public_visitor'

    # Sanitize details (ensure no keys like password, token, api_key, etc.)
    safe_details = {}
    if details and isinstance(details, dict):
        for k, v in details.items():
            k_lower = str(k).lower()
            if any(forbidden in k_lower for forbidden in ('password', 'token', 'secret', 'key', 'auth', 'cred')):
                continue
            safe_details[k] = str(v) if not isinstance(v, (int, float, bool, list, dict)) else v

    # If certificate instance is not provided but cert_id is known, try to resolve it
    if not certificate and cert_id:
        certificate = Certificate.objects.filter(certificate_id=cert_id).first()

    audit_entry = CertificateAuditLog.objects.create(
        certificate=certificate,
        cert_id=cert_id,
        assessment_id=assessment_id,
        event_type=event_type,
        actor=actor_user,
        actor_username=actor_username,
        actor_type=actor_type,
        status=status,
        ip_address=ip_address,
        endpoint=endpoint,
        request_id=request_id,
        failure_reason=failure_reason[:1000] if failure_reason else "",
        details=safe_details
    )

    # Bridge to AdminAuditLog if actor is an Admin or User for unified administrative timeline
    if actor_user and getattr(actor_user, 'pk', None):
        try:
            AdminAuditLog.objects.create(
                admin=actor_user,
                action=f"CERTIFICATE_{event_type}",
                target_user=actor_user,
                target_record=f"Certificate {cert_id} [{status}]",
                result=status,
                ip_address=ip_address
            )
        except Exception:
            pass

    return audit_entry
