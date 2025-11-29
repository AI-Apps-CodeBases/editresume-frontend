"""Dashboard API endpoints - Real data from PostgreSQL."""

from __future__ import annotations

import logging
from datetime import datetime, timedelta
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func, extract, Integer, case
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
    """Get dashboard statistics from PostgreSQL - Optimized with fewer queries"""
    try:
        # Calculate time boundaries once
        now = datetime.utcnow()
        thirty_days_ago = now - timedelta(days=30)
        sixty_days_ago = now - timedelta(days=60)
        
        # Get total counts in a single query using conditional aggregation
        user_stats = db.query(
            func.count(User.id).label('total_users'),
            func.sum(func.cast(User.is_premium, Integer)).label('total_subscriptions')
        ).first()
        
        total_users = user_stats.total_users or 0
        total_subscriptions = user_stats.total_subscriptions or 0
        total_free_users = total_users - total_subscriptions
        
        # Get user changes in a single query using conditional aggregation
        user_changes = db.query(
            func.count(case((User.created_at >= thirty_days_ago, 1))).label('users_last_30'),
            func.count(case((
                (User.created_at >= sixty_days_ago) & (User.created_at < thirty_days_ago), 1
            ))).label('users_previous_30'),
            func.count(case((
                (User.created_at >= thirty_days_ago) & (User.is_premium == True), 1
            ))).label('subscriptions_last_30'),
            func.count(case((
                (User.created_at >= sixty_days_ago) & 
                (User.created_at < thirty_days_ago) & 
                (User.is_premium == True), 1
            ))).label('subscriptions_previous_30')
        ).first()
        
        users_last_30 = user_changes.users_last_30 or 0
        users_previous_30 = user_changes.users_previous_30 or 0
        users_change = users_last_30 - users_previous_30
        
        subscriptions_last_30 = user_changes.subscriptions_last_30 or 0
        subscriptions_previous_30 = user_changes.subscriptions_previous_30 or 0
        subscriptions_change = subscriptions_last_30 - subscriptions_previous_30
        
        free_users_change = users_change - subscriptions_change
        
        # Income (from Stripe - placeholder for now)
        # TODO: Implement Stripe payment tracking
        total_income = 0
        income_change = 0
        
        # Get resume counts in a single query
        resume_stats = db.query(
            func.count(Resume.id).label('total_resumes'),
            func.count(case((Resume.created_at >= thirty_days_ago, 1))).label('resumes_last_30'),
            func.count(case((
                (Resume.created_at >= sixty_days_ago) & (Resume.created_at < thirty_days_ago), 1
            ))).label('resumes_previous_30')
        ).first()
        
        total_resumes = resume_stats.total_resumes or 0
        resumes_last_30 = resume_stats.resumes_last_30 or 0
        resumes_previous_30 = resume_stats.resumes_previous_30 or 0
        
        # Expense (OpenAI API costs)
        # Calculate based on estimated token usage
        # For now, estimate: each resume generation uses ~2000 tokens
        # gpt-4o-mini pricing: $0.15 per 1M input tokens, $0.60 per 1M output tokens
        # Average: ~$0.0003 per 1000 tokens
        estimated_tokens = total_resumes * 2000  # Rough estimate
        # Cost per 1000 tokens: ~$0.0003 for gpt-4o-mini
        total_expense = round(estimated_tokens * 0.0003 / 1000, 2)
        
        estimated_tokens_last_30 = resumes_last_30 * 2000
        expense_last_30 = round(estimated_tokens_last_30 * 0.0003 / 1000, 2)
        
        estimated_tokens_previous_30 = resumes_previous_30 * 2000
        expense_previous_30 = round(estimated_tokens_previous_30 * 0.0003 / 1000, 2)
        
        expense_change = round(expense_last_30 - expense_previous_30, 2)
        
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
    """Get sales statistics by month - Optimized with single GROUP BY query"""
    try:
        # Get premium users grouped by month using a single query
        # TODO: Implement actual Stripe payment tracking
        # For now, use premium user creation dates as proxy
        
        current_year = datetime.utcnow().year
        
        # Single query to get all months at once
        sales_data = db.query(
            extract('month', User.created_at).label('month'),
            func.count(User.id).label('premium_count')
        ).filter(
            User.is_premium == True,
            extract('year', User.created_at) == current_year
        ).group_by(
            extract('month', User.created_at)
        ).all()
        
        months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
        
        # Create a dictionary for quick lookup
        sales_dict = {int(row.month): row.premium_count for row in sales_data}
        
        # Build result array for all 12 months
        sales_by_month = []
        for month_num in range(1, 13):
            premium_count = sales_dict.get(month_num, 0)
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
    """Get subscriber statistics by day of week - Optimized with single GROUP BY query"""
    try:
        # Get total subscriptions
        total_subscriptions = db.query(func.count(User.id)).filter(
            User.is_premium == True
        ).scalar() or 0
        
        # Calculate changes (last 30 days vs previous 30 days) in a single query
        now = datetime.utcnow()
        thirty_days_ago = now - timedelta(days=30)
        sixty_days_ago = now - timedelta(days=60)
        
        subscription_changes = db.query(
            func.count(case((User.created_at >= thirty_days_ago, 1))).label('subscriptions_last_30'),
            func.count(case((
                (User.created_at >= sixty_days_ago) & (User.created_at < thirty_days_ago), 1
            ))).label('subscriptions_previous_30')
        ).filter(
            User.is_premium == True
        ).first()
        
        subscriptions_last_30 = subscription_changes.subscriptions_last_30 or 0
        subscriptions_previous_30 = subscription_changes.subscriptions_previous_30 or 0
        subscriptions_change = subscriptions_last_30 - subscriptions_previous_30
        
        # Get last 7 days of premium user creations using a single query
        seven_days_ago = now - timedelta(days=7)
        days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
        
        # Single query to get all days at once
        subscriber_data = db.query(
            func.date(User.created_at).label('date'),
            func.count(User.id).label('count')
        ).filter(
            User.is_premium == True,
            User.created_at >= seven_days_ago
        ).group_by(
            func.date(User.created_at)
        ).all()
        
        # Create a dictionary for quick lookup
        subscriber_dict = {}
        for row in subscriber_data:
            day_date = row.date
            if isinstance(day_date, str):
                day_date = datetime.strptime(day_date, '%Y-%m-%d').date()
            day_name = days[(day_date.weekday() + 1) % 7]  # Convert to Sunday-first format
            subscriber_dict[day_date] = {
                "date": day_name,
                "count": row.count
            }
        
        # Build result array for last 7 days
        subscriber_by_day = []
        for day_offset in range(6, -1, -1):  # From 6 days ago to today
            day_start = now.replace(hour=0, minute=0, second=0, microsecond=0) - timedelta(days=day_offset)
            day_date = day_start.date()
            day_name = days[(day_date.weekday() + 1) % 7]
            
            if day_date in subscriber_dict:
                subscriber_by_day.append(subscriber_dict[day_date])
            else:
                subscriber_by_day.append({
                    "date": day_name,
                    "count": 0
                })
        
        return {
            "data": subscriber_by_day,
            "totalSubscriptions": total_subscriptions,
            "subscriptionsChange": subscriptions_change,
        }
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
    """Get top performing users (by resume count - proxy for token usage)"""
    try:
        # Get users with most resumes (proxy for token/API usage)
        users_with_resumes = db.query(
            User.id,
            User.name,
            User.email,
            func.count(Resume.id).label("resume_count"),
            func.count(ResumeVersion.id).label("version_count")
        ).join(
            Resume, User.id == Resume.user_id, isouter=True
        ).join(
            ResumeVersion, Resume.id == ResumeVersion.resume_id, isouter=True
        ).group_by(
            User.id, User.name, User.email
        ).order_by(
            func.count(ResumeVersion.id).desc()  # Order by version count (proxy for token usage)
        ).limit(10).all()
        
        return [
            {
                "id": str(user_id),
                "name": name,
                "email": email,
                "agentId": str(user_id),
                "revenue": version_count or 0,  # Version count as proxy for token usage
                "status": "active",
            }
            for user_id, name, email, resume_count, version_count in users_with_resumes
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
    """Get content generation statistics (token usage) - Optimized with single GROUP BY query"""
    try:
        # Get resume versions created by month (proxy for token usage) using a single query
        current_year = datetime.utcnow().year
        months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
        
        # Single query to get all months at once
        content_data = db.query(
            extract('month', ResumeVersion.created_at).label('month'),
            func.count(ResumeVersion.id).label('version_count')
        ).filter(
            extract('year', ResumeVersion.created_at) == current_year
        ).group_by(
            extract('month', ResumeVersion.created_at)
        ).all()
        
        # Create a dictionary for quick lookup
        content_dict = {int(row.month): row.version_count for row in content_data}
        
        # Build result array for all 12 months
        content_by_month = []
        for month_num in range(1, 13):
            version_count = content_dict.get(month_num, 0)
            # Estimate tokens: each version generation uses ~2000 tokens
            estimated_tokens = version_count * 2000
            
            content_by_month.append({
                "date": months[month_num - 1],
                "word": estimated_tokens,  # Using "word" as key to match frontend
            })
        
        return content_by_month
    except Exception as e:
        logger.error(f"Error fetching content generation data: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to fetch content generation data")


@router.get("/feedback")
async def get_feedback(
    db: Session = Depends(get_db),
    token: dict = Depends(verify_admin_token),
    limit: int = 50,
):
    """Get all feedbacks for dashboard display"""
    logger.info("=" * 50)
    logger.info("Dashboard feedback endpoint CALLED!")
    logger.info(f"Token email: {token.get('email', 'N/A')}")
    logger.info("=" * 50)
    try:
        from app.models.feedback import Feedback
        
        feedbacks = db.query(Feedback).order_by(
            Feedback.created_at.desc()
        ).limit(limit).all()
        
        logger.info(f"Fetched {len(feedbacks)} feedbacks for dashboard")
        
        result = [
            {
                "id": feedback.id,
                "user_email": feedback.user_email,
                "rating": feedback.rating,
                "feedback": feedback.feedback,
                "category": feedback.category,
                "page_url": feedback.page_url,
                "created_at": feedback.created_at.isoformat() if feedback.created_at else None,
            }
            for feedback in feedbacks
        ]
        
        return result
    except Exception as e:
        logger.error(f"Error fetching feedback: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to fetch feedback")


@router.delete("/feedback/{feedback_id}")
async def delete_feedback(
    feedback_id: int,
    db: Session = Depends(get_db),
    token: dict = Depends(verify_admin_token),
):
    """Delete a feedback by ID"""
    try:
        from app.models.feedback import Feedback
        
        feedback = db.query(Feedback).filter(Feedback.id == feedback_id).first()
        
        if not feedback:
            raise HTTPException(status_code=404, detail="Feedback not found")
        
        db.delete(feedback)
        db.commit()
        
        logger.info(f"Deleted feedback with ID: {feedback_id}")
        
        return {"success": True, "message": "Feedback deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting feedback: {e}", exc_info=True)
        db.rollback()
        raise HTTPException(status_code=500, detail="Failed to delete feedback")

