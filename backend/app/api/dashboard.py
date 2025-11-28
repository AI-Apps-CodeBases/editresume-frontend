"""Dashboard API endpoints - Real data from PostgreSQL."""

from __future__ import annotations

import logging
from datetime import datetime, timedelta
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func, extract
from sqlalchemy.orm import Session

from app.core.db import get_db
from app.core.security import get_current_user_token
from app.core.firebase_admin import verify_id_token
from app.models import User, Resume, ResumeVersion, ExportAnalytics

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/dashboard", tags=["dashboard"])


def verify_admin_token(token: str = Depends(get_current_user_token)) -> dict:
    """Verify token and check if user is admin (for now, just verify token)"""
    decoded_token = verify_id_token(token)
    if not decoded_token:
        raise HTTPException(status_code=401, detail="Invalid token")
    return decoded_token


@router.get("/stats")
async def get_dashboard_stats(
    db: Session = Depends(get_db),
    token: dict = Depends(verify_admin_token),
):
    """Get dashboard statistics from PostgreSQL"""
    try:
        # Total users
        total_users = db.query(func.count(User.id)).scalar() or 0
        
        # Total subscriptions (premium users)
        total_subscriptions = db.query(func.count(User.id)).filter(
            User.is_premium == True
        ).scalar() or 0
        
        # Total free users
        total_free_users = total_users - total_subscriptions
        
        # Calculate changes (last 30 days vs previous 30 days)
        thirty_days_ago = datetime.utcnow() - timedelta(days=30)
        sixty_days_ago = datetime.utcnow() - timedelta(days=60)
        
        users_last_30 = db.query(func.count(User.id)).filter(
            User.created_at >= thirty_days_ago
        ).scalar() or 0
        
        users_previous_30 = db.query(func.count(User.id)).filter(
            User.created_at >= sixty_days_ago,
            User.created_at < thirty_days_ago
        ).scalar() or 0
        
        users_change = users_last_30 - users_previous_30
        
        subscriptions_last_30 = db.query(func.count(User.id)).filter(
            User.is_premium == True,
            User.created_at >= thirty_days_ago
        ).scalar() or 0
        
        subscriptions_previous_30 = db.query(func.count(User.id)).filter(
            User.is_premium == True,
            User.created_at >= sixty_days_ago,
            User.created_at < thirty_days_ago
        ).scalar() or 0
        
        subscriptions_change = subscriptions_last_30 - subscriptions_previous_30
        
        free_users_change = users_change - subscriptions_change
        
        # Income and Expense (from Stripe - placeholder for now)
        # TODO: Implement Stripe payment tracking
        total_income = 0
        total_expense = 0
        income_change = 0
        expense_change = 0
        
        return {
            "totalUsers": total_users,
            "totalSubscriptions": total_subscriptions,
            "totalFreeUsers": total_free_users,
            "totalIncome": total_income,
            "totalExpense": total_expense,
            "usersChange": users_change,
            "subscriptionsChange": subscriptions_change,
            "freeUsersChange": free_users_change,
            "incomeChange": income_change,
            "expenseChange": expense_change,
        }
    except Exception as e:
        logger.error(f"Error fetching dashboard stats: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to fetch dashboard stats")


@router.get("/sales")
async def get_sales_data(
    db: Session = Depends(get_db),
    token: dict = Depends(verify_admin_token),
):
    """Get sales statistics by month"""
    try:
        # Get premium users grouped by month
        # TODO: Implement actual Stripe payment tracking
        # For now, use premium user creation dates as proxy
        
        current_year = datetime.utcnow().year
        months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
        
        sales_by_month = []
        for month_num in range(1, 13):
            month_start = datetime(current_year, month_num, 1)
            if month_num == 12:
                month_end = datetime(current_year + 1, 1, 1)
            else:
                month_end = datetime(current_year, month_num + 1, 1)
            
            # Count premium users created in this month
            premium_count = db.query(func.count(User.id)).filter(
                User.is_premium == True,
                User.created_at >= month_start,
                User.created_at < month_end
            ).scalar() or 0
            
            # Estimate revenue (premium users * average subscription price)
            # TODO: Replace with actual Stripe revenue data
            estimated_revenue = premium_count * 10  # Placeholder: $10 per premium user
        
            sales_by_month.append({
                "date": months[month_num - 1],
                "amount": estimated_revenue
            })
        
        return sales_by_month
    except Exception as e:
        logger.error(f"Error fetching sales data: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to fetch sales data")


@router.get("/subscribers")
async def get_subscriber_data(
    db: Session = Depends(get_db),
    token: dict = Depends(verify_admin_token),
):
    """Get subscriber statistics by day of week"""
    try:
        
        # Get premium users grouped by day of week (0=Monday, 6=Sunday)
        days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
        
        # Get last 7 days of premium user creations
        seven_days_ago = datetime.utcnow() - timedelta(days=7)
        
        subscriber_by_day = []
        for day_offset in range(7):
            day_start = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0) - timedelta(days=day_offset)
            day_end = day_start + timedelta(days=1)
            
            # Count premium users created on this day
            count = db.query(func.count(User.id)).filter(
                User.is_premium == True,
                User.created_at >= day_start,
                User.created_at < day_end
            ).scalar() or 0
            
            day_name = days[(day_start.weekday() + 1) % 7]  # Convert to Sunday-first format
            
            subscriber_by_day.append({
                "date": day_name,
                "count": count
            })
        
        # Reverse to show most recent first
        subscriber_by_day.reverse()
        
        return subscriber_by_day
    except Exception as e:
        logger.error(f"Error fetching subscriber data: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to fetch subscriber data")


