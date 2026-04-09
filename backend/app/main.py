from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from app.api.routes import users
from app.api.routes import docusign

# create app
app = FastAPI(
    title="GBR Backend",
    description="Backend API for GBR project",
    version="1.0.0"
)

# -------------------------
# CORS (used for frontend)
# -------------------------
origins = [
    "http://localhost:3000",  # React / Next.js (decide later)
    "http://localhost:3000/*", # allow all subpaths
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,   # allow frontend
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(users.router)
app.include_router(docusign.router)

# -------------------------
# Root endpoint
# -------------------------
@app.get("/")
def root():
    return {
        "message": "GBR backend is running",
        "docs": "/docs"
    }

# run this file will run the entire project
if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="127.0.0.1", port=8000, reload=True)
