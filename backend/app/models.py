from pydantic import BaseModel, Field
from typing import Literal


class OrderCreate(BaseModel):
    customer_name: str = Field(min_length=2, max_length=100)
    phone: str = Field(min_length=7, max_length=25)
    location: str = Field(min_length=2, max_length=150)
    garment: Literal[
        "Traditional outfit",
        "Shirt",
        "Dress",
        "Other"
    ]
    size: Literal[
        "Small",
        "Medium",
        "Large",
        "Extra large",
        "Need measurement guidance"
    ]
    description: str = Field(min_length=5, max_length=2000)


OrderStatus = Literal[
    "pending",
    "accepted",
    "in_progress",
    "completed",
    "cancelled"
]


class OrderStatusUpdate(BaseModel):
    status: OrderStatus
