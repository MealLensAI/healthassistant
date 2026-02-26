import os
import sys
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Add backend directory to path
sys.path.append(os.path.join(os.path.dirname(__file__), '..'))

from services.email_service import email_service

def test_email():
    print("Testing email configuration...")
    
    smtp_user = os.environ.get('SMTP_USER')
    smtp_password = os.environ.get('SMTP_PASSWORD')
    
    if not smtp_user or not smtp_password:
        print("❌ SMTP_USER or SMTP_PASSWORD not set in .env file")
        return
    
    print(f"SMTP User: {smtp_user}")
    print(f"SMTP Password: {'*' * len(smtp_password) if smtp_password else 'None'}")
    
    # Use the SMTP user as the recipient for testing
    to_email = smtp_user
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
            print("❌ Failed to send test email. Check server logs for details.")
            
    except Exception as e:
        print(f"❌ Exception occurred: {e}")

if __name__ == "__main__":
    test_email()