# GBR Backend

FastAPI backend for the GBR onboarding portal.

## Prerequisites

- Python 3.11+
- `pip`
- A Supabase project
- A DocuSign developer app configured for JWT auth

## Install

```bash
python -m venv venv
```

Windows PowerShell:

```powershell
.\venv\Scripts\Activate.ps1
make install
```

This installs the runtime dependencies and the backend test runner from
`requirements.txt`.

## Environment

Create a `.env` file in the backend root:

```env
SUPABASE_URL=
SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

DOCUSIGN_INTEGRATION_KEY=
DOCUSIGN_USER_ID=
DOCUSIGN_ACCOUNT_ID=
DOCUSIGN_BASE_PATH=https://demo.docusign.net/restapi
DOCUSIGN_AUTH_SERVER=account-d.docusign.com
DOCUSIGN_PRIVATE_KEY_PATH=
DOCUSIGN_OAUTH_BASE_PATH=account-d.docusign.com
DOCUSIGN_REDIRECT_URI=http://localhost:8000/docusign/callback
DOCUSIGN_BUYER_TEMPLATE_ID=
DOCUSIGN_SELLER_TEMPLATE_ID=

SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USERNAME=
SMTP_PASSWORD=
SMTP_FROM_EMAIL=

FRONTEND_URL=http://localhost:3000

QBO_CLIENT_ID=
QBO_CLIENT_SECRET=
QBO_REDIRECT_URI=http://localhost:8000/quickbooks/callback
QBO_SCOPES=com.intuit.quickbooks.accounting
QBO_ENV=sandbox
QBO_REALM_ID=
QBO_AUTH_BASE=https://appcenter.intuit.com/connect/oauth2
QBO_TOKEN_URL=https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer
QBO_BASE_URL=https://sandbox-quickbooks.api.intuit.com/v3
QBO_INCOME_ACCOUNT_ID=
QBO_WEBHOOK_VERIFIER_TOKEN=

S3_CONTRACT_BUCKET=
S3_CONTRACT_ENV=local
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
```

Notes:

- `DOCUSIGN_REDIRECT_URI` should match the callback URI configured in DocuSign.
- `DOCUSIGN_PRIVATE_KEY_PATH` must point to a local `.pem` file.
- Keep real API keys, service role keys, SMTP passwords, and client secrets out of
  tracked files. Store them only in your local `.env` or in your deployment/CI
  secret store.

## DocuSign Setup

1. In the DocuSign developer account, create or open your app/integration.
2. Enable JWT authentication for the app.
3. Add this redirect URI if you are running locally:

```text
http://localhost:8000/docusign/callback
```

4. Generate an RSA keypair in DocuSign and download the private key.
5. Save the private key in this project as a PEM file, for example:

```text
backend\certs\docusign-private-key.pem
```

6. Set `DOCUSIGN_PRIVATE_KEY_PATH` to that file path. Example:

```env
DOCUSIGN_PRIVATE_KEY_PATH=certs/docusign-private-key.pem
```

7. Copy these values from DocuSign into `.env`:
- `DOCUSIGN_INTEGRATION_KEY`: API Account / Integration Key
- `DOCUSIGN_USER_ID`: the DocuSign user GUID used for impersonation
- `DOCUSIGN_ACCOUNT_ID`: the target DocuSign account ID

8. Grant consent for JWT impersonation for the user tied to `DOCUSIGN_USER_ID`. Use this format in the browser:

```text
https://account-d.docusign.com/oauth/auth?response_type=code&scope=signature%20impersonation&client_id=YOUR_INTEGRATION_KEY&redirect_uri=http://localhost:8000/docusign/callback
```

Replace `YOUR_INTEGRATION_KEY` with your app's integration key, then sign in and accept consent.

## Run

```powershell
make dev
```

App URLs:

- API: `http://127.0.0.1:8000`
- Swagger docs: `http://127.0.0.1:8000/docs`

## Tests

Backend unit tests live in `tests/` and are run with pytest:

```powershell
python -m pytest
```

The pytest configuration is in `pytest.ini`. It limits test discovery to the
`tests/` directory and disables pytest's cache provider to avoid local
workspace cache permission issues.

The service-layer tests use fake repositories and API clients, so they do not
call Supabase, QuickBooks, DocuSign, or SMTP. Test-only environment defaults
are set in `tests/conftest.py` so the app settings can load during imports.

CI runs the same command in the backend job after installing dependencies and
import-checking the FastAPI application.

## Quick Checks

- `GET /` should return a running message.
- `GET /docusign/auth/test` should return a token preview if DocuSign JWT setup is correct.
- If `/docusign/auth/test` returns `DocuSign JWT consent is required for this user.`, complete the consent step above.

## Auth Notes

- User routes expect a Supabase bearer token in the `Authorization` header.
- Admin-only routes require the application user profile role to be `admin`.
