from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import get_settings
from app.routers import feedback, incidents, messages

settings = get_settings()

app = FastAPI(title="ServiceNow-Style Support Agent Training Simulator")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(incidents.router)
app.include_router(messages.router)
app.include_router(feedback.router)


@app.get("/health")
def health():
    return {"status": "ok", "demo_mode": settings.demo_mode}
