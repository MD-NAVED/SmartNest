from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from backend.database import engine, Base
from backend.routes import users, devices
from backend import mqtt

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

# FastAPI Event Handlers
@app.on_event("startup")
def startup_event():
    # Create SQLite database tables if they do not exist
    Base.metadata.create_all(bind=engine)
    print("Database tables initialized.")

    # Start MQTT connection and client background loop
    mqtt.start_mqtt()
    print("MQTT background listener started.")

@app.on_event("shutdown")
def shutdown_event():
    # Stop the MQTT client loop and disconnect
    mqtt.stop_mqtt()
    print("MQTT listener stopped and disconnected.")

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
