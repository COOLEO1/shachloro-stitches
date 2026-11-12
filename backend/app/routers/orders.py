import uuid

from fastapi import APIRouter, HTTPException, Request

from app.database import supabase
from app.limiter import limiter
from app.models import OrderCreate

router = APIRouter(prefix="/api/orders", tags=["Orders"])


@router.post("/")
@limiter.limit("5/minute")
def create_order(request: Request, order: OrderCreate):
    reference = "SHS-" + uuid.uuid4().hex.upper()

    data = {
        "reference": reference,
        "customer_name": order.customer_name,
        "phone": order.phone,
        "location": order.location,
        "garment": order.garment,
        "size": order.size,
        "description": order.description,
        "status": "pending"
    }

    try:
        result = supabase.table("orders").insert(data).execute()

        if not result.data:
            raise HTTPException(
                status_code=500,
                detail="Order could not be saved"
            )

        return {
            "success": True,
            "message": "Order received successfully",
            "reference": reference,
            "status": "pending"
        }

    except HTTPException:
        raise
    except Exception:
        raise HTTPException(
            status_code=500,
            detail="Unable to process order"
        )


@router.get("/track/{reference}")
@limiter.limit("15/minute")
def track_order(request: Request, reference: str):
    try:
        result = (
            supabase.table("orders")
            .select("reference,status,created_at")
            .eq("reference", reference)
            .limit(1)
            .execute()
        )

        if not result.data:
            raise HTTPException(
                status_code=404,
                detail="Order not found"
            )

        return result.data[0]

    except HTTPException:
        raise
    except Exception:
        raise HTTPException(
            status_code=500,
            detail="Unable to retrieve order"
        )
