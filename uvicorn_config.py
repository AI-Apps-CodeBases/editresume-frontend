"""Uvicorn configuration to exclude .venv from file watching"""
import uvicorn
import os

if __name__ == "__main__":
    # Get the backend directory
    backend_dir = os.path.dirname(os.path.abspath(__file__))
    venv_path = os.path.join(backend_dir, ".venv")
    
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        reload_exclude=[
            f"{venv_path}/**",
            "**/__pycache__/**",
            "**/*.pyc",
            "**/.venv/**",
        ],
        reload_dirs=[backend_dir],  # Only watch the backend directory
    )

