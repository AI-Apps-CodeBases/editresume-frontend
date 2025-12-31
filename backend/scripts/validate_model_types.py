"""Validate that API models match frontend expectations and have consistent types."""
import sys
import os
from pathlib import Path
from typing import Any, Dict, Optional, get_args, get_origin

# Add backend directory to path
backend_dir = Path(__file__).parent.parent
sys.path.insert(0, str(backend_dir))

try:
    from app.api.models import Section, BulletParam
except ImportError as e:
    print(f"❌ Could not import models: {e}")
    print(f"   Make sure you're running from the backend directory: {backend_dir}")
    sys.exit(1)


def get_dict_value_type(annotation):
    """Extract the value type from a Dict annotation."""
    origin = get_origin(annotation)
    if origin is dict or origin is Dict:
        args = get_args(annotation)
        if len(args) >= 2:
            return args[1]  # Value type
    return None


def validate_params_types():
    """Ensure Section and BulletParam params types are consistent and accept Any."""
    section_params = Section.__fields__['params']
    bullet_params = BulletParam.__fields__['params']
    
    section_type = section_params.type_
    bullet_type = bullet_params.type_
    
    section_value_type = get_dict_value_type(section_type)
    bullet_value_type = get_dict_value_type(bullet_type)
    
    # Check if both use Any
    if section_value_type is not Any:
        print(f"❌ Section.params should be Dict[str, Any], but got Dict[str, {section_value_type}]")
        return False
    
    if bullet_value_type is not Any:
        print(f"❌ BulletParam.params should be Dict[str, Any], but got Dict[str, {bullet_value_type}]")
        print("   This will reject boolean values (visible: true/false) from frontend!")
        return False
    
    if section_value_type != bullet_value_type:
        print(f"❌ Type mismatch: Section.params values are {section_value_type}, "
              f"but BulletParam.params values are {bullet_value_type}")
        return False
    
    print("✓ Model params types are consistent (both use Dict[str, Any])")
    return True


def validate_models_accept_booleans():
    """Test that models can actually accept boolean values in params."""
    try:
        # Test BulletParam with boolean
        bullet = BulletParam(
            id="1",
            text="Test",
            params={"visible": False}
        )
        assert bullet.params["visible"] is False
        
        bullet2 = BulletParam(
            id="2",
            text="Test",
            params={"visible": True}
        )
        assert bullet2.params["visible"] is True
        
        # Test Section with boolean
        section = Section(
            id="1",
            title="Test",
            bullets=[],
            params={"visible": False}
        )
        assert section.params["visible"] is False
        
        print("✓ Models accept boolean values in params")
        return True
    except Exception as e:
        print(f"❌ Models cannot accept boolean values: {e}")
        return False


def main():
    """Run all validations."""
    print("Validating API model types...")
    print("-" * 50)
    
    success = True
    success &= validate_params_types()
    success &= validate_models_accept_booleans()
    
    print("-" * 50)
    if success:
        print("✅ All validations passed!")
        return 0
    else:
        print("❌ Validation failed! Fix the issues above.")
        return 1


if __name__ == "__main__":
    sys.exit(main())

