import re
import uuid

from fastapi import (
    APIRouter,
    File,
    Form,
    HTTPException,
    Request,
    UploadFile
)

from app.database import supabase
from app.limiter import limiter
from app.models import OrderCreate

router = APIRouter(prefix="/api/orders", tags=["Orders"])

BUCKET = "order-designs"
MAX_IMAGES = 3
MAX_FILE_SIZE = 5 * 1024 * 1024

ALLOWED_TYPES = {
    "image/jpeg": (".jpg", b"\xff\xd8\xff"),
    "image/png": (".png", b"\x89PNG\r\n\x1a\n"),
    "image/webp": (".webp", b"RIFF")
}


def cleanup_uploads(paths):
    if not paths:
        return

    try:
        supabase.storage.from_(BUCKET).remove(paths)
    except Exception:
        pass


@router.post("/")
@limiter.limit("5/minute")
async def create_order(
    request: Request,
    customer_name: str = Form(...),
    phone: str = Form(...),
    location: str = Form(...),
    garment: str = Form(...),
    size: str = Form(...),
    description: str = Form(...),
    email: str = Form(default=""),
    gender: str = Form(default=""),
    quantity: int = Form(default=1),
    design_images: list[UploadFile] = File(default=[])
):
    email = (email or "").strip() or None
    gender = (gender or "").strip() or None

    if email and not re.fullmatch(r"[^@\s]+@[^@\s]+\.[^@\s]+", email):
        raise HTTPException(
            status_code=422,
            detail="Please enter a valid email address."
        )

    try:
        order = OrderCreate(
            customer_name=customer_name,
            phone=phone,
            location=location,
            email=email,
            gender=gender,
            quantity=quantity,
            garment=garment,
            size=size,
            description=description
        )
    except Exception:
        raise HTTPException(
            status_code=422,
            detail="Please check your order details and try again."
        )

    if len(design_images) > MAX_IMAGES:
        raise HTTPException(
            status_code=400,
            detail="You can upload a maximum of 3 images."
        )

    reference = "SHS-" + uuid.uuid4().hex.upper()
    uploaded_paths = []
    image_metadata = []

    try:
        for image in design_images:
            content_type = image.content_type or ""

            if content_type not in ALLOWED_TYPES:
                raise HTTPException(
                    status_code=400,
                    detail="Only JPG, PNG and WEBP images are accepted."
                )

            content = await image.read(MAX_FILE_SIZE + 1)

            if len(content) > MAX_FILE_SIZE:
                raise HTTPException(
                    status_code=400,
                    detail="Each image must be 5 MB or smaller."
                )

            extension, signature = ALLOWED_TYPES[content_type]

            if not content.startswith(signature):
                raise HTTPException(
                    status_code=400,
                    detail="An uploaded file does not match its image format."
                )

            if content_type == "image/webp":
                if len(content) < 12 or content[8:12] != b"WEBP":
                    raise HTTPException(
                        status_code=400,
                        detail="An uploaded WEBP image is invalid."
                    )

            path = f"{reference}/{uuid.uuid4().hex}{extension}"

            supabase.storage.from_(BUCKET).upload(
                path,
                content,
                {
                    "content-type": content_type,
                    "upsert": "false"
                }
            )

            uploaded_paths.append(path)

            original_name = (image.filename or "design").replace("\\", "/")
            original_name = original_name.split("/")[-1][:150]

            image_metadata.append({
                "path": path,
                "name": original_name,
                "content_type": content_type,
                "size": len(content)
            })

        data = {
            "reference": reference,
            "customer_name": order.customer_name,
            "phone": order.phone,
            "location": order.location,
            "email": order.email,
            "gender": order.gender,
            "quantity": order.quantity,
            "garment": order.garment,
            "size": order.size,
            "description": order.description,
            "design_images": image_metadata,
            "status": "pending"
        }

        result = supabase.table("orders").insert(data).execute()

        if not result.data:
            raise HTTPException(
                status_code=500,
                detail="Order could not be saved."
            )

        return {
            "success": True,
            "message": "Order received successfully",
            "reference": reference,
            "status": "pending",
            "images_uploaded": len(image_metadata)
        }

    except HTTPException:
        cleanup_uploads(uploaded_paths)
        raise

    except Exception:
        cleanup_uploads(uploaded_paths)
        raise HTTPException(
            status_code=500,
            detail="Unable to process order. Please try again."
        )

    finally:
        for image in design_images:
            await image.close()


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
