import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from uuid import UUID

from backend.database import get_db
from backend import models, auth, mqtt, schemas

router = APIRouter(prefix="/api/devices", tags=["Devices"])

@router.post("", response_model=schemas.DeviceResponse, status_code=status.HTTP_201_CREATED)
def add_device(
    device_data: schemas.DeviceCreate,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    """Add a new device. Verifies home and room ownership."""
    # Verify home ownership
    home = db.query(models.Home).filter(
        models.Home.id == device_data.home_id,
        models.Home.owner_id == current_user.id
    ).first()
    
    if not home:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Home not found or access denied"
        )
    
    # Verify room is part of the home if provided
    if device_data.room_id:
        room = db.query(models.Room).filter(
            models.Room.id == device_data.room_id,
            models.Room.home_id == device_data.home_id
        ).first()
        if not room:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Room not found inside this home"
            )

    # Check if node_id already exists in database
    existing_node = db.query(models.Device).filter(models.Device.node_id == device_data.node_id).first()
    if existing_node:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Device node '{device_data.node_id}' is already registered"
        )

    # Create the device in DB (starts as offline, default empty state)
    new_device = models.Device(
        name=device_data.name,
        device_type=device_data.device_type,
        node_id=device_data.node_id,
        home_id=device_data.home_id,
        room_id=device_data.room_id,
        is_online=False,
        current_state={}
    )
    db.add(new_device)
    db.commit()
    db.refresh(new_device)

    # Log the device creation in history log
    history_entry = models.DeviceHistory(
        device_id=new_device.id,
        change_type="device_created",
        previous_state=None,
        new_state={}
    )
    db.add(history_entry)
    db.commit()

    return new_device

@router.get("", response_model=List[schemas.DeviceResponse])
def get_devices(
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    """Retrieve all devices owned by the authenticated user across all their homes."""
    return db.query(models.Device).join(models.Home).filter(
        models.Home.owner_id == current_user.id
    ).all()

@router.delete("/{device_id}", status_code=status.HTTP_200_OK)
def remove_device(
    device_id: UUID,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    """Remove a device owned by the authenticated user."""
    device = db.query(models.Device).join(models.Home).filter(
        models.Device.id == device_id,
        models.Home.owner_id == current_user.id
    ).first()

    if not device:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Device not found or access denied"
        )

    db.delete(device)
    db.commit()
    return {"detail": f"Device {device_id} removed successfully."}

@router.post("/{device_id}/control", status_code=status.HTTP_200_OK)
def control_device(
    device_id: UUID,
    control_data: schemas.DeviceControl,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    """
    Control a device's state.
    Publishes an MQTT control message to 'home/device/{node_id}/control'.
    Logs 'command_sent' to the history log immediately.
    The database state is updated when the physical device responds with status.
    """
    device = db.query(models.Device).join(models.Home).filter(
        models.Device.id == device_id,
        models.Home.owner_id == current_user.id
    ).first()

    if not device:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Device not found or access denied"
        )

    previous_state = device.current_state or {}
    requested_state = control_data.state

    # 1. Log "command_sent" in the database history log
    history_entry = models.DeviceHistory(
        device_id=device.id,
        change_type="command_sent",
        previous_state=previous_state,
        new_state=requested_state
    )
    db.add(history_entry)
    db.commit()

    # 2. Publish MQTT control message
    # Topic: home/device/{node_id}/control
    mqtt.publish_control_message(
        node_id=device.node_id,
        state=requested_state
    )

    return {
        "detail": f"Control command sent to device node {device.node_id}.",
        "device_id": device_id,
        "requested_state": requested_state,
        "previous_state": previous_state
    }

@router.get("/{device_id}/history", response_model=List[schemas.DeviceHistoryResponse])
def get_device_history(
    device_id: UUID,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    """Retrieve history log for a specific device owned by the authenticated user."""
    # Ensure device exists and is owned by the user
    device = db.query(models.Device).join(models.Home).filter(
        models.Device.id == device_id,
        models.Home.owner_id == current_user.id
    ).first()

    if not device:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Device not found or access denied"
        )

    # Return history logs ordered by newest first
    return db.query(models.DeviceHistory).filter(
        models.DeviceHistory.device_id == device_id
    ).order_by(models.DeviceHistory.timestamp.desc()).all()
