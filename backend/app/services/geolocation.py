"""IP Geolocation service for tracking visitor countries."""

from __future__ import annotations

import logging
from typing import Optional, Dict, Any
import httpx

logger = logging.getLogger(__name__)


class GeolocationService:
    """Service for getting country information from IP address."""
    
    @staticmethod
    async def get_country_from_ip(ip_address: str) -> Optional[Dict[str, Any]]:
        """
        Get country information from IP address using free IP geolocation API.
        
        Args:
            ip_address: The IP address to lookup
            
        Returns:
            Dict with country, country_code, city, region or None if failed
        """
        if not ip_address or ip_address == "127.0.0.1" or ip_address.startswith("192.168."):
            # Local IP, return default
            return {
                "country": "Local",
                "country_code": "LOC",
                "city": "Local",
                "region": "Local"
            }
        
        try:
            # Using ip-api.com (free, no API key required, 45 requests/minute)
            # Alternative: ipapi.co, ipgeolocation.io
            async with httpx.AsyncClient(timeout=5.0) as client:
                response = await client.get(
                    f"http://ip-api.com/json/{ip_address}",
                    params={"fields": "status,country,countryCode,city,region"}
                )
                
                if response.status_code == 200:
                    data = response.json()
                    if data.get("status") == "success":
                        return {
                            "country": data.get("country", "Unknown"),
                            "country_code": data.get("countryCode", "XX"),
                            "city": data.get("city", "Unknown"),
                            "region": data.get("region", "Unknown")
                        }
        except Exception as e:
            logger.warning(f"Failed to get geolocation for IP {ip_address}: {e}")
        
        return None
    
    @staticmethod
    def extract_ip_from_request(request) -> str:
        """
        Extract real IP address from request headers.
        Handles proxies and load balancers.
        """
        # Check common proxy headers
        forwarded_for = request.headers.get("X-Forwarded-For")
        if forwarded_for:
            # Take the first IP (original client)
            return forwarded_for.split(",")[0].strip()
        
        real_ip = request.headers.get("X-Real-IP")
        if real_ip:
            return real_ip.strip()
        
        # Fallback to direct connection IP
        if hasattr(request.client, "host"):
            return request.client.host
        
        return "unknown"

