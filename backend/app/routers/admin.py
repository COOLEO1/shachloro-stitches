from typing import Annotated

from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
    Query,
    Request
)
from fastapi.security import (
    HTTPAuthorizationCredentials,
    HTTPBearer
)

from app.config import settings
from app.database import supabase
from app.limiter import limiter
from app.models import OrderStatus, OrderStatusUpdate

router = APIRouter(prefix="/api/admin", tags=["Admin"])

bearer = HTTPBearer(auto_error=False)


def require_admin(
    credentials: Annotated[
        HTTPAuthorizationCredentials | None,
        Depends(bearer)
    ]
):
    if not settings.ADMIN_USER_ID:
        raise HTTPException(
            status_code=503,
            detail="Admin access has not been configured"
        )

    if not credentials:
        raise HTTPException(
            status_code=401,
            detail="Authentication required"
        )

    try:
        response = supabase.auth.get_user(
            credentials.credentials
        )
        user = response.user
    except Exception:
        raise HTTPException(
            status_code=401,
            detail="Invalid or expired login session"
        )

    if not user:
        raise HTTPException(
            status_code=401,
            detail="Invalid login session"
        )

    if str(user.id) != settings.ADMIN_USER_ID:
        raise HTTPException(
            status_code=403,
            detail="Administrator access denied"
        )

    return user


@router.get("/orders")
@limiter.limit("30/minute")
def list_orders(
    request: Request,
    status: OrderStatus | None = Query(default=None),
    admin=Depends(require_admin)
):
    try:
        query = (
            supabase.table("orders")
            .select("*")
            .order("created_at", desc=True)
            .limit(100)
        )

        if status:
            query = query.eq("status", status)

        result = query.execute()

        return {
            "success": True,
            "orders": result.data or [],
            "count": len(result.data or [])
        }

    except Exception:
        raise HTTPException(
            status_code=500,
            detail="Unable to retrieve orders"
        )


@router.patch("/orders/{reference}/status")
@limiter.limit("30/minute")
def update_order_status(
    request: Request,
    reference: str,
    update: OrderStatusUpdate,
    admin=Depends(require_admin)
):
    try:
        result = (
            supabase.table("orders")
            .update({"status": update.status})
            .eq("reference", reference)
            .select("reference,status,created_at")
            .execute()
        )

        if not result.data:
            raise HTTPException(
                status_code=404,
                detail="Order not found"
            )

        return {
            "success": True,
            "order": result.data[0]
        }

    except HTTPException:
        raise
    except Exception:
        raise HTTPException(
            status_code=500,
            detail="Unable to update order"
        )
