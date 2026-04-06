import smtplib
from email.message import EmailMessage

from app.core.config import get_settings  # adjust import path if needed


class EmailSendError(Exception):
    """Raised when sending an email fails."""


def send_email(to_email: str, subject: str, body: str) -> None:
    """
    Send a plain-text email using SMTP credentials from Settings.
    """

    settings = get_settings()

    message = EmailMessage()
    message["Subject"] = subject
    message["From"] = settings.smtp_from_email
    message["To"] = to_email
    message.set_content(body)

    try:
        with smtplib.SMTP(settings.smtp_host, settings.smtp_port) as server:
            server.starttls()
            server.login(settings.smtp_username, settings.smtp_password)
            server.send_message(message)
    except Exception as e:
        raise EmailSendError(f"Failed to send email: {str(e)}") from e


def send_account_created_email(
    *,
    to_email: str,
    first_name: str,
    last_name: str,
    role: str,
    confirmation_link: str,
) -> None:
    full_name = f"{first_name} {last_name}".strip()

    subject = "Confirm your account"
    body = f"""
Hello {full_name},

An account has been created for you.

Account details:
- Email: {to_email}
- Role: {role}

Please confirm your email and complete your account setup here:
{confirmation_link}

If you did not expect this email, you can ignore it.

Best regards,
Your Team
""".strip()

    send_email(
        to_email=to_email,
        subject=subject,
        body=body,
    )