import smtplib
import os
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from typing import Optional
import logging
import traceback

logger = logging.getLogger(__name__)

ADMIN_EMAIL = "hasantutacdevops@gmail.com"


def send_feedback_notification(
    feedback_text: str,
    category: str,
    rating: Optional[int] = None,
    user_email: Optional[str] = None,
    page_url: Optional[str] = None,
) -> bool:
    try:
        smtp_server = os.getenv("SMTP_SERVER", "smtp.gmail.com")
        smtp_port = int(os.getenv("SMTP_PORT", "587"))
        smtp_user = os.getenv("SMTP_USER")
        smtp_password = os.getenv("SMTP_PASSWORD")

        logger.info(f"Attempting to send feedback email. SMTP_USER configured: {bool(smtp_user)}")
        
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

        logger.info(f"Connecting to SMTP server: {smtp_server}:{smtp_port}")
        with smtplib.SMTP(smtp_server, smtp_port) as server:
            logger.info("Starting TLS...")
            server.starttls()
            logger.info(f"Logging in as: {smtp_user}")
            server.login(smtp_user, smtp_password)
            logger.info("Sending email message...")
            server.send_message(msg)
            logger.info(f"✅ Feedback notification email sent successfully to {ADMIN_EMAIL}")

        return True

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

