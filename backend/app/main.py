from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.sessions import SessionMiddleware

from app.api.routes import users, docusign, quickbooks
from app.core.config import get_settings
from app.core.logging_config import configure_logging

# load settings (cached)
settings = get_settings()
configure_logging()

# create app
app = FastAPI(
    title="GBR Backend",
    description="Backend API for GBR project",
    version="1.0.0",
)

# -------------------------
# CORS configuration
# -------------------------
origins = [
    settings.frontend_url,
    "https://episode-villain-cider.ngrok-free.dev"
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=list(set(origins)),
    allow_origin_regex=r"https://.*\.vercel\.app",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"]
)

# session middleware for QuickBooks OAUTH
# app.add_middleware(
#     SessionMiddleware,
#     secret_key="replace-this-with-a-real-secret",
# )

# -------------------------
# Routes
# -------------------------
app.include_router(users.router)
app.include_router(docusign.router)
app.include_router(quickbooks.router)

# -------------------------
# Health check
# -------------------------
@app.get("/health")
def health():
    return {"status": "ok"}

# -------------------------
# Root endpoint
# -------------------------
@app.get("/")
def root():
    return {
        "message": "GBR backend is running",
        "docs": "/docs",
    }

# -------------------------
# Local development entrypoint
# -------------------------
if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "app.main:app",
        host="127.0.0.1",
        port=8000,
        reload=True,
    )
