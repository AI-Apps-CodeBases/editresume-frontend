from sqlalchemy.orm import Session
from database import ResumeVersion, Resume, User
from typing import List, Optional, Dict, Any
from datetime import datetime
import json
import secrets

class VersionControlService:
    def __init__(self, db: Session):
        self.db = db
    
    def create_version(
        self, 
        user_id: int, 
        resume_id: int, 
        resume_data: Dict[str, Any], 
        change_summary: str = None,
        is_auto_save: bool = False
    ) -> ResumeVersion:
        """Create a new resume version"""
        
        # Get current version number
        latest_version = self.db.query(ResumeVersion).filter(
            ResumeVersion.resume_id == resume_id
        ).order_by(ResumeVersion.version_number.desc()).first()
        
        version_number = 1
        if latest_version:
            version_number = latest_version.version_number + 1
        
        # Create new version
        version = ResumeVersion(
            resume_id=resume_id,
            user_id=user_id,
            version_number=version_number,
            resume_data=resume_data,
            change_summary=change_summary,
            is_auto_save=is_auto_save
        )
        
        self.db.add(version)
        self.db.commit()
        self.db.refresh(version)
        
        return version
    
    def get_resume_versions(self, resume_id: int, user_id: int) -> List[ResumeVersion]:
        """Get all versions for a resume"""
        return self.db.query(ResumeVersion).filter(
            ResumeVersion.resume_id == resume_id,
            ResumeVersion.user_id == user_id
        ).order_by(ResumeVersion.version_number.desc()).all()
    
    def get_version(self, version_id: int, user_id: int) -> Optional[ResumeVersion]:
        """Get a specific version by ID"""
        return self.db.query(ResumeVersion).filter(
            ResumeVersion.id == version_id,
            ResumeVersion.user_id == user_id
        ).first()
    
    def get_latest_version(self, resume_id: int, user_id: int) -> Optional[ResumeVersion]:
        """Get the latest version of a resume"""
        return self.db.query(ResumeVersion).filter(
            ResumeVersion.resume_id == resume_id,
            ResumeVersion.user_id == user_id
        ).order_by(ResumeVersion.version_number.desc()).first()
    
    def rollback_to_version(self, version_id: int, user_id: int) -> Optional[ResumeVersion]:
        """Rollback to a specific version by creating a new version with that data"""
        version = self.get_version(version_id, user_id)
        if not version:
            return None
        
        # Create new version with the old data
        new_version = self.create_version(
            user_id=user_id,
            resume_id=version.resume_id,
            resume_data=version.resume_data,
            change_summary=f"Rollback to version {version.version_number}",
            is_auto_save=False
        )
        
        return new_version
    
    def delete_version(self, version_id: int, user_id: int) -> bool:
        """Delete a specific version (only if it's not the only version)"""
        version = self.get_version(version_id, user_id)
        if not version:
            return False
        
        # Check if this is the only version
        version_count = self.db.query(ResumeVersion).filter(
            ResumeVersion.resume_id == version.resume_id,
            ResumeVersion.user_id == user_id
        ).count()
        
        if version_count <= 1:
            return False  # Cannot delete the only version
        
        self.db.delete(version)
        self.db.commit()
        return True
    
    def cleanup_old_auto_saves(self, resume_id: int, user_id: int, keep_count: int = 10):
        """Clean up old auto-save versions, keeping only the most recent ones"""
        auto_saves = self.db.query(ResumeVersion).filter(
            ResumeVersion.resume_id == resume_id,
            ResumeVersion.user_id == user_id,
            ResumeVersion.is_auto_save == True
        ).order_by(ResumeVersion.created_at.desc()).all()
        
        if len(auto_saves) > keep_count:
            versions_to_delete = auto_saves[keep_count:]
            for version in versions_to_delete:
                self.db.delete(version)
            self.db.commit()
    
    def compare_versions(self, version1_id: int, version2_id: int, user_id: int) -> Optional[Dict[str, Any]]:
        """Compare two versions and return differences"""
        version1 = self.get_version(version1_id, user_id)
        version2 = self.get_version(version2_id, user_id)
        
        if not version1 or not version2:
            return None
        
        if version1.resume_id != version2.resume_id:
            return None  # Cannot compare versions from different resumes
        
        # Simple comparison logic - can be enhanced
        data1 = version1.resume_data
        data2 = version2.resume_data
        
        differences = {
            "version1": {
                "id": version1.id,
                "version_number": version1.version_number,
                "created_at": version1.created_at.isoformat(),
                "change_summary": version1.change_summary
            },
            "version2": {
                "id": version2.id,
                "version_number": version2.version_number,
                "created_at": version2.created_at.isoformat(),
                "change_summary": version2.change_summary
            },
            "differences": self._find_differences(data1, data2)
        }
        
        return differences
    
    def _find_differences(self, data1: Dict, data2: Dict) -> Dict[str, Any]:
        """Find differences between two resume data objects"""
        differences = {
            "personal_info": {},
            "sections": {},
            "summary": None
        }
        
        # Compare personal info
        personal_info1 = data1.get("personalInfo", {})
        personal_info2 = data2.get("personalInfo", {})
        
        for key in personal_info1:
            if personal_info1.get(key) != personal_info2.get(key):
                differences["personal_info"][key] = {
                    "old": personal_info1.get(key),
                    "new": personal_info2.get(key)
                }
        
        # Compare summary
        if data1.get("summary") != data2.get("summary"):
            differences["summary"] = {
                "old": data1.get("summary"),
                "new": data2.get("summary")
            }
        
        # Compare sections
        sections1 = data1.get("sections", [])
        sections2 = data2.get("sections", [])
        
        # This is a simplified comparison - can be enhanced
        if len(sections1) != len(sections2):
            differences["sections"]["count"] = {
                "old": len(sections1),
                "new": len(sections2)
            }
        
        return differences

