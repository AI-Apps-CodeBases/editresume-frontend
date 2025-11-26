import smtplib
import os
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from typing import Optional
import logging

logger = logging.getLogger(__name__)

ADMIN_EMAIL = "hasantutacdevaops@gmail.com"


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

        if not smtp_user or not smtp_password:
            logger.warning("SMTP credentials not configured. Email notification skipped.")
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

        with smtplib.SMTP(smtp_server, smtp_port) as server:
            server.starttls()
            server.login(smtp_user, smtp_password)
            server.send_message(msg)

        logger.info(f"Feedback notification email sent to {ADMIN_EMAIL}")
        return True

    except Exception as e:
        logger.error(f"Failed to send feedback notification email: {e}")
        return False

