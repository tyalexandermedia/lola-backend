import ssl
import socket
import asyncio
from datetime import datetime
from urllib.parse import urlparse


async def check_ssl(url: str) -> dict:
    """Check SSL certificate validity using Python's built-in ssl library. No API needed."""
    fallback = {"ok": False, "has_https": False, "cert_valid": False, "cert_days_remaining": None, "error": None}
    try:
        parsed = urlparse(url)
        hostname = parsed.netloc or parsed.path
        hostname = hostname.split(":")[0]  # strip port
        has_https = url.lower().startswith("https://")
        fallback["has_https"] = has_https

        if not has_https:
            return {**fallback, "ok": True, "error": "Site does not use HTTPS"}

        def _check():
            ctx = ssl.create_default_context()
            with ctx.wrap_socket(socket.socket(), server_hostname=hostname) as s:
                s.settimeout(6)
                s.connect((hostname, 443))
                cert = s.getpeercert()
                return cert

        loop = asyncio.get_event_loop()
        cert = await asyncio.wait_for(loop.run_in_executor(None, _check), timeout=7)

        not_after_str = cert.get("notAfter", "")
        if not_after_str:
            not_after = datetime.strptime(not_after_str, "%b %d %H:%M:%S %Y %Z")
            days_remaining = (not_after - datetime.utcnow()).days
        else:
            days_remaining = None

        return {
            "ok": True,
            "has_https": True,
            "cert_valid": True,
            "cert_days_remaining": days_remaining,
            "error": None,
        }
    except ssl.SSLCertVerificationError as e:
        return {**fallback, "has_https": True, "cert_valid": False, "error": str(e)}
    except Exception as e:
        return {**fallback, "error": str(e)}
