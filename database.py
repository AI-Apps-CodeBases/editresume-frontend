from sqlalchemy import create_engine, Column, Integer, String, Text, DateTime, Boolean, ForeignKey, JSON, Float, text
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, relationship
from datetime import datetime
import os

# Database configuration - PostgreSQL only
DATABASE_URL = os.getenv("DATABASE_URL")

if not DATABASE_URL:
    raise ValueError("DATABASE_URL environment variable is required. Please set it to your PostgreSQL connection string.")

# Fix any ostgresql typos (Render sometimes provides this)
if DATABASE_URL and "ostgresql" in DATABASE_URL and not DATABASE_URL.startswith("postgresql"):
    DATABASE_URL = DATABASE_URL.replace("ostgresql", "postgresql")

# Normalize postgres:// to postgresql:// (common provider format)
if DATABASE_URL and DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

# Ensure we're using PostgreSQL
if not DATABASE_URL.startswith("postgresql"):
    raise ValueError(f"Only PostgreSQL is supported. Invalid DATABASE_URL: {DATABASE_URL[:20]}...")

# Create engine with proper error handling
try:
    engine = create_engine(DATABASE_URL, pool_pre_ping=True, pool_recycle=300)
    print("PostgreSQL database engine created successfully")
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
    match_sessions = relationship("MatchSession", back_populates="resume", cascade="all, delete-orphan")

class JobDescription(Base):
    __tablename__ = "job_descriptions"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    title = Column(String, nullable=False)
    company = Column(String)
    source = Column(String)  # e.g., 'LinkedIn', 'Glassdoor', 'Manual'
    url = Column(String)
    easy_apply_url = Column(String)  # LinkedIn Easy Apply button URL
    location = Column(String)  # Company headquarters location (e.g., "New York, NY", "San Francisco, CA")
    work_type = Column(String)  # Work arrangement: "Remote", "Hybrid", "Onsite"
    job_type = Column(String)  # Employment type: "Full Time", "Contractor", "Part-time", "Internship"
    content = Column(Text, nullable=False)
    extracted_keywords = Column(JSON)  # list of keywords extracted from JD
    priority_keywords = Column(JSON)   # list of must-have/high-priority keywords
    soft_skills = Column(JSON)  # list of soft skills found in JD
    high_frequency_keywords = Column(JSON)  # high-frequency keywords with counts
    ats_insights = Column(JSON)  # ATS-relevant insights (action verbs, metrics, etc.)
    max_salary = Column(Integer)  # Maximum salary for the position
    status = Column(String, default='bookmarked')  # Status: bookmarked, applied, interview_set, interviewing, negotiating, accepted, rejected
    follow_up_date = Column(DateTime)  # Date to follow up on this job
    important_emoji = Column(String)  # Emoji to mark importance (e.g., ⭐, 🔥, 💎)
    notes = Column(Text)  # User notes about this job
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    match_sessions = relationship("MatchSession", back_populates="job_description", cascade="all, delete-orphan")
    user = relationship("User")

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

class SharedResumeComment(Base):
    __tablename__ = "shared_resume_comments"
    
    id = Column(Integer, primary_key=True, index=True)
    shared_resume_id = Column(Integer, ForeignKey("shared_resumes.id"), nullable=False)
    commenter_name = Column(String, nullable=False)
    commenter_email = Column(String)
    text = Column(Text, nullable=False)
    target_type = Column(String, nullable=False)  # 'resume', 'section', 'bullet'
    target_id = Column(String, nullable=False)    # ID of the specific element
    resolved = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    shared_resume = relationship("SharedResume")

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

class MatchSession(Base):
    __tablename__ = "match_sessions"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    resume_id = Column(Integer, ForeignKey("resumes.id"), nullable=False)
    job_description_id = Column(Integer, ForeignKey("job_descriptions.id"), nullable=False)
    score = Column(Integer, nullable=False)  # overall match score 0-100
    keyword_coverage = Column(Float)  # percentage 0-100
    matched_keywords = Column(JSON)   # list of matched keywords
    missing_keywords = Column(JSON)   # list of missing keywords
    excess_keywords = Column(JSON)    # keywords in resume but not in JD (optional)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    user = relationship("User")
    resume = relationship("Resume", back_populates="match_sessions")
    job_description = relationship("JobDescription", back_populates="match_sessions")

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

