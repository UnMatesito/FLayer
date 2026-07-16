from uuid import UUID

from pydantic import BaseModel, field_validator

VALID_TRANSITIONS: dict[str, set[str]] = {
    "new": {"in_progress", "cancelled"},
    "in_progress": {"ready", "cancelled"},
    "ready": {"delivered", "cancelled"},
    "delivered": set(),
    "cancelled": set(),
}


class StatusUpdateRequest(BaseModel):
    status: str

    @field_validator("status")
    @classmethod
    def status_not_empty(cls, v: str) -> str:
        stripped = v.strip()
        if not stripped:
            raise ValueError("Status must not be empty")
        return stripped


class StatusUpdateResponse(BaseModel):
    id: UUID
    status: str

    model_config = {"from_attributes": True}


class OrderStatusResponse(BaseModel):
    id: UUID
    name: str

    model_config = {"from_attributes": True}
