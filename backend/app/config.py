import os
from pathlib import Path
from typing import List, Optional
from pydantic_settings import BaseSettings

from dotenv import load_dotenv
load_dotenv(Path(__file__).resolve().parent.parent.parent / ".env")  # project-root .env
# Base directories
BASE_DIR = Path(__file__).resolve().parent.parent
RECORDINGS_DIR = BASE_DIR / "recordings"
RECORDINGS_DIR.mkdir(parents=True, exist_ok=True)


class Settings(BaseSettings):
    APP_NAME: str = "Voxora AI"
    APP_TAGLINE: str = "Every conversation. More sales intelligence."
    VERSION: str = "1.0.0"
    VOXORA_ENV: str = os.getenv("VOXORA_ENV", "development")
    
    # Database: SQLite for zero-config local dev, Supabase PostgreSQL for production
    DATABASE_URL: str = os.getenv("DATABASE_URL", f"sqlite:///{BASE_DIR}/voxora.db")
    
    # Supabase Cloud Storage & Database
    SUPABASE_URL: Optional[str] = os.getenv("SUPABASE_URL", None)
    SUPABASE_PUBLISHABLE_KEY: Optional[str] = os.getenv("SUPABASE_PUBLISHABLE_KEY", None)
    SUPABASE_SECRET_KEY: Optional[str] = os.getenv("SUPABASE_SECRET_KEY", None)
    SUPABASE_STORAGE_BUCKET: str = os.getenv("SUPABASE_STORAGE_BUCKET", "call-recordings")
    
    # LLM Settings (Groq priority with active model, OpenAI fallback)
    GROQ_API_KEY: str = os.getenv("GROQ_API_KEY", "")
    GROQ_MODEL: str = os.getenv("GROQ_MODEL", "qwen/qwen3.8-27b")
    
    OPENAI_API_KEY: str = os.getenv("OPENAI_API_KEY", "")
    OPENAI_MODEL: str = os.getenv("OPENAI_MODEL", "gpt-4o-mini")
    
    LLM_PROVIDER: str = os.getenv("LLM_PROVIDER", "auto")
    
    # Storage settings
    STORAGE_DIR: str = str(RECORDINGS_DIR)
    MAX_UPLOAD_SIZE_MB: int = int(os.getenv("MAX_UPLOAD_SIZE_MB", "50"))
    
    # CORS
    CORS_ORIGINS: List[str] = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:8000",
        "http://127.0.0.1:8000",
        "https://vercel.app",
        "https://vercel.app"
    ]
    
    # Voice & Language
    DEFAULT_LANGUAGE: str = "en"
    
    def get_normalized_database_url(self) -> str:
        """Handle Supabase / Heroku postgres:// -> postgresql:// conversion"""
        url = self.DATABASE_URL
        if url.startswith("postgres://"):
            url = url.replace("postgres://", "postgresql://", 1)
        return url


settings = Settings()
