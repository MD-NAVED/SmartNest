import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel, Field, field_validator

from backend.database import get_db
from backend import models, auth, mqtt

router = APIRouter(prefix="/api/devices", tags=["Devices"])

# Pydantic Schemas
class DeviceCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    type: str = Field(..., description="Must be 'light', 'fan', or 'AC'")

    @field_validator("type")
    @classmethod
    def validate_type(cls, v: str) -> str:
        valid_types = ["light", "fan", "AC"]
        if v not in valid_types:
            raise ValueError(f"Device type must be one of {valid_types}")
        return v

class DeviceResponse(BaseModel):
    id: int
    name: str
    type: str
    status: bool
    owner_id: int

    model_config = {
        "from_attributes": True
    }

class DeviceControl(BaseModel):
    status: str = Field(..., description="Must be 'ON' or 'OFF'")

    @field_validator("status")
    @classmethod
    def validate_status(cls, v: str) -> str:
        v_upper = v.upper()
        if v_upper not in ["ON", "OFF"]:
            raise ValueError("Status must be 'ON' or 'OFF'")
        return v_upper

class DeviceHistoryResponse(BaseModel):
    id: int
    device_id: int
    change_type: str
    previous_state: Optional[str] = None
    new_state: str
    timestamp: datetime.datetime

    model_config = {
        "from_attributes": True
    }


@router.post("", response_model=DeviceResponse, status_code=status.HTTP_201_CREATED)
def add_device(
    device_data: DeviceCreate,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    """Add a new device for the authenticated user."""
    # Create the device in DB (starts as OFF)
    new_device = models.Device(
        name=device_data.name,
        type=device_data.type,
        status=False,
        owner_id=current_user.id
    )
    db.add(new_device)
    db.commit()
    db.refresh(new_device)

    # Log the device creation in history
    history_entry = models.DeviceHistory(
        device_id=new_device.id,
        change_type="device_created",
        previous_state=None,
        new_state="OFF"
    )
    db.add(history_entry)
    db.commit()

    return new_device


@router.get("", response_model=List[DeviceResponse])
def get_devices(
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    """Retrieve all devices owned by the authenticated user."""
    return db.query(models.Device).filter(models.Device.owner_id == current_user.id).all()


@router.delete("/{device_id}", status_code=status.HTTP_200_OK)
def remove_device(
    device_id: int,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    """Remove a device owned by the authenticated user."""
    device = db.query(models.Device).filter(
        models.Device.id == device_id,
        models.Device.owner_id == current_user.id
    ).first()

    if not device:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Device not found or not owned by user"
        )

    db.delete(device)
    db.commit()
    return {"detail": f"Device {device_id} removed successfully."}


@router.post("/{device_id}/control", status_code=status.HTTP_200_OK)
def control_device(
    device_id: int,
    control_data: DeviceControl,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    """
    Control a device's ON/OFF state.
    Publishes an MQTT control message to 'home/{user_id}/{device_id}/control'.
    Logs 'command_sent' to the history log immediately.
    The database state is updated when the physical device responds with status.
    """
    device = db.query(models.Device).filter(
        models.Device.id == device_id,
        models.Device.owner_id == current_user.id
    ).first()

    if not device:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Device not found or not owned by user"
        )

    requested_status = control_data.status
    previous_status_str = "ON" if device.status else "OFF"

    # 1. Log "command_sent" in the database history log
    history_entry = models.DeviceHistory(
        device_id=device.id,
        change_type="command_sent",
        previous_state=previous_status_str,
        new_state=requested_status
    )
    db.add(history_entry)
    db.commit()

    # 2. Publish MQTT control message
    # Topic: home/{user_id}/{device_id}/control
    mqtt.publish_control_message(
        user_id=current_user.id,
        device_id=device.id,
        status_str=requested_status
    )

    return {
        "detail": f"Control command '{requested_status}' sent to device {device_id}.",
        "device_id": device_id,
        "requested_status": requested_status,
        "previous_status": previous_status_str
    }


@router.get("/{device_id}/history", response_model=List[DeviceHistoryResponse])
def get_device_history(
    device_id: int,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    """Retrieve history log for a specific device owned by the authenticated user."""
    # Ensure device exists and is owned by the user
    device = db.query(models.Device).filter(
        models.Device.id == device_id,
        models.Device.owner_id == current_user.id
    ).first()

    if not device:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Device not found or not owned by user"
        )

    # Return history logs ordered by newest first
    return db.query(models.DeviceHistory).filter(
        models.DeviceHistory.device_id == device_id
    ).order_by(models.DeviceHistory.timestamp.desc()).all()
