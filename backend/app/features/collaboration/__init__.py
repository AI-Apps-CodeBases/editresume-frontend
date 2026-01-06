"""Collaboration Feature - handles real-time collaboration, comments, and WebSocket connections."""

from app.features.collaboration.routes import router, websocket_collab

__all__ = ["router", "websocket_collab"]

