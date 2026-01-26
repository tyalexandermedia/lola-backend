from typing import Optional
from datetime import datetime
from sqlmodel import SQLModel, Field, Session, create_engine
from sqlalchemy.pool import StaticPool

class Lead(SQLModel, table=True):
    __tablename__ = "leads"
    
    id: Optional[int] = Field(default=None, primary_key=True)
    name: str = Field(index=True)
    email: str = Field(index=True)
    website: str
    business_type: str
    location: str
    notes: Optional[str] = None
    audit_json: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)


DATABASE_URL = "sqlite:///./lola.db"

engine = create_engine(
    DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
    echo=False
)


def create_db_and_tables():
    SQLModel.metadata.create_all(engine)


def get_session():
    with Session(engine) as session:
        yield session
