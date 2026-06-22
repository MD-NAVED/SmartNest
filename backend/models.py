import datetime
from sqlalchemy import Column, Integer, String, Boolean, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from backend.database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)

    # Relationships
    devices = relationship("Device", back_populates="owner", cascade="all, delete-orphan")


class Device(Base):
    __tablename__ = "devices"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    type = Column(String, nullable=False)  # "light", "fan", "AC"
    status = Column(Boolean, default=False, nullable=False)  # False = OFF, True = ON
    owner_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)

    # Relationships
    owner = relationship("User", back_populates="devices")
    history = relationship("DeviceHistory", back_populates="device", cascade="all, delete-orphan")


class DeviceHistory(Base):
    __tablename__ = "device_histories"

    id = Column(Integer, primary_key=True, index=True)
    device_id = Column(Integer, ForeignKey("devices.id", ondelete="CASCADE"), nullable=False)
    change_type = Column(String, nullable=False)  # "command_sent" or "status_confirmed"
    previous_state = Column(String, nullable=True)  # "ON" or "OFF"
    new_state = Column(String, nullable=False)  # "ON" or "OFF"
    timestamp = Column(DateTime, default=datetime.datetime.utcnow, nullable=False)

    # Relationships
    device = relationship("Device", back_populates="history")
