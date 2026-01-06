"""Dashboard Feature - handles admin dashboard statistics, user management, and analytics.

This module contains all dashboard-related endpoints extracted from app/api/dashboard.py
for better feature isolation and organization.
"""

from __future__ import annotations

import logging
from datetime import datetime, timedelta
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy import func, extract, case, Integer, text
from sqlalchemy.orm import Session

from app.core.db import get_db
from app.core.firebase_admin import verify_id_token
from app.models import User, Resume, ResumeVersion, ExportAnalytics, VisitorAnalytics

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/dashboard", tags=["dashboard"])


def verify_admin_token(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(HTTPBearer(auto_error=False))
) -> dict:
    """Verify token and check if user is admin (for now, just verify token)"""
    from app.core.firebase_admin import get_firebase_app
    
    # Check if Firebase is configured
    firebase_app = get_firebase_app()
    if not firebase_app:
        # Firebase not configured, allow access for local testing without token
        logger.warning("Firebase not configured, allowing access for local development")
        return {"uid": "local-test", "email": "test@local.com", "name": "Local Test User"}
    
    # Firebase is configured, verify token
    if not credentials or not credentials.credentials:
        raise HTTPException(status_code=401, detail="Missing authentication credentials")
    
    decoded_token = verify_id_token(credentials.credentials)
    if not decoded_token:
        raise HTTPException(status_code=401, detail="Invalid token")
    return decoded_token


