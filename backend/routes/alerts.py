from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from uuid import UUID

from backend.database import get_db
from backend import models, auth, schemas

router = APIRouter(prefix="/api/alerts", tags=["Alerts"])

@router.get("", response_model=List[schemas.AlertResponse])
def get_alerts(
    unread_only: bool = False,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    """Retrieve all alerts for the current user, ordered by newest first."""
    query = db.query(models.Alert).filter(models.Alert.user_id == current_user.id)
    if unread_only:
        query = query.filter(models.Alert.is_read == False)
    return query.order_by(models.Alert.created_at.desc()).all()

@router.patch("/{alert_id}/read", response_model=schemas.AlertResponse)
def mark_alert_read(
    alert_id: UUID,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    """Mark a specific alert as read."""
    alert = db.query(models.Alert).filter(
        models.Alert.id == alert_id,
        models.Alert.user_id == current_user.id
    ).first()
    
    if not alert:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Alert not found or access denied"
        )
        
    alert.is_read = True
    db.commit()
    db.refresh(alert)
    return alert

@router.patch("/read-all", status_code=status.HTTP_200_OK)
def mark_all_alerts_read(
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    """Mark all unread alerts for the current user as read."""
    db.query(models.Alert).filter(
        models.Alert.user_id == current_user.id,
        models.Alert.is_read == False
    ).update({models.Alert.is_read: True}, synchronize_session=False)
    db.commit()
    return {"detail": "All alerts marked as read."}

@router.delete("/{alert_id}", status_code=status.HTTP_200_OK)
def delete_alert(
    alert_id: UUID,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    """Delete a specific alert by ID."""
    alert = db.query(models.Alert).filter(
        models.Alert.id == alert_id,
        models.Alert.user_id == current_user.id
    ).first()
    
    if not alert:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Alert not found or access denied"
        )
        
    db.delete(alert)
    db.commit()
    return {"detail": "Alert deleted successfully."}

@router.delete("", status_code=status.HTTP_200_OK)
def clear_all_alerts(
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    """Clear all alerts for the current user."""
    db.query(models.Alert).filter(models.Alert.user_id == current_user.id).delete(synchronize_session=False)
    db.commit()
    return {"detail": "All alerts cleared successfully."}
