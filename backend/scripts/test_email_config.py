import os
import sys
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Add backend directory to path
sys.path.append(os.path.join(os.path.dirname(__file__), '..'))

from services.email_service import email_service

def test_email():
    print("Testing Resend email configuration...")

    api_key = os.environ.get('RESEND_API_KEY')
    from_email = os.environ.get('FROM_EMAIL') or os.environ.get('RESEND_FROM_EMAIL')

    if not api_key or not from_email:
        print("❌ RESEND_API_KEY or FROM_EMAIL not set in .env file")
        return

    print(f"Resend API key: {'SET' if api_key else 'NOT SET'}")
    print(f"From email: {from_email}")

    to_email = os.environ.get('TEST_EMAIL', from_email)
    print(f"Sending test email to {to_email}...")

    try:
        success = email_service.send_meal_cooked_confirmation_email(
            to_email=to_email,
            user_name="Test User",
            meal_type="breakfast",
            meal_name="Test Pancakes"
        )

        if success:
            print("✅ Test email sent successfully!")
        else:
            print(f"❌ Failed to send test email: {email_service.last_error_message}")

    except Exception as e:
        print(f"❌ Exception occurred: {e}")

if __name__ == "__main__":
    test_email()