@router.get("/stats")
async def get_dashboard_stats(
    db: Session = Depends(get_db),
    token: dict = Depends(verify_admin_token),
):
    """Get dashboard statistics from PostgreSQL - Optimized with single queries"""
    try:
        # Calculate date ranges once
        thirty_days_ago = datetime.utcnow() - timedelta(days=30)
        sixty_days_ago = datetime.utcnow() - timedelta(days=60)
        
        # Optimize: Use raw SQL for maximum performance - single query for all user stats
        # This reduces 6 queries to 1 query
        user_stats_query = """
            SELECT 
                COUNT(*) as total_users,
                COUNT(*) FILTER (WHERE is_premium = true) as total_subscriptions,
                COUNT(*) FILTER (WHERE created_at >= :thirty_days_ago) as users_last_30,
                COUNT(*) FILTER (WHERE created_at >= :sixty_days_ago AND created_at < :thirty_days_ago) as users_previous_30,
                COUNT(*) FILTER (WHERE is_premium = true AND COALESCE(premium_purchased_at, created_at) >= :thirty_days_ago) as subscriptions_last_30,
                COUNT(*) FILTER (WHERE is_premium = true AND COALESCE(premium_purchased_at, created_at) >= :sixty_days_ago AND COALESCE(premium_purchased_at, created_at) < :thirty_days_ago) as subscriptions_previous_30
            FROM users
        """
        user_stats_result = db.execute(
            text(user_stats_query),
            {
                "thirty_days_ago": thirty_days_ago,
                "sixty_days_ago": sixty_days_ago
            }
        ).first()
        
        total_users = user_stats_result.total_users or 0
        total_subscriptions = user_stats_result.total_subscriptions or 0
        total_free_users = total_users - total_subscriptions
        users_last_30 = user_stats_result.users_last_30 or 0
        users_previous_30 = user_stats_result.users_previous_30 or 0
        users_change = users_last_30 - users_previous_30
        subscriptions_last_30 = user_stats_result.subscriptions_last_30 or 0
        subscriptions_previous_30 = user_stats_result.subscriptions_previous_30 or 0
        subscriptions_change = subscriptions_last_30 - subscriptions_previous_30
        free_users_change = users_change - subscriptions_change
        
        # Income (from Stripe - placeholder for now)
        total_income = 0
        income_change = 0
        
        # Optimize: Single query for resume counts
        resume_stats_query = """
            SELECT 
                COUNT(*) as total_resumes,
                COUNT(*) FILTER (WHERE created_at >= :thirty_days_ago) as resumes_last_30,
                COUNT(*) FILTER (WHERE created_at >= :sixty_days_ago AND created_at < :thirty_days_ago) as resumes_previous_30
            FROM resumes
        """
        resume_stats_result = db.execute(
            text(resume_stats_query),
            {
                "thirty_days_ago": thirty_days_ago,
                "sixty_days_ago": sixty_days_ago
            }
        ).first()
        
        total_resumes = resume_stats_result.total_resumes or 0
        resumes_last_30 = resume_stats_result.resumes_last_30 or 0
        resumes_previous_30 = resume_stats_result.resumes_previous_30 or 0
        
        # Expense calculation (OpenAI API costs) - Use actual token usage from database
        total_tokens = db.query(func.sum(ResumeVersion.tokens_used)).scalar() or 0
        tokens_last_30 = db.query(func.sum(ResumeVersion.tokens_used)).filter(
            ResumeVersion.created_at >= thirty_days_ago
        ).scalar() or 0
        tokens_previous_30 = db.query(func.sum(ResumeVersion.tokens_used)).filter(
            ResumeVersion.created_at >= sixty_days_ago,
            ResumeVersion.created_at < thirty_days_ago
        ).scalar() or 0
        
        total_expense = round(total_tokens * 0.0003 / 1000, 2)
        expense_last_30 = round(tokens_last_30 * 0.0003 / 1000, 2)
        expense_previous_30 = round(tokens_previous_30 * 0.0003 / 1000, 2)
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
    """Get sales statistics by month - Uses actual purchase dates"""
    try:
        current_year = datetime.utcnow().year
        
        # Use premium_purchased_at if available, fallback to created_at for legacy data
        sales_data = db.query(
            extract('month', 
                func.coalesce(User.premium_purchased_at, User.created_at)
            ).label('month'),
            func.count(User.id).label('premium_count')
        ).filter(
            User.is_premium == True,
            extract('year', 
                func.coalesce(User.premium_purchased_at, User.created_at)
            ) == current_year
        ).group_by(
            extract('month', 
                func.coalesce(User.premium_purchased_at, User.created_at)
            )
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
        
        purchase_date_col = func.coalesce(User.premium_purchased_at, User.created_at)
        subscription_changes = db.query(
            func.count(case((purchase_date_col >= thirty_days_ago, 1))).label('subscriptions_last_30'),
            func.count(case((
                (purchase_date_col >= sixty_days_ago) & (purchase_date_col < thirty_days_ago), 1
            ))).label('subscriptions_previous_30')
        ).filter(
            User.is_premium == True
        ).first()
        
        subscriptions_last_30 = subscription_changes.subscriptions_last_30 or 0
        subscriptions_previous_30 = subscription_changes.subscriptions_previous_30 or 0
        subscriptions_change = subscriptions_last_30 - subscriptions_previous_30
        
        # Get premium users grouped by month (last 12 months)
        months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
        current_year = datetime.utcnow().year
        current_month = datetime.utcnow().month

        subscriber_by_month = []
        # Get last 12 months (from current month backward)
        for i in range(12):
            # Calculate month and year
            month_num = current_month - i
            year = current_year
            while month_num <= 0:
                month_num += 12
                year -= 1

            month_start = datetime(year, month_num, 1)
            if month_num == 12:
                month_end = datetime(year + 1, 1, 1)
            else:
                month_end = datetime(year, month_num + 1, 1)

            # Count premium users purchased in this month
            purchase_date_col = func.coalesce(User.premium_purchased_at, User.created_at)
            count = db.query(func.count(User.id)).filter(
                User.is_premium == True,
                purchase_date_col >= month_start,
                purchase_date_col < month_end
            ).scalar() or 0

            subscriber_by_month.append({
                "date": months[month_num - 1],
                "count": count
            })

        # Reverse to show oldest first (Jan to Dec)
        subscriber_by_month.reverse()
        
        return {
            "data": subscriber_by_month,
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
    """Get user overview statistics - returns total counts"""
    try:
        # Get total users
        total_users = db.query(func.count(User.id)).scalar() or 0
        
        # Get total subscribers (premium users)
        total_subscribers = db.query(func.count(User.id)).filter(
            User.is_premium == True
        ).scalar() or 0
        
        # New users = Free users (total - premium)
        new_users = total_users - total_subscribers
        
        return [
            {
                "date": "Total",
                "new": new_users,  # Free users (total - premium)
                "subscribers": total_subscribers,  # Premium subscribers
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
    """Get latest subscribed (premium) users - ordered by purchase date"""
    try:
        users = db.query(User).filter(
            User.is_premium == True
        ).order_by(
            func.coalesce(User.premium_purchased_at, User.created_at).desc()
        ).limit(limit).all()
        
        return [
            {
                "id": str(user.id),
                "name": user.name,
                "email": user.email,
                "joinDate": (user.premium_purchased_at or user.created_at).strftime("%d %b %Y") if (user.premium_purchased_at or user.created_at) else "",
                "purchaseDate": user.premium_purchased_at.strftime("%d %b %Y") if user.premium_purchased_at else "",
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
    period: str = "monthly",  # daily, weekly, monthly
):
    """Get top countries by visitor count"""
    try:
        from app.models.analytics import VisitorAnalytics
        from datetime import datetime, timedelta
        
        # Calculate date range based on period
        now = datetime.utcnow()
        if period == "daily":
            start_date = now.replace(hour=0, minute=0, second=0, microsecond=0)
        elif period == "weekly":
            start_date = now - timedelta(days=7)
        else:  # monthly
            start_date = now - timedelta(days=30)
        
        # Get country statistics
        country_stats = db.query(
            VisitorAnalytics.country,
            VisitorAnalytics.country_code,
            func.count(VisitorAnalytics.id).label('visitor_count')
        ).filter(
            VisitorAnalytics.created_at >= start_date,
            VisitorAnalytics.country.isnot(None),
            VisitorAnalytics.country != "Local"
        ).group_by(
            VisitorAnalytics.country,
            VisitorAnalytics.country_code
        ).order_by(
            func.count(VisitorAnalytics.id).desc()
        ).limit(10).all()
        
        if not country_stats:
            return []
        
        # Calculate total for percentage
        total_visitors = sum(stat.visitor_count for stat in country_stats)
        
        # Country flag emoji mapping
        country_flags = {
            "US": "🇺🇸", "USA": "🇺🇸", "United States": "🇺🇸",
            "GB": "🇬🇧", "GBR": "🇬🇧", "United Kingdom": "🇬🇧", "UK": "🇬🇧",
            "CA": "🇨🇦", "CAN": "🇨🇦", "Canada": "🇨🇦",
            "AU": "🇦🇺", "AUS": "🇦🇺", "Australia": "🇦🇺",
            "DE": "🇩🇪", "DEU": "🇩🇪", "Germany": "🇩🇪",
            "FR": "🇫🇷", "FRA": "🇫🇷", "France": "🇫🇷",
            "IN": "🇮🇳", "IND": "🇮🇳", "India": "🇮🇳",
            "BR": "🇧🇷", "BRA": "🇧🇷", "Brazil": "🇧🇷",
            "CN": "🇨🇳", "CHN": "🇨🇳", "China": "🇨🇳",
            "JP": "🇯🇵", "JPN": "🇯🇵", "Japan": "🇯🇵",
            "SA": "🇸🇦", "SAU": "🇸🇦", "Saudi Arabia": "🇸🇦",
            "PH": "🇵🇭", "PHL": "🇵🇭", "Philippines": "🇵🇭",
            "ID": "🇮🇩", "IDN": "🇮🇩", "Indonesia": "🇮🇩",
            "ES": "🇪🇸", "ESP": "🇪🇸", "Spain": "🇪🇸",
            "IT": "🇮🇹", "ITA": "🇮🇹", "Italy": "🇮🇹",
            "MX": "🇲🇽", "MEX": "🇲🇽", "Mexico": "🇲🇽",
            "KR": "🇰🇷", "KOR": "🇰🇷", "South Korea": "🇰🇷",
            "TR": "🇹🇷", "TUR": "🇹🇷", "Turkey": "🇹🇷",
            "NL": "🇳🇱", "NLD": "🇳🇱", "Netherlands": "🇳🇱",
            "SE": "🇸🇪", "SWE": "🇸🇪", "Sweden": "🇸🇪",
            "NO": "🇳🇴", "NOR": "🇳🇴", "Norway": "🇳🇴",
        }
        
        result = []
        for stat in country_stats:
            country_name = stat.country or "Unknown"
            country_code = stat.country_code or "XX"
            visitor_count = stat.visitor_count
            percentage = round((visitor_count / total_visitors) * 100, 1) if total_visitors > 0 else 0
            
            # Get flag emoji
            flag = country_flags.get(country_code) or country_flags.get(country_name) or "🌍"
            
            result.append({
                "country": country_name,
                "country_code": country_code,
                "users": visitor_count,
                "percentage": percentage,
                "flag": flag
            })
        
        return result
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
                "purchaseDate": user.premium_purchased_at.strftime("%d %b %Y") if user.premium_purchased_at else "",
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


@router.get("/users/{user_id}")
async def get_user_details(
    user_id: int,
    db: Session = Depends(get_db),
    token: dict = Depends(verify_admin_token),
):
    """Get detailed user information including token usage, activity dates, etc."""
    try:
        # Get user
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        # Get total resume count
        total_resumes = db.query(func.count(Resume.id)).filter(
            Resume.user_id == user_id
        ).scalar() or 0
        
        # Get total resume versions (for token calculation)
        total_versions = db.query(func.count(ResumeVersion.id)).filter(
            ResumeVersion.user_id == user_id
        ).scalar() or 0
        
        # Calculate token usage more realistically:
        # - max_tokens is set to 1000 in content generation
        # - But actual usage is usually 300-600 tokens per generation
        # - Not all versions use AI (some are manual edits/auto-saves)
        # - Estimate: ~500 tokens per version (conservative average)
        total_tokens = total_versions * 500
        
        # Get last login (from VisitorAnalytics - most recent activity)
        last_login = db.query(func.max(VisitorAnalytics.created_at)).filter(
            VisitorAnalytics.user_id == user_id
        ).scalar()
        
        # Get first activity date (earliest resume or resume version creation)
        first_resume_date = db.query(func.min(Resume.created_at)).filter(
            Resume.user_id == user_id
        ).scalar()
        
        first_version_date = db.query(func.min(ResumeVersion.created_at)).filter(
            ResumeVersion.user_id == user_id
        ).scalar()
        
        # First activity is the earliest of resume creation or version creation
        first_activity_date = None
        if first_resume_date and first_version_date:
            first_activity_date = min(first_resume_date, first_version_date)
        elif first_resume_date:
            first_activity_date = first_resume_date
        elif first_version_date:
            first_activity_date = first_version_date
        
        return {
            "id": str(user.id),
            "name": user.name or "Unknown",
            "email": user.email,
            "plan": "Premium" if user.is_premium else "Free",
            "joinDate": user.created_at.strftime("%d %b %Y") if user.created_at else "",
            "joinDateRaw": user.created_at.isoformat() if user.created_at else None,
            "status": "Active" if user.is_premium else "Inactive",
            "totalResumes": total_resumes,
            "totalTokens": total_tokens,
            "totalVersions": total_versions,
            "lastLogin": last_login.isoformat() if last_login else None,
            "lastLoginFormatted": last_login.strftime("%d %b %Y %H:%M") if last_login else "Never",
            "firstActivityDate": first_activity_date.isoformat() if first_activity_date else None,
            "firstActivityDateFormatted": first_activity_date.strftime("%d %b %Y") if first_activity_date else "No activity",
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching user details: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to fetch user details")


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
            month_start = datetime(current_year, month_num, 1)
            if month_num == 12:
                month_end = datetime(current_year + 1, 1, 1)
            else:
                month_end = datetime(current_year, month_num + 1, 1)
            
            # Get actual token usage for this month from database
            estimated_tokens = db.query(func.sum(ResumeVersion.tokens_used)).filter(
                ResumeVersion.created_at >= month_start,
                ResumeVersion.created_at < month_end
            ).scalar() or 0
            
            content_by_month.append({
                "date": months[month_num - 1],
                "word": estimated_tokens or 0,  # Using "word" as key to match frontend
                "image": 0,  # Placeholder for future image generation tracking
            })
        
        return content_by_month
    except Exception as e:
        logger.error(f"Error fetching content generation data: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to fetch content generation data")




@router.get("/feedback")
async def get_feedback(
    db: Session = Depends(get_db),
    token: dict = Depends(verify_admin_token),
):
    """Get all feedbacks for dashboard"""
    try:
        from app.models.feedback import Feedback
        
        feedbacks = db.query(Feedback).order_by(Feedback.created_at.desc()).all()
        
        return [
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

