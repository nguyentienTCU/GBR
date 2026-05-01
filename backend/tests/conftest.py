import os
import sys
from pathlib import Path


BACKEND_ROOT = Path(__file__).resolve().parents[1]
if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))


def pytest_configure():
    defaults = {
        "SUPABASE_URL": "https://example.supabase.co",
        "SUPABASE_ANON_KEY": "anon-key",
        "SUPABASE_SERVICE_ROLE_KEY": "service-role-key",
        "DOCUSIGN_INTEGRATION_KEY": "integration-key",
        "DOCUSIGN_USER_ID": "docusign-user-id",
        "DOCUSIGN_ACCOUNT_ID": "docusign-account-id",
        "DOCUSIGN_PRIVATE_KEY_PATH": str(BACKEND_ROOT / "tests" / "fixtures" / "docusign-private-key.fixture"),
        "DOCUSIGN_OAUTH_BASE_PATH": "account-d.docusign.com",
        "DOCUSIGN_REDIRECT_URI": "http://localhost:8000/docusign/callback",
        "DOCUSIGN_BUYER_TEMPLATE_ID": "buyer-template-id",
        "DOCUSIGN_SELLER_TEMPLATE_ID": "seller-template-id",
        "QBO_SCOPES": "com.intuit.quickbooks.accounting",
        "QBO_AUTH_BASE": "https://appcenter.intuit.com/connect/oauth2",
        "QBO_TOKEN_URL": "https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer",
        "QBO_BASE_URL": "https://sandbox-quickbooks.api.intuit.com/v3",
        "QBO_CLIENT_ID": "qbo-client-id",
        "QBO_REDIRECT_URI": "http://localhost:8000/quickbooks/callback",
        "QBO_CLIENT_SECRET": "qbo-client-secret",
        "QBO_ENV": "sandbox",
        "QBO_REALM_ID": "realm-id",
        "QBO_INCOME_ACCOUNT_ID": "income-account-id",
        "QBO_WEBHOOK_VERIFIER_TOKEN": "verifier-token",
        "SMTP_HOST": "smtp.example.com",
        "SMTP_PORT": "587",
        "SMTP_USERNAME": "smtp-user",
        "SMTP_PASSWORD": "smtp-pass",
        "SMTP_FROM_EMAIL": "noreply@example.com",
        "FRONTEND_URL": "http://localhost:3000",
        "S3_CONTRACT_BUCKET": "contract-bucket",
        "S3_CONTRACT_ENV": "local",
        "AWS_REGION": "us-east-1",
    }
    for key, value in defaults.items():
        os.environ.setdefault(key, value)
