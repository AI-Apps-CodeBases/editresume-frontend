#!/usr/bin/env python3
"""Test script to verify email configuration."""

import os
import sys
from dotenv import load_dotenv

load_dotenv()

from app.services.email_service import send_feedback_notification

def test_email():
    print("=" * 60)
    print("Testing Email Configuration")
    print("=" * 60)
    
    smtp_user = os.getenv("SMTP_USER")
    smtp_password = os.getenv("SMTP_PASSWORD")
    smtp_server = os.getenv("SMTP_SERVER", "smtp.gmail.com")
    smtp_port = os.getenv("SMTP_PORT", "587")
    
    print(f"\n📧 SMTP Configuration:")
    print(f"  Server: {smtp_server}")
    print(f"  Port: {smtp_port}")
    print(f"  User: {smtp_user if smtp_user else '❌ NOT SET'}")
    print(f"  Password: {'✅ SET' if smtp_password else '❌ NOT SET'}")
    print(f"  Admin Email: hasantutacdevops@gmail.com")
    
    if not smtp_user or not smtp_password:
        print("\n❌ ERROR: SMTP credentials not configured!")
        print("\nPlease set the following environment variables:")
        print("  SMTP_USER=your-email@gmail.com")
        print("  SMTP_PASSWORD=your-app-password")
        print("\nOr add them to your .env file in the backend directory.")
        return False
    
    print("\n🚀 Sending test email...")
    
    result = send_feedback_notification(
        feedback_text="This is a test email from the feedback system.",
        category="general",
        rating=5,
        user_email="test@example.com",
        page_url="/test"
    )
    
    if result:
        print("\n✅ SUCCESS: Test email sent!")
        print("Check your inbox at hasantutacdevops@gmail.com")
        return True
    else:
        print("\n❌ FAILED: Could not send test email.")
        print("Check the logs above for error details.")
        return False

if __name__ == "__main__":
    success = test_email()
    sys.exit(0 if success else 1)

