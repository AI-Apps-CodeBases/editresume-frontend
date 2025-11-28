"""Uvicorn configuration to exclude .venv from file watching"""
import uvicorn
import os

if __name__ == "__main__":
    backend_dir = os.path.dirname(os.path.abspath(__file__))
    
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        reload_includes=["*.py"],
        reload_dirs=[os.path.join(backend_dir, "app")],
        reload_excludes=[
            "**/.venv/**",
            "**/venv/**",
            "**/__pycache__/**",
            "**/*.pyc",
            "**/node_modules/**",
            "**/.git/**",
            "**/site-packages/**",
        ],
    )

