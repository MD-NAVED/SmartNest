import os
import json
import logging
import random
import paho.mqtt.client as mqtt
from sqlalchemy.orm import Session
from backend.database import SessionLocal
from backend import models

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("MQTT")

# MQTT Configuration
MQTT_BROKER = os.getenv("MQTT_BROKER", "broker.emqx.io")
MQTT_PORT = int(os.getenv("MQTT_PORT", "1883"))
MQTT_KEEPALIVE = int(os.getenv("MQTT_KEEPALIVE", "60"))
# Append a random integer suffix to make the client ID unique on the public broker
MQTT_CLIENT_ID = os.getenv("MQTT_CLIENT_ID", f"smartnest_backend_{random.randint(10000, 99999)}")

# Initialize global MQTT client
client = mqtt.Client(client_id=MQTT_CLIENT_ID)

def on_connect(client, userdata, flags, rc):
    """Callback when client connects to broker."""
    if rc == 0:
        logger.info("Connected successfully to MQTT Broker: %s:%d", MQTT_BROKER, MQTT_PORT)
        # Subscribe to status confirmation updates
        # Topic pattern: home/{user_id}/{device_id}/status
        subscribe_topic = "home/+/+/status"
        client.subscribe(subscribe_topic)
        logger.info("Subscribed to status topic: %s", subscribe_topic)
    else:
        logger.error("Failed to connect to MQTT Broker, return code %d", rc)

def on_disconnect(client, userdata, rc):
    """Callback when client disconnects from broker."""
    logger.warning("Disconnected from MQTT Broker. Return code: %s", rc)

def on_message(client, userdata, msg):
    """Callback when a message is received from the broker."""
    logger.info("Received MQTT message on topic: %s, payload: %s", msg.topic, msg.payload)
    try:
        # Parse topic: home/{user_id}/{device_id}/status
        parts = msg.topic.split('/')
        if len(parts) == 4 and parts[0] == "home" and parts[3] == "status":
            if not parts[1].isdigit() or not parts[2].isdigit():
                # Ignore messages with non-integer user or device IDs (from other users on the public broker)
                return
            user_id = int(parts[1])
            device_id = int(parts[2])
            
            # Parse payload
            payload_str = msg.payload.decode("utf-8").strip()
            status_str = None
            
            # Try parsing as JSON first
            try:
                data = json.loads(payload_str)
                if isinstance(data, dict):
                    status_str = data.get("status")
            except json.JSONDecodeError:
                pass
            
            # If not JSON, use the raw string
            if not status_str:
                status_str = payload_str
            
            status_str = status_str.upper()
            if status_str not in ["ON", "OFF"]:
                logger.error("Invalid status payload: %s", payload_str)
                return

            new_status_bool = (status_str == "ON")
            
            # Update database
            # We must open a new session in the callback thread
            db: Session = SessionLocal()
            try:
                # Query device and check ownership
                device = db.query(models.Device).filter(
                    models.Device.id == device_id,
                    models.Device.owner_id == user_id
                ).first()
                
                if device:
                    previous_state_str = "ON" if device.status else "OFF"
                    
                    # Update status in db if it changed or to verify state
                    if device.status != new_status_bool:
                        device.status = new_status_bool
                        db.add(device)
                        
                        # Log history as status_confirmed
                        history_entry = models.DeviceHistory(
                            device_id=device.id,
                            change_type="status_confirmed",
                            previous_state=previous_state_str,
                            new_state=status_str
                        )
                        db.add(history_entry)
                        db.commit()
                        logger.info("Device %d status confirmed via MQTT: %s", device_id, status_str)
                    else:
                        logger.info("Device %d status is already %s. No change needed.", device_id, status_str)
                else:
                    logger.warning("Device %d (user %d) not found in database.", device_id, user_id)
            except Exception as e:
                db.rollback()
                logger.exception("Error processing MQTT message in DB: %s", e)
            finally:
                db.close()
    except Exception as e:
        logger.exception("General error in MQTT on_message: %s", e)

# Setup callbacks
client.on_connect = on_connect
client.on_disconnect = on_disconnect
client.on_message = on_message

def start_mqtt():
    """Connect to broker and start loop in a background thread."""
    try:
        client.connect(MQTT_BROKER, MQTT_PORT, MQTT_KEEPALIVE)
        client.loop_start()
        logger.info("MQTT loop started.")
    except Exception as e:
        logger.exception("Failed to connect/start MQTT: %s", e)

def stop_mqtt():
    """Stop MQTT loop and disconnect."""
    client.loop_stop()
    client.disconnect()
    logger.info("MQTT loop stopped and disconnected.")

def publish_control_message(user_id: int, device_id: int, status_str: str):
    """
    Publish a control message to control a device.
    Topic: home/{user_id}/{device_id}/control
    Payload: {"status": "ON"} or {"status": "OFF"}
    """
    topic = f"home/{user_id}/{device_id}/control"
    payload = json.dumps({"status": status_str.upper()})
    
    try:
        info = client.publish(topic, payload, qos=1)
        # wait_for_publish ensures it's sent or errors
        info.wait_for_publish(timeout=2.0)
        logger.info("Published control message to %s: %s", topic, payload)
    except Exception as e:
        logger.error("Failed to publish control message to %s: %s", topic, e)
