import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.database import init_db
from app.routers import calls, health

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("voxora.main")


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Initializing Voxora AI database...")
    init_db()
    logger.info("Voxora AI database initialized successfully.")
    yield
    logger.info("Shutting down Voxora AI...")


app = FastAPI(
    title=settings.APP_NAME,
    description="Autonomous AI Voice Sales Platform. Tagline: Every conversation. More sales intelligence.",
    version=settings.VERSION,
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc"
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routers
app.include_router(health.router)
app.include_router(calls.router)


@app.get("/")
def root():
    return {
        "app": settings.APP_NAME,
        "tagline": settings.APP_TAGLINE,
        "version": settings.VERSION,
        "documentation": "/docs"
    }
