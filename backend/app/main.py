from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes import users, docusign
from app.core.config import get_settings

# load settings (cached)
settings = get_settings()

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
    settings.frontend_url
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=list(set(origins)),
    allow_origin_regex=r"https://.*\.vercel\.app",  # allow preview deployments
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# -------------------------
# Routes
# -------------------------
app.include_router(users.router)
app.include_router(docusign.router)

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