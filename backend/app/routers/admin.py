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
        orders = result.data or []

        # Generate short-lived links only for authenticated administrators.
        for order in orders:
            order["design_image_urls"] = []

            for image in order.get("design_images") or []:
                try:
                    signed = supabase.storage.from_(
                        "order-designs"
                    ).create_signed_url(image["path"], 3600)

                    if isinstance(signed, dict):
                        url = (
                            signed.get("signedURL")
                            or signed.get("signedUrl")
                        )
                    else:
                        url = (
                            getattr(signed, "signedURL", None)
                            or getattr(signed, "signedUrl", None)
                        )

                    if url:
                        base_url = settings.SUPABASE_URL.rstrip("/")

                        if url.startswith("/storage/v1/"):
                            url = base_url + url
                        elif url.startswith("/"):
                            url = base_url + "/storage/v1" + url

                        order["design_image_urls"].append({
                            "name": image.get("name", "Design image"),
                            "url": url
                        })

                except Exception:
                    # Do not fail the entire dashboard if one image is unavailable.
                    continue

        return {
            "success": True,
            "orders": orders,
            "count": len(orders)
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
