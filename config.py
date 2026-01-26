from pydantic_settings import BaseSettings
from typing import Optional

class Settings(BaseSettings):
    ALLOWED_ORIGINS: str = "*"
    ADMIN_KEY: str = "change-this-admin-key-in-production"
    SENDGRID_API_KEY: Optional[str] = None
    OWNER_EMAIL: Optional[str] = None
    
    class Config:
        env_file = ".env"
        case_sensitive = True

settings = Settings()
