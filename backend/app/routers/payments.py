from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from app.database import supabase
from app.routers.admin import require_admin

router = APIRouter(tags=["Payments"])


class QuoteUpdate(BaseModel):
    quoted_amount: int = Field(gt=0, le=1000000000)
    deposit_amount: int = Field(ge=0, le=1000000000)


@router.get("/api/orders/payment/{reference}")
def get_payment_quote(reference: str):
    try:
        result = (
            supabase.table("orders")
            .select(
                "reference,status,quoted_amount,deposit_amount,"
                "amount_paid,payment_status"
            )
            .eq("reference", reference)
            .limit(1)
            .execute()
        )

        if not result.data:
            raise HTTPException(status_code=404, detail="Order not found")

        order = result.data[0]

        total = order.get("quoted_amount")
        deposit = order.get("deposit_amount")
        paid = order.get("amount_paid") or 0

        if total is None:
            amount_due = None
            balance = None
        else:
            total = int(total)
            deposit = int(deposit or 0)
            paid = int(paid)

            amount_due = (
                max(deposit - paid, 0)
                if deposit > 0 and paid < deposit
                else max(total - paid, 0)
            )
            balance = max(total - paid, 0)

        return {
            "reference": order["reference"],
            "order_status": order["status"],
            "quoted_amount": total,
            "deposit_amount": deposit,
            "amount_paid": paid,
            "balance": balance,
            "amount_due": amount_due,
            "payment_status": order["payment_status"],
            "online_payment_enabled": False
        }

    except HTTPException:
        raise
    except Exception:
        raise HTTPException(
            status_code=500,
            detail="Unable to retrieve payment information"
        )


@router.patch("/api/admin/orders/{reference}/quote")
def update_payment_quote(
    reference: str,
    update: QuoteUpdate,
    admin=Depends(require_admin)
):
    if update.deposit_amount > update.quoted_amount:
        raise HTTPException(
            status_code=422,
            detail="Deposit cannot exceed the quoted total."
        )

    try:
        result = (
            supabase.table("orders")
            .update({
                "quoted_amount": update.quoted_amount,
                "deposit_amount": update.deposit_amount,
                "payment_status": "quoted"
            })
            .eq("reference", reference)
            .select("reference,quoted_amount,deposit_amount,payment_status")
            .execute()
        )

        if not result.data:
            raise HTTPException(status_code=404, detail="Order not found")

        return {"success": True, "order": result.data[0]}

    except HTTPException:
        raise
    except Exception:
        raise HTTPException(
            status_code=500,
            detail="Unable to save payment quote"
        )
