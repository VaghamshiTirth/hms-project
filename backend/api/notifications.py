import base64
import json
import os
from datetime import datetime, timezone
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode
from urllib.request import Request, urlopen


OUTBOX_PATH = Path(__file__).resolve().parents[1] / "sms_outbox.log"


def _format_to_number(mobile_number):
    digits = "".join(char for char in str(mobile_number or "") if char.isdigit())
    if digits.startswith("91") and len(digits) == 12:
        return f"+{digits}"
    if len(digits) == 10:
        return f"+91{digits}"
    if digits:
        return f"+{digits}"
    return ""


def _write_to_outbox(payload):
    OUTBOX_PATH.parent.mkdir(parents=True, exist_ok=True)
    with OUTBOX_PATH.open("a", encoding="utf-8") as outbox:
        outbox.write(json.dumps(payload, ensure_ascii=True) + "\n")


def _send_via_twilio(to_number, message, from_number, account_sid, auth_token):
    request_data = urlencode(
        {
            "To": to_number,
            "From": from_number,
            "Body": message,
        }
    ).encode()
    request = Request(
        f"https://api.twilio.com/2010-04-01/Accounts/{account_sid}/Messages.json",
        data=request_data,
    )
    token = base64.b64encode(f"{account_sid}:{auth_token}".encode()).decode()
    request.add_header("Authorization", f"Basic {token}")
    request.add_header("Content-Type", "application/x-www-form-urlencoded")
    with urlopen(request, timeout=15) as response:
        return response.status


def _build_payload(channel, mobile_number, message):
    return {
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "channel": channel,
        "mobile_number": mobile_number,
        "message": message,
    }


def send_sms_message(mobile_number, message):
    payload = _build_payload("sms", mobile_number, message)

    account_sid = os.getenv("TWILIO_ACCOUNT_SID")
    auth_token = os.getenv("TWILIO_AUTH_TOKEN")
    from_number = os.getenv("TWILIO_FROM_NUMBER")

    if account_sid and auth_token and from_number:
        to_number = _format_to_number(mobile_number)
        try:
            response_code = _send_via_twilio(to_number, message, from_number, account_sid, auth_token)
            payload["provider"] = "twilio"
            payload["status"] = "sent"
            payload["response_code"] = response_code
            _write_to_outbox(payload)
            return {"status": "sent", "provider": "twilio"}
        except (HTTPError, URLError, TimeoutError, ValueError) as exc:
            payload["provider"] = "local"
            payload["status"] = "logged"
            payload["error"] = str(exc)
            _write_to_outbox(payload)
            return {"status": "logged", "provider": "local", "detail": str(exc)}

    payload["provider"] = "local"
    payload["status"] = "logged"
    payload["detail"] = "SMS provider not configured."
    _write_to_outbox(payload)
    return {"status": "logged", "provider": "local", "detail": "SMS provider not configured."}


def send_whatsapp_message(mobile_number, message):
    payload = _build_payload("whatsapp", mobile_number, message)

    account_sid = os.getenv("TWILIO_ACCOUNT_SID")
    auth_token = os.getenv("TWILIO_AUTH_TOKEN")
    from_number = os.getenv("TWILIO_WHATSAPP_FROM")

    if account_sid and auth_token and from_number:
        to_number = _format_to_number(mobile_number)
        try:
            response_code = _send_via_twilio(f"whatsapp:{to_number}", message, from_number, account_sid, auth_token)
            payload["provider"] = "twilio"
            payload["status"] = "sent"
            payload["response_code"] = response_code
            _write_to_outbox(payload)
            return {"status": "sent", "provider": "twilio"}
        except (HTTPError, URLError, TimeoutError, ValueError) as exc:
            payload["provider"] = "local"
            payload["status"] = "logged"
            payload["error"] = str(exc)
            _write_to_outbox(payload)
            return {"status": "logged", "provider": "local", "detail": str(exc)}

    payload = {
        **payload,
        "provider": "local",
        "status": "logged",
        "detail": "WhatsApp provider not configured.",
    }
    _write_to_outbox(payload)
    return {"status": "logged", "provider": "local", "detail": "WhatsApp provider not configured."}
