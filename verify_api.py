import os
import unittest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

# Import our backend components
# Set environment variables for testing before importing main
TEST_DB_FILE = "./test_smartnest.db"
os.environ["DATABASE_URL"] = f"sqlite:///{TEST_DB_FILE}"
# Disable real MQTT connections during unit testing to avoid network dependencies
os.environ["MQTT_BROKER"] = "localhost"  # dummy host

from backend.main import app
from backend.database import Base, get_db
from backend import models

# Configure test database engine and session
engine = create_engine(f"sqlite:///{TEST_DB_FILE}", connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()

# Apply dependency override
app.dependency_overrides[get_db] = override_get_db

class TestSmartNestBackend(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        # Create database tables
        Base.metadata.create_all(bind=engine)
        cls.client = TestClient(app)

    @classmethod
    def tearDownClass(cls):
        # Drop database tables and remove test DB file
        Base.metadata.drop_all(bind=engine)
        engine.dispose()
        
        # Also dispose main backend engine to release any connections it holds
        try:
            from backend.database import engine as main_engine
            main_engine.dispose()
        except Exception:
            pass
            
        if os.path.exists(TEST_DB_FILE):
            try:
                os.remove(TEST_DB_FILE)
            except Exception as e:
                print(f"Warning: Could not remove test DB file: {e}")

    def test_full_workflow(self):
        # 1. Register a new user
        register_payload = {
            "username": "testuser",
            "email": "testuser@example.com",
            "password": "securepassword123"
        }
        response = self.client.post("/api/users/register", json=register_payload)
        self.assertEqual(response.status_code, 201)
        data = response.json()
        self.assertEqual(data["username"], "testuser")
        self.assertEqual(data["email"], "testuser@example.com")
        self.assertIn("id", data)
        user_id = data["id"]

        # 2. Try registering duplicate username
        response_dup = self.client.post("/api/users/register", json=register_payload)
        self.assertEqual(response_dup.status_code, 400)

        # 3. Login to retrieve access token
        login_payload = {
            "username": "testuser",
            "password": "securepassword123"
        }
        response = self.client.post("/api/users/login", data=login_payload)
        self.assertEqual(response.status_code, 200)
        token_data = response.json()
        self.assertIn("access_token", token_data)
        self.assertEqual(token_data["token_type"], "bearer")
        token = token_data["access_token"]
        headers = {"Authorization": f"Bearer {token}"}

        # 4. Fetch currently authenticated user
        response = self.client.get("/api/users/me", headers=headers)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["username"], "testuser")

        # 5. Add a new device
        device_payload = {
            "name": "Living Room Fan",
            "type": "fan"
        }
        response = self.client.post("/api/devices", json=device_payload, headers=headers)
        self.assertEqual(response.status_code, 201)
        device_data = response.json()
        self.assertEqual(device_data["name"], "Living Room Fan")
        self.assertEqual(device_data["type"], "fan")
        self.assertEqual(device_data["status"], False)  # Starts OFF
        device_id = device_data["id"]

        # 6. List devices
        response = self.client.get("/api/devices", headers=headers)
        self.assertEqual(response.status_code, 200)
        devices_list = response.json()
        self.assertEqual(len(devices_list), 1)
        self.assertEqual(devices_list[0]["id"], device_id)

        # 7. Control the device (Send ON command)
        # Note: In testing, this attempts to publish MQTT control message.
        # We override MQTT broker host to localhost to fail/timeout gracefully or fail silently.
        control_payload = {"status": "ON"}
        response = self.client.post(f"/api/devices/{device_id}/control", json=control_payload, headers=headers)
        self.assertEqual(response.status_code, 200)
        control_res = response.json()
        self.assertEqual(control_res["requested_status"], "ON")

        # 8. Check device history logs (should show device_created and command_sent)
        response = self.client.get(f"/api/devices/{device_id}/history", headers=headers)
        self.assertEqual(response.status_code, 200)
        history_list = response.json()
        # History logs are ordered newest first
        self.assertTrue(len(history_list) >= 2)
        
        # Verify the top log is command_sent
        self.assertEqual(history_list[0]["change_type"], "command_sent")
        self.assertEqual(history_list[0]["previous_state"], "OFF")
        self.assertEqual(history_list[0]["new_state"], "ON")
        
        # Verify the older log is device_created
        self.assertEqual(history_list[1]["change_type"], "device_created")
        self.assertIsNone(history_list[1]["previous_state"])
        self.assertEqual(history_list[1]["new_state"], "OFF")

        # 9. Remove device
        response = self.client.delete(f"/api/devices/{device_id}", headers=headers)
        self.assertEqual(response.status_code, 200)

        # 10. Confirm device list is empty
        response = self.client.get("/api/devices", headers=headers)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.json()), 0)

if __name__ == "__main__":
    unittest.main()
