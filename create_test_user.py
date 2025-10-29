#!/usr/bin/env python3
"""
Script to create a test user for testing the share functionality
"""

from database import get_db, User, Resume, create_tables
from sqlalchemy.orm import Session

def create_test_user():
    """Create a test user and resume for testing"""
    # Create tables if they don't exist
    create_tables()
    
    # Get database session
    db = next(get_db())
    
    try:
        # Check if test user already exists
        test_user = db.query(User).filter(User.email == "test@example.com").first()
        if test_user:
            print(f"Test user already exists with ID: {test_user.id}")
            user_id = test_user.id
        else:
            # Create test user
            test_user = User(
                email="test@example.com",
                name="Test User",
                password="testpassword123",  # Add password
                is_premium=True
            )
            db.add(test_user)
            db.commit()
            db.refresh(test_user)
            print(f"Created test user with ID: {test_user.id}")
            user_id = test_user.id
        
        # Check if test resume already exists
        test_resume = db.query(Resume).filter(
            Resume.user_id == user_id,
            Resume.name == "Test Resume"
        ).first()
        
        if test_resume:
            print(f"Test resume already exists with ID: {test_resume.id}")
        else:
            # Create test resume
            test_resume = Resume(
                user_id=user_id,
                name="Test Resume",
                title="Software Engineer",
                email="test@example.com",
                phone="555-0123",
                location="San Francisco, CA",
                summary="Experienced software engineer with 5+ years of experience",
                template="tech"
            )
            db.add(test_resume)
            db.commit()
            db.refresh(test_resume)
            print(f"Created test resume with ID: {test_resume.id}")
        
        print("Test data created successfully!")
        
    except Exception as e:
        print(f"Error creating test data: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    create_test_user()
