from pydantic_settings import BaseSettings
from typing import Optional

class Settings(BaseSettings):
    # Google APIs
    GOOGLE_PAGESPEED_API_KEY: Optional[str] = None
    GOOGLE_PLACES_API_KEY: Optional[str] = None
    GOOGLE_SAFE_BROWSING_API_KEY: Optional[str] = None
    GOOGLE_CUSTOM_SEARCH_API_KEY: Optional[str] = None
    GOOGLE_CUSTOM_SEARCH_CX: Optional[str] = None

    # Automation
    MAKE_WEBHOOK_URL: Optional[str] = None

    # Admin
    LOLA_SECRET_ADMIN_KEY: str = "lola-admin-change-me"

    # CORS
    ALLOWED_ORIGINS: str = "*"

    # Notifications
    RESEND_API_KEY: Optional[str] = None
    OWNER_EMAIL: str = "ty@tyalexandermedia.com"

    class Config:
        env_file = ".env"
        extra = "ignore"

settings = Settings()
