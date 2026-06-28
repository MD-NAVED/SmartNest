import os
import json
import logging
import random
from datetime import datetime
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
        # Subscribe to status confirmation updates for all device nodes
        # Topic pattern: home/device/{node_id}/status
        subscribe_topic = "home/device/+/status"
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
        # Parse topic: home/device/{node_id}/status
        parts = msg.topic.split('/')
        if len(parts) == 4 and parts[0] == "home" and parts[1] == "device" and parts[3] == "status":
            node_id = parts[2]
            
            # Parse payload as JSON
            payload_str = msg.payload.decode("utf-8").strip()
            try:
                state_data = json.loads(payload_str)
            except json.JSONDecodeError:
                logger.error("Invalid JSON payload received on node %s: %s", node_id, payload_str)
                return
            
            if not isinstance(state_data, dict):
                logger.error("Payload must be a JSON object: %s", payload_str)
                return

            # Update database in callback thread
            db: Session = SessionLocal()
            try:
                # Query device by node_id
                device = db.query(models.Device).filter(models.Device.node_id == node_id).first()
                
                if device:
                    previous_state = device.current_state or {}
                    was_offline = not device.is_online
                    
                    # Merge new state data into current_state
                    new_state = {**previous_state, **state_data}
                    
                    # If state changed, update database and log history
                    if previous_state != new_state:
                        device.current_state = new_state
                        device.is_online = True
                        device.updated_at = datetime.utcnow()
                        db.add(device)
                        
                        # Log history as status_confirmed
                        history_entry = models.DeviceHistory(
                            device_id=device.id,
                            change_type="status_confirmed",
                            previous_state=previous_state,
                            new_state=state_data
                        )
                        db.add(history_entry)

                        if was_offline:
                            alert_entry = models.Alert(
                                user_id=device.home.owner_id,
                                device_id=device.id,
                                type="device_online",
                                message=f"Smart Nest Device '{device.name}' is now ONLINE and connected to Gateway.",
                                is_read=False
                            )
                            db.add(alert_entry)

                        db.commit()
                        logger.info("Device node %s status confirmed via MQTT: %s", node_id, state_data)
                    else:
                        # Keep online status active
                        if was_offline:
                            device.is_online = True
                            device.updated_at = datetime.utcnow()
                            db.add(device)

                            alert_entry = models.Alert(
                                user_id=device.home.owner_id,
                                device_id=device.id,
                                type="device_online",
                                message=f"Smart Nest Device '{device.name}' is now ONLINE and connected to Gateway.",
                                is_read=False
                            )
                            db.add(alert_entry)
                            db.commit()
                        logger.info("Device node %s state is already up-to-date.", node_id)
                else:
                    logger.warning("Device node %s not found in database.", node_id)
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

def publish_control_message(node_id: str, state: dict):
    """
    Publish a control message to control a device.
    Topic: home/device/{node_id}/control
    Payload: JSON string of state updates (e.g. {"status": "ON"})
    """
    topic = f"home/device/{node_id}/control"
    payload = json.dumps(state)
    
    try:
        info = client.publish(topic, payload, qos=1)
        # wait_for_publish ensures it's sent or errors
        info.wait_for_publish(timeout=2.0)
        logger.info("Published control message to %s: %s", topic, payload)
    except Exception as e:
        logger.error("Failed to publish control message to %s: %s", topic, e)