@router.get("/user-overview")
async def get_user_overview(
    db: Session = Depends(get_db),
    token: dict = Depends(verify_admin_token),
):
    """Get user overview statistics"""
    try:
        today = datetime.utcnow().date()
        today_start = datetime.combine(today, datetime.min.time())
        
        # New users today
        new_users_today = db.query(func.count(User.id)).filter(
            func.date(User.created_at) == today
        ).scalar() or 0
        
        # New subscribers today
        new_subscribers_today = db.query(func.count(User.id)).filter(
            User.is_premium == True,
            func.date(User.created_at) == today
        ).scalar() or 0
        
        return [
            {
                "date": "Today",
                "new": new_users_today,
                "subscribers": new_subscribers_today,
            }
        ]
    except Exception as e:
        logger.error(f"Error fetching user overview: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to fetch user overview")


@router.get("/latest-users")
async def get_latest_users(
    db: Session = Depends(get_db),
    token: dict = Depends(verify_admin_token),
    limit: int = 10,
):
    """Get latest registered users"""
    try:
        users = db.query(User).order_by(
            User.created_at.desc()
        ).limit(limit).all()
        
        return [
            {
                "id": str(user.id),
                "name": user.name,
                "email": user.email,
                "joinDate": user.created_at.strftime("%d %b %Y") if user.created_at else "",
                "isPremium": user.is_premium,
            }
            for user in users
        ]
    except Exception as e:
        logger.error(f"Error fetching latest users: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to fetch latest users")


@router.get("/latest-subscribers")
async def get_latest_subscribers(
    db: Session = Depends(get_db),
    token: dict = Depends(verify_admin_token),
    limit: int = 10,
):
    """Get latest subscribed (premium) users"""
    try:
        users = db.query(User).filter(
            User.is_premium == True
        ).order_by(
            User.created_at.desc()
        ).limit(limit).all()
        
        return [
            {
                "id": str(user.id),
                "name": user.name,
                "email": user.email,
                "joinDate": user.created_at.strftime("%d %b %Y") if user.created_at else "",
                "isPremium": user.is_premium,
            }
            for user in users
        ]
    except Exception as e:
        logger.error(f"Error fetching latest subscribers: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to fetch latest subscribers")


@router.get("/top-performers")
async def get_top_performers(
    db: Session = Depends(get_db),
    token: dict = Depends(verify_admin_token),
):
    """Get top performing users (by resume count or exports)"""
    try:
        # Get users with most resumes
        users_with_resumes = db.query(
            User.id,
            User.name,
            User.email,
            func.count(Resume.id).label("resume_count")
        ).join(
            Resume, User.id == Resume.user_id, isouter=True
        ).group_by(
            User.id, User.name, User.email
        ).order_by(
            func.count(Resume.id).desc()
        ).limit(10).all()
        
        return [
            {
                "id": str(user_id),
                "name": name,
                "email": email,
                "agentId": str(user_id),
                "revenue": resume_count or 0,
                "status": "active",
            }
            for user_id, name, email, resume_count in users_with_resumes
        ]
    except Exception as e:
        logger.error(f"Error fetching top performers: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to fetch top performers")


@router.get("/top-countries")
async def get_top_countries(
    db: Session = Depends(get_db),
    token: dict = Depends(verify_admin_token),
):
    """Get top countries by user count"""
    try:
        # TODO: Add country field to User model or get from IP geolocation
        # For now, return empty array
        return []
    except Exception as e:
        logger.error(f"Error fetching top countries: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to fetch top countries")


@router.get("/users")
async def get_users(
    db: Session = Depends(get_db),
    token: dict = Depends(verify_admin_token),
    page: int = 1,
    limit: int = 10,
    search: Optional[str] = None,
    status: Optional[str] = None,
):
    """Get paginated list of users"""
    try:
        query = db.query(User)
        
        # Apply search filter
        if search:
            search_term = f"%{search}%"
            query = query.filter(
                (User.name.ilike(search_term)) | (User.email.ilike(search_term))
            )
        
        # Apply status filter (Active = premium, Inactive = free)
        if status and status.lower() != 'all':
            if status.lower() == 'active':
                query = query.filter(User.is_premium == True)
            elif status.lower() == 'inactive':
                query = query.filter(User.is_premium == False)
        
        # Get total count before pagination
        total_users = query.count()
        
        # Apply pagination
        offset = (page - 1) * limit
        users = query.order_by(User.created_at.desc()).offset(offset).limit(limit).all()
        
        # Format users for frontend
        formatted_users = [
            {
                "id": str(user.id),
                "joinDate": user.created_at.strftime("%d %b %Y") if user.created_at else "",
                "name": user.name or "Unknown",
                "email": user.email,
                "department": "N/A",  # Not stored in User model
                "designation": "Premium" if user.is_premium else "Free",
                "status": "Active" if user.is_premium else "Inactive",
                "avatar": f"https://api.dicebear.com/7.x/avataaars/svg?seed={user.email}",
            }
            for user in users
        ]
        
        total_pages = (total_users + limit - 1) // limit if limit > 0 else 1
        
        return {
            "users": formatted_users,
            "totalUsers": total_users,
            "currentPage": page,
            "totalPages": total_pages,
        }
    except Exception as e:
        logger.error(f"Error fetching users: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to fetch users")


@router.get("/content-generation")
async def get_content_generation_data(
    db: Session = Depends(get_db),
    token: dict = Depends(verify_admin_token),
):
    """Get content generation statistics"""
    try:
        # Get resume versions created by month
        # TODO: Track actual content generation (words, images)
        # For now, return empty array
        return []
    except Exception as e:
        logger.error(f"Error fetching content generation data: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to fetch content generation data")

