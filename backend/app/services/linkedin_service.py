"""LinkedIn API service for OAuth and profile data."""

from __future__ import annotations

import logging
from typing import Dict, Optional

import httpx

from app.core.config import settings

logger = logging.getLogger(__name__)


class LinkedInService:
    """Service for interacting with LinkedIn API."""

    OAUTH_BASE_URL = "https://www.linkedin.com/oauth/v2"
    API_BASE_URL = "https://api.linkedin.com/v2"

    def __init__(self):
        self.client_id = settings.linkedin_client_id
        self.client_secret = settings.linkedin_client_secret
        self.redirect_uri = settings.linkedin_redirect_uri

    def get_authorization_url(self, state: str) -> str:
        """Generate LinkedIn OAuth authorization URL."""
        scopes = [
            "openid",
            "profile",
            "email",
            "w_member_social",
        ]
        scope_string = " ".join(scopes)

        params = {
            "response_type": "code",
            "client_id": self.client_id,
            "redirect_uri": self.redirect_uri,
            "state": state,
            "scope": scope_string,
        }

        query_string = "&".join([f"{k}={v}" for k, v in params.items()])
        return f"{self.OAUTH_BASE_URL}/authorization?{query_string}"

    async def exchange_code_for_token(self, code: str) -> Dict[str, any]:
        """Exchange authorization code for access token."""
        token_url = f"{self.OAUTH_BASE_URL}/accessToken"

        data = {
            "grant_type": "authorization_code",
            "code": code,
            "redirect_uri": self.redirect_uri,
            "client_id": self.client_id,
            "client_secret": self.client_secret,
        }

        async with httpx.AsyncClient() as client:
            response = await client.post(
                token_url,
                data=data,
                headers={"Content-Type": "application/x-www-form-urlencoded"},
            )
            response.raise_for_status()
            return response.json()

    async def get_user_profile(self, access_token: str) -> Dict[str, any]:
        """Fetch user profile from LinkedIn."""
        headers = {"Authorization": f"Bearer {access_token}"}

        async with httpx.AsyncClient() as client:
            try:
                profile_response = await client.get(
                    f"{self.API_BASE_URL}/userinfo",
                    headers=headers,
                )
                profile_response.raise_for_status()
                profile_data = profile_response.json()
            except Exception as e:
                logger.warning(f"Failed to fetch userinfo: {e}")
                profile_data = {}

            try:
                person_response = await client.get(
                    f"{self.API_BASE_URL}/me",
                    headers=headers,
                    params={"projection": "(id,firstName,lastName)"},
                )
                person_data = person_response.json() if person_response.status_code == 200 else {}
            except Exception as e:
                logger.warning(f"Failed to fetch person data: {e}")
                person_data = {}

            try:
                positions_response = await client.get(
                    f"{self.API_BASE_URL}/me",
                    headers=headers,
                    params={"projection": "(positions)"},
                )
                positions_data = positions_response.json() if positions_response.status_code == 200 else {}
            except Exception as e:
                logger.warning(f"Failed to fetch positions: {e}")
                positions_data = {}

            try:
                education_response = await client.get(
                    f"{self.API_BASE_URL}/me",
                    headers=headers,
                    params={"projection": "(educations)"},
                )
                education_data = education_response.json() if education_response.status_code == 200 else {}
            except Exception as e:
                logger.warning(f"Failed to fetch education: {e}")
                education_data = {}

            return {
                "profile": profile_data,
                "person": person_data,
                "positions": positions_data.get("positions", {}),
                "education": education_data.get("educations", {}),
            }

    async def get_person_id(self, access_token: str) -> str:
        """Get person ID from access token."""
        headers = {"Authorization": f"Bearer {access_token}"}
        async with httpx.AsyncClient() as client:
            try:
                response = await client.get(
                    f"{self.API_BASE_URL}/me",
                    headers=headers,
                    params={"projection": "(id)"},
                )
                response.raise_for_status()
                data = response.json()
                return data.get("id", "")
            except Exception as e:
                logger.error(f"Failed to get person ID: {e}")
                return ""

    async def share_to_linkedin(
        self, access_token: str, text: str, share_url: Optional[str] = None
    ) -> Dict[str, any]:
        """Share content to LinkedIn feed."""
        person_id = await self.get_person_id(access_token)
        if not person_id:
            raise ValueError("Could not retrieve person ID")

        headers = {
            "Authorization": f"Bearer {access_token}",
            "Content-Type": "application/json",
            "X-Restli-Protocol-Version": "2.0.0",
        }

        share_data = {
            "author": f"urn:li:person:{person_id}",
            "lifecycleState": "PUBLISHED",
            "specificContent": {
                "com.linkedin.ugc.ShareContent": {
                    "shareCommentary": {"text": text},
                    "shareMediaCategory": "ARTICLE" if share_url else "NONE",
                }
            },
        }

        if share_url:
            share_data["specificContent"]["com.linkedin.ugc.ShareContent"][
                "media"
            ] = [
                {
                    "status": "READY",
                    "description": {"text": text[:200]},
                    "media": share_url,
                    "title": {"text": "View Resume"},
                }
            ]

        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{self.API_BASE_URL}/ugcPosts",
                json=share_data,
                headers=headers,
            )
            response.raise_for_status()
            return response.json()


linkedin_service = LinkedInService()