def migrate_schema():
    """Lightweight, idempotent migrations for production without Alembic.
    Ensures database schema matches current models.
    """
    try:
        backend = engine.url.get_backend_name()
        if backend == 'postgresql':
            with engine.connect() as conn:
                # Check and fix job_descriptions.user_id nullability
                result = conn.execute(text("""
                    SELECT is_nullable FROM information_schema.columns
                    WHERE table_name='job_descriptions' AND column_name='user_id'
                """))
                row = result.fetchone()
                if row and row[0] == 'NO':
                    print('Migrating: dropping NOT NULL on job_descriptions.user_id')
                    conn.execute(text("ALTER TABLE job_descriptions ALTER COLUMN user_id DROP NOT NULL"))
                    conn.commit()
                
                # Check if match_sessions.user_id exists, add it if not
                result = conn.execute(text("""
                    SELECT column_name FROM information_schema.columns
                    WHERE table_name='match_sessions' AND column_name='user_id'
                """))
                row = result.fetchone()
                if not row:
                    print('Migrating: adding user_id column to match_sessions')
                    conn.execute(text("""
                        ALTER TABLE match_sessions 
                        ADD COLUMN user_id INTEGER REFERENCES users(id)
                    """))
                    # Update existing rows with user_id from resume
                    conn.execute(text("""
                        UPDATE match_sessions ms
                        SET user_id = r.user_id
                        FROM resumes r
                        WHERE ms.resume_id = r.id AND ms.user_id IS NULL
                    """))
                    # Make it NOT NULL after backfilling
                    conn.execute(text("ALTER TABLE match_sessions ALTER COLUMN user_id SET NOT NULL"))
                    conn.commit()
                    print('Migrating: match_sessions.user_id column added and backfilled')
                
                # Check if easy_apply_url column exists in job_descriptions
                result = conn.execute(text("""
                    SELECT column_name FROM information_schema.columns
                    WHERE table_name='job_descriptions' AND column_name='easy_apply_url'
                """))
                row = result.fetchone()
                if not row:
                    print('Migrating: adding easy_apply_url column to job_descriptions')
                    conn.execute(text("ALTER TABLE job_descriptions ADD COLUMN easy_apply_url TEXT"))
                    conn.commit()
                    print('Migrating: easy_apply_url column added')
                
                # Check if location column exists in job_descriptions
                result = conn.execute(text("""
                    SELECT column_name FROM information_schema.columns
                    WHERE table_name='job_descriptions' AND column_name='location'
                """))
                row = result.fetchone()
                if not row:
                    print('Migrating: adding location column to job_descriptions')
                    conn.execute(text("ALTER TABLE job_descriptions ADD COLUMN location VARCHAR"))
                    conn.commit()
                    print('Migrating: location column added')
                
                # Check if work_type column exists
                result = conn.execute(text("""
                    SELECT column_name FROM information_schema.columns
                    WHERE table_name='job_descriptions' AND column_name='work_type'
                """))
                row = result.fetchone()
                if not row:
                    print('Migrating: adding work_type column to job_descriptions')
                    conn.execute(text("ALTER TABLE job_descriptions ADD COLUMN work_type VARCHAR"))
                    conn.commit()
                    print('Migrating: work_type column added')
                
                # Check if job_type column exists
                result = conn.execute(text("""
                    SELECT column_name FROM information_schema.columns
                    WHERE table_name='job_descriptions' AND column_name='job_type'
                """))
                row = result.fetchone()
                if not row:
                    print('Migrating: adding job_type column to job_descriptions')
                    conn.execute(text("ALTER TABLE job_descriptions ADD COLUMN job_type VARCHAR"))
                    conn.commit()
                    print('Migrating: job_type column added')
                
                # Check if soft_skills column exists
                result = conn.execute(text("""
                    SELECT column_name FROM information_schema.columns
                    WHERE table_name='job_descriptions' AND column_name='soft_skills'
                """))
                row = result.fetchone()
                if not row:
                    print('Migrating: adding soft_skills column to job_descriptions')
                    conn.execute(text("ALTER TABLE job_descriptions ADD COLUMN soft_skills JSON"))
                    conn.commit()
                    print('Migrating: soft_skills column added')
                
                # Check if high_frequency_keywords column exists
                result = conn.execute(text("""
                    SELECT column_name FROM information_schema.columns
                    WHERE table_name='job_descriptions' AND column_name='high_frequency_keywords'
                """))
                row = result.fetchone()
                if not row:
                    print('Migrating: adding high_frequency_keywords column to job_descriptions')
                    conn.execute(text("ALTER TABLE job_descriptions ADD COLUMN high_frequency_keywords JSON"))
                    conn.commit()
                    print('Migrating: high_frequency_keywords column added')
                
                # Check if ats_insights column exists
                result = conn.execute(text("""
                    SELECT column_name FROM information_schema.columns
                    WHERE table_name='job_descriptions' AND column_name='ats_insights'
                """))
                row = result.fetchone()
                if not row:
                    print('Migrating: adding ats_insights column to job_descriptions')
                    conn.execute(text("ALTER TABLE job_descriptions ADD COLUMN ats_insights JSON"))
                    conn.commit()
                    print('Migrating: ats_insights column added')
    except Exception as e:
        print(f"Schema migration check failed (non-fatal): {e}")

