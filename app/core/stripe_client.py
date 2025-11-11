from __future__ import annotations

import logging
from functools import lru_cache
from typing import Optional

import stripe

from app.core.config import settings

logger = logging.getLogger(__name__)


@lru_cache
def get_stripe_client() -> Optional[stripe.StripeClient]:
    if not settings.stripe_secret_key:
        logger.warning("Stripe secret key not configured.")
        return None

    stripe.api_key = settings.stripe_secret_key
    return stripe



