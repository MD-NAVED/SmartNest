from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from backend.database import engine, Base
from backend.routes import users, devices, homes, rooms, schedules, alerts
from backend import mqtt
from apscheduler.schedulers.background import BackgroundScheduler
import datetime
from backend.database import SessionLocal
from backend import models

# Initialize FastAPI App
app = FastAPI(
    title="SmartNest Home Automation Backend",
    description="A backend for managing users, IoT devices, and real-time state synchronization via MQTT.",
    version="1.0.0"
)

# Configure CORS Middleware to allow client-side integrations (web panels, mobile apps)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routes
app.include_router(users.router)
app.include_router(devices.router)
app.include_router(homes.router)
app.include_router(rooms.router)
app.include_router(schedules.router)
app.include_router(alerts.router)

scheduler = BackgroundScheduler()

def check_schedules():
    db = SessionLocal()
    try:
        # User local time offset calculation (IST offset = UTC + 5:30)
        utc_now = datetime.datetime.utcnow()
        now_local = utc_now + datetime.timedelta(hours=5, minutes=30)
        current_time_str = now_local.strftime("%H:%M")
        current_day_str = now_local.strftime("%a").lower()
        
        enabled_schedules = db.query(models.Schedule).filter(models.Schedule.enabled == True).all()
        for schedule in enabled_schedules:
            if schedule.time == current_time_str:
                days_list = [d.strip() for d in schedule.days.split(',')]
                if "daily" in days_list or current_day_str in days_list:
                    device = db.query(models.Device).filter(models.Device.id == schedule.device_id).first()
                    if device:
                        requested_state = { "status": schedule.action }
                        previous_state = device.current_state or {}
                        
                        history_entry = models.DeviceHistory(
                            device_id=device.id,
                            change_type="command_sent",
                            previous_state=previous_state,
                            new_state=requested_state
                        )
                        db.add(history_entry)

                        alert_entry = models.Alert(
                            user_id=schedule.user_id,
                            device_id=device.id,
                            type="schedule_run",
                            message=f"Schedule auto-toggled appliance '{device.name}' to {schedule.action} state.",
                            is_read=False
                        )
                        db.add(alert_entry)
                        
                        mqtt.publish_control_message(
                            node_id=device.node_id,
                            state=requested_state
                        )
                        print(f"[Scheduler] Fired schedule {schedule.id} for device {device.name} -> {schedule.action}")
        db.commit()
    except Exception as e:
        print("[Scheduler] Error running schedules job:", e)
    finally:
        db.close()

# FastAPI Event Handlers
@app.on_event("startup")
def startup_event():
    # Create database tables if they do not exist
    Base.metadata.create_all(bind=engine)
    print("Database tables initialized.")

    # Start MQTT connection and client background loop
    mqtt.start_mqtt()
    print("MQTT background listener started.")

    # Start schedules background worker
    scheduler.add_job(check_schedules, 'interval', minutes=1)
    scheduler.start()
    print("Scheduler daemon process started.")

@app.on_event("shutdown")
def shutdown_event():
    # Stop the MQTT client loop and disconnect
    mqtt.stop_mqtt()
    print("MQTT listener stopped and disconnected.")

    # Stop scheduler
    scheduler.shutdown()
    print("Scheduler stopped.")

@app.get("/")
def read_root():
    """Welcome endpoint to verify backend status."""
    return {
        "status": "online",
        "service": "SmartNest Home Automation API",
        "mqtt_broker": mqtt.MQTT_BROKER,
        "docs_url": "/docs"
    }

if __name__ == "__main__":
    import uvicorn
    # When run directly, start uvicorn server on port 8000
    uvicorn.run("backend.main:app", host="0.0.0.0", port=8000, reload=True)
