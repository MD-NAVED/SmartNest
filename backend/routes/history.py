from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload
from uuid import UUID

from backend.database import get_db
from backend import models, auth, schemas

router = APIRouter(prefix="/api/history", tags=["History"])

@router.get("", response_model=List[schemas.EventHistoryResponse])
def get_global_history(
    limit: int = 50,
    device_id: Optional[UUID] = None,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    """
    Retrieve global event history logs for all devices owned by the current user.
    """
    # Enforce limit constraints
    if limit > 200:
        limit = 200
    elif limit < 1:
        limit = 1

    # Join DeviceHistory -> Device -> Home to filter by current user's ownership
    query = db.query(models.DeviceHistory).join(models.Device).join(models.Home).filter(
        models.Home.owner_id == current_user.id
    )

    # Optional device_id filter
    if device_id:
        query = query.filter(models.DeviceHistory.device_id == device_id)

    # Order by timestamp desc and apply limit, pre-loading device relation for property getter performance
    return query.options(joinedload(models.DeviceHistory.device)).order_by(
        models.DeviceHistory.timestamp.desc()
    ).limit(limit).all()
