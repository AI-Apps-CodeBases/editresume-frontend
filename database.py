from sqlalchemy import create_engine, Column, Integer, String, Text, DateTime, Boolean, ForeignKey, JSON
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, relationship
from datetime import datetime
import os

# Database configuration
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./editresume.db")

# Fix any ostgresql typos (Render sometimes provides this)
if DATABASE_URL and "ostgresql" in DATABASE_URL and not DATABASE_URL.startswith("postgresql"):
    DATABASE_URL = DATABASE_URL.replace("ostgresql", "postgresql")

# Normalize postgres:// to postgresql:// (common provider format)
if DATABASE_URL and DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

# Create engine with proper error handling
try:
    if DATABASE_URL.startswith("sqlite"):
        engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
    else:
        engine = create_engine(DATABASE_URL, pool_pre_ping=True, pool_recycle=300)
    print("Database engine created successfully")
except Exception as e:
    print(f"Error creating database engine: {e}")
    raise

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    name = Column(String, nullable=False)
    password = Column(String, nullable=False)
    is_premium = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    resumes = relationship("Resume", back_populates="user")
    resume_versions = relationship("ResumeVersion", back_populates="user")
    export_analytics = relationship("ExportAnalytics", back_populates="user")
    job_matches = relationship("JobMatch", back_populates="user")
    shared_resumes = relationship("SharedResume", back_populates="user")

class Resume(Base):
    __tablename__ = "resumes"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    name = Column(String, nullable=False)
    title = Column(String)
    email = Column(String)
    phone = Column(String)
    location = Column(String)
    summary = Column(Text)
    template = Column(String, default="tech")
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    user = relationship("User", back_populates="resumes")
    versions = relationship("ResumeVersion", back_populates="resume", cascade="all, delete-orphan")
    exports = relationship("ExportAnalytics", back_populates="resume", cascade="all, delete-orphan")
    shared_resumes = relationship("SharedResume", back_populates="resume")

class ResumeVersion(Base):
    __tablename__ = "resume_versions"
    
    id = Column(Integer, primary_key=True, index=True)
    resume_id = Column(Integer, ForeignKey("resumes.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    version_number = Column(Integer, nullable=False)
    resume_data = Column(JSON, nullable=False)  # Complete resume data snapshot
    change_summary = Column(Text)  # Description of changes made
    is_auto_save = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    resume = relationship("Resume", back_populates="versions")
    user = relationship("User", back_populates="resume_versions")

class ExportAnalytics(Base):
    __tablename__ = "export_analytics"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    resume_id = Column(Integer, ForeignKey("resumes.id"), nullable=True)
    export_format = Column(String, nullable=False)  # 'pdf' or 'docx'
    template_used = Column(String)
    file_size = Column(Integer)
    export_success = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    user = relationship("User", back_populates="export_analytics")
    resume = relationship("Resume", back_populates="exports")

class SharedResume(Base):
    __tablename__ = "shared_resumes"
    
    id = Column(Integer, primary_key=True, index=True)
    resume_id = Column(Integer, ForeignKey("resumes.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    share_token = Column(String, unique=True, index=True, nullable=False)
    is_active = Column(Boolean, default=True)
    password_protected = Column(Boolean, default=False)
    password_hash = Column(String)
    expires_at = Column(DateTime)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    resume = relationship("Resume", back_populates="shared_resumes")
    user = relationship("User", back_populates="shared_resumes")
    views = relationship("ResumeView", back_populates="shared_resume", cascade="all, delete-orphan")

class ResumeView(Base):
    __tablename__ = "resume_views"
    
    id = Column(Integer, primary_key=True, index=True)
    shared_resume_id = Column(Integer, ForeignKey("shared_resumes.id"), nullable=False)
    viewer_ip = Column(String)
    viewer_user_agent = Column(String)
    referrer = Column(String)
    country = Column(String)
    city = Column(String)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    shared_resume = relationship("SharedResume", back_populates="views")

class JobMatch(Base):
    __tablename__ = "job_matches"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    resume_id = Column(Integer, ForeignKey("resumes.id"), nullable=True)
    resume_version_id = Column(Integer, ForeignKey("resume_versions.id"), nullable=True)
    job_description = Column(Text, nullable=False)
    match_score = Column(Integer, nullable=False)  # 0-100
    keyword_matches = Column(JSON)  # List of matched keywords
    missing_keywords = Column(JSON)  # List of missing keywords
    improvement_suggestions = Column(JSON)  # List of suggestions
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    user = relationship("User", back_populates="job_matches")

# Create all tables
def create_tables():
    try:
        Base.metadata.create_all(bind=engine)
        print("Database tables created successfully")
    except Exception as e:
        print(f"Error creating database tables: {e}")
        raise

# Dependency to get database session
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

