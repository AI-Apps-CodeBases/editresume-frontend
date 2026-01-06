"""Shared pytest fixtures for all tests.

Note: Regression tests don't need database or full app, so we keep this minimal.
Integration tests can add their own fixtures.
"""
import os
import sys

# Set environment variable to skip database initialization
# This prevents database connection attempts during test collection
os.environ["SKIP_DB_INIT"] = "1"

# Add backend directory to Python path for imports
backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

import pytest

# Fixtures for integration tests (only loaded when needed)
# Regression tests don't need these, so we don't import app here

