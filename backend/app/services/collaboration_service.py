"""Collaboration room service for real-time editing."""

from __future__ import annotations

import logging
import secrets
from datetime import datetime
from typing import Dict, List, Optional

from fastapi import WebSocket

logger = logging.getLogger(__name__)


class Comment:
    """Comment model for collaboration."""

    def __init__(self, **kwargs):
        self.id = kwargs.get("id", secrets.token_urlsafe(8))
        self.user_name = kwargs.get("user_name", "")
        self.text = kwargs.get("text", "")
        self.timestamp = kwargs.get("timestamp", datetime.now().isoformat())
        self.target_type = kwargs.get("target_type", "")
        self.target_id = kwargs.get("target_id", "")
        self.resolved = kwargs.get("resolved", False)

    def dict(self):
        return {
            "id": self.id,
            "user_name": self.user_name,
            "text": self.text,
            "timestamp": self.timestamp,
            "target_type": self.target_type,
            "target_id": self.target_id,
            "resolved": self.resolved,
        }


class CollaborationRoom:
    """Manages real-time collaboration rooms."""

    def __init__(self):
        self.rooms: Dict[str, Dict[str, any]] = {}
        self.comments: Dict[str, List[Dict]] = {}

    def create_room(self, room_id: str):
        """Create a new collaboration room."""
        if room_id not in self.rooms:
            self.rooms[room_id] = {
                "connections": {},
                "resume_data": None,
                "last_update": datetime.now().isoformat(),
            }
            self.comments[room_id] = []
            logger.info(f"Created collaboration room: {room_id}")

    def add_connection(
        self, room_id: str, user_id: str, websocket: WebSocket, user_name: str
    ):
        """Add a user connection to a room."""
        self.create_room(room_id)

        if user_id in self.rooms[room_id]["connections"]:
            logger.info(
                f"Replacing existing connection for user {user_name} ({user_id})"
            )

        self.rooms[room_id]["connections"][user_id] = {
            "ws": websocket,
            "name": user_name,
            "joined_at": datetime.now().isoformat(),
        }
        logger.info(f"User {user_name} ({user_id}) joined room {room_id}")

    def remove_connection(self, room_id: str, user_id: str):
        """Remove a user connection from a room."""
        if room_id in self.rooms and user_id in self.rooms[room_id]["connections"]:
            del self.rooms[room_id]["connections"][user_id]
            logger.info(f"User {user_id} left room {room_id}")
            if not self.rooms[room_id]["connections"]:
                del self.rooms[room_id]
                if room_id in self.comments:
                    del self.comments[room_id]
                logger.info(f"Room {room_id} is now empty and removed")

    def get_active_users(self, room_id: str) -> List[Dict]:
        """Get list of active users in a room."""
        if room_id not in self.rooms:
            return []
        return [
            {"user_id": uid, "name": conn["name"], "joined_at": conn["joined_at"]}
            for uid, conn in self.rooms[room_id]["connections"].items()
        ]

    async def broadcast(self, room_id: str, message: dict, exclude_user: str = None):
        """Broadcast a message to all users in a room."""
        if room_id not in self.rooms:
            return

        dead_connections = []
        for user_id, conn in self.rooms[room_id]["connections"].items():
            if exclude_user and user_id == exclude_user:
                continue
            try:
                await conn["ws"].send_json(message)
            except Exception as e:
                logger.error(f"Failed to send to user {user_id}: {e}")
                dead_connections.append(user_id)

        for user_id in dead_connections:
            self.remove_connection(room_id, user_id)

    def add_comment(self, room_id: str, comment: Dict) -> Dict:
        """Add a comment to a room."""
        self.create_room(room_id)
        comment_data = {
            **comment,
            "id": secrets.token_urlsafe(8),
            "timestamp": datetime.now().isoformat(),
        }
        self.comments[room_id].append(comment_data)
        logger.info(f"Added comment in room {room_id}: {comment_data['id']}")
        return comment_data

    def get_comments(self, room_id: str, target_id: Optional[str] = None) -> List[Dict]:
        """Get comments for a room, optionally filtered by target_id."""
        if room_id not in self.comments:
            return []
        comments = self.comments[room_id]
        if target_id:
            return [c for c in comments if c.get("target_id") == target_id]
        return comments

    def resolve_comment(self, room_id: str, comment_id: str):
        """Mark a comment as resolved."""
        if room_id in self.comments:
            for comment in self.comments[room_id]:
                if comment["id"] == comment_id:
                    comment["resolved"] = True
                    logger.info(f"Resolved comment {comment_id} in room {room_id}")
                    return True
        return False

    def delete_comment(self, room_id: str, comment_id: str):
        """Delete a comment from a room."""
        if room_id in self.comments:
            self.comments[room_id] = [
                c for c in self.comments[room_id] if c["id"] != comment_id
            ]
            logger.info(f"Deleted comment {comment_id} from room {room_id}")
            return True
        return False


# Global instance
collab_manager = CollaborationRoom()

