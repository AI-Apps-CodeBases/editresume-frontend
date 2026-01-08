import logging
import os
import smtplib
import ssl
import traceback
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

import requests

logger = logging.getLogger(__name__)

ADMIN_EMAIL = "hasantutacdevops@gmail.com"


def _send_via_sendgrid(
    feedback_text: str,
    category: str,
    rating: int | None = None,
    user_email: str | None = None,
    page_url: str | None = None,
) -> bool:
    sendgrid_api_key = os.getenv("SENDGRID_API_KEY")
    sendgrid_from_email = os.getenv("SENDGRID_FROM_EMAIL", ADMIN_EMAIL)

    if not sendgrid_api_key:
        return False

    rating_text = f"{rating}/5 ⭐" if rating else "Not provided"
    user_text = user_email or "Anonymous"
    page_text = page_url or "Unknown"

    body = f"""
New feedback received on editresume.io

Category: {category.title()}
Rating: {rating_text}
User: {user_text}
Page: {page_text}

Feedback:
{feedback_text}

---
This is an automated notification from editresume.io feedback system.
    """

    try:
        response = requests.post(
            "https://api.sendgrid.com/v3/mail/send",
            headers={
                "Authorization": f"Bearer {sendgrid_api_key}",
                "Content-Type": "application/json"
            },
            json={
                "personalizations": [{
                    "to": [{"email": ADMIN_EMAIL}]
                }],
                "from": {"email": sendgrid_from_email},
                "subject": f"New Feedback: {category.title()} - editresume.io",
                "content": [{
                    "type": "text/plain",
                    "value": body
                }]
            },
            timeout=10
        )

        if response.status_code == 202:
            logger.info(f"✅ Feedback notification email sent via SendGrid to {ADMIN_EMAIL}")
            return True
        else:
            logger.error(f"❌ SendGrid API error: {response.status_code} - {response.text}")
            return False

    except Exception as e:
        logger.error(f"❌ SendGrid request failed: {e}")
        logger.error(traceback.format_exc())
        return False


def send_feedback_notification(
    feedback_text: str,
    category: str,
    rating: int | None = None,
    user_email: str | None = None,
    page_url: str | None = None,
) -> bool:
    sendgrid_api_key = os.getenv("SENDGRID_API_KEY")

    if sendgrid_api_key:
        logger.info("Using SendGrid API for email delivery")
        return _send_via_sendgrid(feedback_text, category, rating, user_email, page_url)

    smtp_server = os.getenv("SMTP_SERVER", "smtp.gmail.com")
    smtp_port = int(os.getenv("SMTP_PORT", "587"))
    smtp_user = os.getenv("SMTP_USER")
    smtp_password = os.getenv("SMTP_PASSWORD")
    use_ssl = os.getenv("SMTP_USE_SSL", "false").lower() == "true"

    logger.info(f"Attempting to send feedback email via SMTP. SMTP_USER configured: {bool(smtp_user)}")

    if not smtp_user or not smtp_password:
        logger.warning(
            f"SMTP credentials not configured. "
            f"SMTP_USER: {'SET' if smtp_user else 'NOT SET'}, "
            f"SMTP_PASSWORD: {'SET' if smtp_password else 'NOT SET'}. "
            f"Email notification skipped."
        )
        return False

    msg = MIMEMultipart()
    msg["From"] = smtp_user
    msg["To"] = ADMIN_EMAIL
    msg["Subject"] = f"New Feedback: {category.title()} - editresume.io"

    rating_text = f"{rating}/5 ⭐" if rating else "Not provided"
    user_text = user_email or "Anonymous"
    page_text = page_url or "Unknown"

    body = f"""
New feedback received on editresume.io

Category: {category.title()}
Rating: {rating_text}
User: {user_text}
Page: {page_text}

Feedback:
{feedback_text}

---
This is an automated notification from editresume.io feedback system.
    """

    msg.attach(MIMEText(body, "plain"))

    try:
        logger.info(f"Connecting to SMTP server: {smtp_server}:{smtp_port} (SSL: {use_ssl})")

        if use_ssl or smtp_port == 465:
            context = ssl.create_default_context()
            with smtplib.SMTP_SSL(smtp_server, smtp_port, context=context) as server:
                logger.info(f"Logging in as: {smtp_user}")
                server.login(smtp_user, smtp_password)
                logger.info("Sending email message...")
                server.send_message(msg)
                logger.info(f"✅ Feedback notification email sent successfully to {ADMIN_EMAIL}")
        else:
            with smtplib.SMTP(smtp_server, smtp_port) as server:
                logger.info("Starting TLS...")
                server.starttls()
                logger.info(f"Logging in as: {smtp_user}")
                server.login(smtp_user, smtp_password)
                logger.info("Sending email message...")
                server.send_message(msg)
                logger.info(f"✅ Feedback notification email sent successfully to {ADMIN_EMAIL}")

        return True

    except OSError as e:
        if "Network is unreachable" in str(e) or "101" in str(e):
            logger.error("❌ Network unreachable - Render is blocking SMTP connections")
            logger.error("💡 Solution: Set SENDGRID_API_KEY environment variable to use SendGrid API instead")
        else:
            logger.error(f"❌ Network error: {e}")
        logger.error(traceback.format_exc())
        return False
    except smtplib.SMTPAuthenticationError as e:
        logger.error(f"❌ SMTP Authentication failed: {e}")
        logger.error("Please check your SMTP_USER and SMTP_PASSWORD (App Password for Gmail)")
        return False
    except smtplib.SMTPException as e:
        logger.error(f"❌ SMTP error occurred: {e}")
        logger.error(traceback.format_exc())
        return False
    except Exception as e:
        logger.error(f"❌ Failed to send feedback notification email: {e}")
        logger.error(f"Error type: {type(e).__name__}")
        logger.error(traceback.format_exc())
        return False

