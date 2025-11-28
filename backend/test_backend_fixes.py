#!/usr/bin/env python3
"""
Test script to verify backend fixes for Vercel/Render deployment
Tests for AttributeError issues with resume_version_id
"""

import sys
import os

# Add parent directory to path for imports
sys.path.insert(0, os.path.dirname(__file__))


def test_imports():
    """Test that all imports work correctly"""
    try:
        from database import MatchSession, ResumeVersion, Resume, JobMatch
        from main import app

        print("✅ All imports successful")
        return True
    except Exception as e:
        print(f"❌ Import error: {e}")
        return False


def test_matchsession_model():
    """Test MatchSession model attributes"""
    try:
        from database import MatchSession

        # Get all attributes of MatchSession
        attrs = [attr for attr in dir(MatchSession) if not attr.startswith("_")]

        # Check required attributes exist
        required_attrs = [
            "id",
            "resume_id",
            "job_description_id",
            "score",
            "keyword_coverage",
            "matched_keywords",
            "missing_keywords",
            "excess_keywords",
            "created_at",
        ]

        missing = [attr for attr in required_attrs if attr not in attrs]
        if missing:
            print(f"❌ Missing attributes in MatchSession: {missing}")
            return False

        # Verify resume_version_id does NOT exist (it's not in the model)
        if "resume_version_id" in attrs:
            print("❌ resume_version_id should not be in MatchSession model")
            return False

        print("✅ MatchSession model validation passed")
        return True
    except Exception as e:
        print(f"❌ MatchSession model test error: {e}")
        return False


def test_jobmatch_model():
    """Test JobMatch model attributes"""
    try:
        from database import JobMatch

        attrs = [attr for attr in dir(JobMatch) if not attr.startswith("_")]

        required_attrs = [
            "id",
            "user_id",
            "resume_id",
            "resume_version_id",
            "job_description",
            "match_score",
            "keyword_matches",
            "missing_keywords",
            "improvement_suggestions",
            "created_at",
        ]

        missing = [attr for attr in required_attrs if attr not in attrs]
        if missing:
            print(f"❌ Missing attributes in JobMatch: {missing}")
            return False

        print("✅ JobMatch model validation passed")
        return True
    except Exception as e:
        print(f"❌ JobMatch model test error: {e}")
        return False


def test_resumeversion_model():
    """Test ResumeVersion model exists and has required attributes"""
    try:
        from database import ResumeVersion

        attrs = [attr for attr in dir(ResumeVersion) if not attr.startswith("_")]

        required_attrs = [
            "id",
            "resume_id",
            "user_id",
            "version_number",
            "resume_data",
            "change_summary",
            "is_auto_save",
            "created_at",
        ]

        missing = [attr for attr in required_attrs if attr not in attrs]
        if missing:
            print(f"❌ Missing attributes in ResumeVersion: {missing}")
            return False

        print("✅ ResumeVersion model validation passed")
        return True
    except Exception as e:
        print(f"❌ ResumeVersion model test error: {e}")
        return False


def test_code_syntax():
    """Test that main.py has valid Python syntax"""
    try:
        import py_compile

        py_compile.compile("main.py", doraise=True)
        print("✅ main.py syntax is valid")
        return True
    except py_compile.PyCompileError as e:
        print(f"❌ Syntax error in main.py: {e}")
        return False
    except Exception as e:
        print(f"❌ Error checking syntax: {e}")
        return False


def main():
    """Run all tests"""
    print("=" * 60)
    print("Backend Fixes Verification Tests")
    print("=" * 60)
    print()

    tests = [
        ("Imports", test_imports),
        ("Code Syntax", test_code_syntax),
        ("MatchSession Model", test_matchsession_model),
        ("JobMatch Model", test_jobmatch_model),
        ("ResumeVersion Model", test_resumeversion_model),
    ]

    results = []
    for test_name, test_func in tests:
        print(f"\nRunning: {test_name}")
        print("-" * 60)
        try:
            result = test_func()
            results.append((test_name, result))
        except Exception as e:
            print(f"❌ Test '{test_name}' failed with exception: {e}")
            results.append((test_name, False))

    print("\n" + "=" * 60)
    print("Test Results Summary")
    print("=" * 60)

    passed = sum(1 for _, result in results if result)
    total = len(results)

    for test_name, result in results:
        status = "✅ PASS" if result else "❌ FAIL"
        print(f"{status}: {test_name}")

    print(f"\nTotal: {passed}/{total} tests passed")

    if passed == total:
        print("\n🎉 All tests passed! Backend is ready for deployment.")
        return 0
    else:
        print("\n⚠️  Some tests failed. Please review the errors above.")
        return 1


if __name__ == "__main__":
    sys.exit(main())
