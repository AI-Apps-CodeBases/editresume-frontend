"""Uvicorn configuration to exclude .venv from file watching"""
import uvicorn
import os

if __name__ == "__main__":
    # Get the backend directory
    backend_dir = os.path.dirname(os.path.abspath(__file__))
    
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        reload_includes=["*.py"],  # Only watch Python files
        reload_dirs=[os.path.join(backend_dir, "app")],  # Only watch the app directory
    )

