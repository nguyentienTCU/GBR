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
DOCUSIGN_REDIRECT_URI=http://localhost:8000/docusign/callback
```

Notes:

- `DOCUSIGN_REDIRECT_URI` should match the callback URI configured in DocuSign.
- `DOCUSIGN_PRIVATE_KEY_PATH` must point to a local `.pem` file.

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

## Quick Checks

- `GET /` should return a running message.
- `GET /docusign/auth/test` should return a token preview if DocuSign JWT setup is correct.
- If `/docusign/auth/test` returns `DocuSign JWT consent is required for this user.`, complete the consent step above.

## Auth Notes

- User routes expect a Supabase bearer token in the `Authorization` header.
- Admin-only routes require the application user profile role to be `admin`.
