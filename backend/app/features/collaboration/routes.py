"""Collaboration Feature - handles real-time collaboration, comments, and WebSocket connections.

This module contains all collaboration-related endpoints extracted from app/api/collaboration.py
for better feature isolation and organization.
"""

from __future__ import annotations

import logging
import secrets

from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from pydantic import BaseModel

from app.services.collaboration_service import collab_manager

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/collab", tags=["collaboration"])


class Comment(BaseModel):
    id: str
    user_name: str
    text: str
    timestamp: str
    target_type: str
    target_id: str
    resolved: bool = False


@router.get("/room/create")
async def create_collab_room():
    """Create a new collaboration room"""
    room_id = secrets.token_urlsafe(8)
    collab_manager.create_room(room_id)
    return {"room_id": room_id, "url": f"/editor?room={room_id}"}


@router.get("/room/{room_id}/users")
async def get_room_users(room_id: str):
    """Get active users in a collaboration room"""
    users = collab_manager.get_active_users(room_id)
    return {"room_id": room_id, "users": users, "count": len(users)}


@router.get("/room/{room_id}/comments")
async def get_room_comments(room_id: str, target_id: str = None):
    """Get comments for a collaboration room"""
    comments = collab_manager.get_comments(room_id, target_id)
    return {"room_id": room_id, "comments": comments, "count": len(comments)}


@router.post("/room/{room_id}/comments")
async def add_comment(room_id: str, comment: Comment):
    """Add a comment to a collaboration room"""
    comment_data = collab_manager.add_comment(room_id, comment.dict())
    return {"success": True, "comment": comment_data}


@router.post("/room/{room_id}/comments/{comment_id}/resolve")
async def resolve_comment_endpoint(room_id: str, comment_id: str):
    """Resolve a comment in a collaboration room"""
    success = collab_manager.resolve_comment(room_id, comment_id)
    return {"success": success}


@router.delete("/room/{room_id}/comments/{comment_id}")
async def delete_comment_endpoint(room_id: str, comment_id: str):
    """Delete a comment from a collaboration room"""
    success = collab_manager.delete_comment(room_id, comment_id)
    return {"success": success}


# WebSocket endpoint - registered separately in main.py due to different prefix
async def websocket_collab(websocket: WebSocket, room_id: str):
    """WebSocket endpoint for real-time collaboration"""
    await websocket.accept()

    try:
        from datetime import datetime

        init_msg = await websocket.receive_json()
        user_id = init_msg.get("user_id", secrets.token_urlsafe(6))
        user_name = init_msg.get("user_name", "Anonymous")

        collab_manager.add_connection(room_id, user_id, websocket, user_name)

        active_users = collab_manager.get_active_users(room_id)
        await collab_manager.broadcast(
            room_id,
            {
                "type": "user_joined",
                "user_id": user_id,
                "user_name": user_name,
                "active_users": active_users,
            },
        )

        while True:
            data = await websocket.receive_json()
            message_type = data.get("type")

            if message_type == "resume_update":
                await collab_manager.broadcast(
                    room_id,
                    {
                        "type": "resume_update",
                        "user_id": user_id,
                        "user_name": user_name,
                        "data": data.get("data"),
                        "timestamp": datetime.now().isoformat(),
                    },
                    exclude_user=user_id,
                )

            elif message_type == "cursor_position":
                await collab_manager.broadcast(
                    room_id,
                    {
                        "type": "cursor_position",
                        "user_id": user_id,
                        "user_name": user_name,
                        "position": data.get("position"),
                    },
                    exclude_user=user_id,
                )

            elif message_type == "ping":
                await websocket.send_json({"type": "pong"})

            elif message_type == "add_comment":
                comment = collab_manager.add_comment(
                    room_id,
                    {
                        "user_name": user_name,
                        "text": data.get("text"),
                        "target_type": data.get("target_type"),
                        "target_id": data.get("target_id"),
                        "resolved": False,
                    },
                )
                await collab_manager.broadcast(
                    room_id, {"type": "comment_added", "comment": comment}
                )

            elif message_type == "resolve_comment":
                comment_id = data.get("comment_id")
                collab_manager.resolve_comment(room_id, comment_id)
                await collab_manager.broadcast(
                    room_id, {"type": "comment_resolved", "comment_id": comment_id}
                )

            elif message_type == "delete_comment":
                comment_id = data.get("comment_id")
                collab_manager.delete_comment(room_id, comment_id)
                await collab_manager.broadcast(
                    room_id, {"type": "comment_deleted", "comment_id": comment_id}
                )

    except WebSocketDisconnect:
        logger.info(f"WebSocket disconnected for user {user_id}")
        collab_manager.remove_connection(room_id, user_id)
        active_users = collab_manager.get_active_users(room_id)
        await collab_manager.broadcast(
            room_id,
            {
                "type": "user_left",
                "user_id": user_id,
                "user_name": user_name,
                "active_users": active_users,
            },
        )
    except Exception as e:
        logger.error(f"WebSocket error for user {user_id}: {e}")
        collab_manager.remove_connection(room_id, user_id)
        active_users = collab_manager.get_active_users(room_id)
        await collab_manager.broadcast(
            room_id,
            {
                "type": "user_left",
                "user_id": user_id,
                "user_name": user_name,
                "active_users": active_users,
            },
        )
