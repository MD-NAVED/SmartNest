# SmartNest: Home Automation System

SmartNest is a complete, full-stack home automation platform designed to manage smart appliances (lights, fans, ACs) in real-time. It features a Python FastAPI backend integrated with SQLite (SQLAlchemy ORM) and a background MQTT client connecting to the public EMQX cloud broker, alongside a cross-platform React Native mobile client built using Expo and styled with Material Design 3 (React Native Paper).

---

## Features

- **JWT Authentication**: Secure user registration, password hashing (native bcrypt), login, and profile fetching.
- **Device Management**: Add and remove devices with custom names and types (Light, Fan, AC).
- **Asynchronous MQTT Controls**: Toggling device states on the mobile app triggers a `POST` API command, which immediately logs the action and publishes to the MQTT control topic.
- **Real-Time Synchronization**: Smart devices respond to commands and publish state confirmations to the status topic. The backend background thread subscribes to this, updating the database in real-time.
- **Timeline History Log**: Tracks operational logs, separating `device_created`, `command_sent`, and `status_confirmed` events with timestamp metrics.
- **Automatic Local IP Detection**: The Expo client auto-detects your dev machine's local IP address during Metro compilation so that physical mobile devices can connect to the local server seamlessly.

---

## Tech Stack

- **Backend**: Python 3.12+, FastAPI, Uvicorn, SQLAlchemy, SQLite, Paho-MQTT (Classic Client v1.x).
- **Security**: PyJWT/python-jose, native Bcrypt.
- **Mobile Client**: Expo SDK 51, React Native, React Navigation (Stack + Bottom Tabs), React Native Paper (MD3), Axios, AsyncStorage.
- **MQTT Broker**: EMQX Cloud Broker (`broker.emqx.io:1883`).

---

## Project Structure

```text
SmartNest/
├── backend/
│   ├── main.py            # FastAPI entry point & lifecycle hooks
│   ├── auth.py            # JWT token & Bcrypt hashing config
│   ├── mqtt.py            # Background MQTT client loop & callbacks
│   ├── models.py          # SQLAlchemy models (User, Device, DeviceHistory)
│   ├── database.py        # SQLite engine & session setup
│   ├── requirements.txt   # Third-party package dependencies
│   └── routes/
│       ├── users.py       # Register, login, profile APIs
│       └── devices.py     # Listing, creation, deletion, control APIs
├── mobile/
│   ├── App.js             # Mobile entrypoint & Theme Provider
│   ├── app.json           # Expo client configuration
│   ├── package.json       # React Native dependencies
│   └── src/
│       ├── api/
│       │   └── client.js  # Axios setup with auto host-IP resolver
│       ├── context/
│       │   └── AuthContext.js # global auth hook (prevents require cycles)
│       ├── components/
│       │   └── DeviceCard.js  # Card view representing appliance state
│       ├── navigation/
│       │   └── AppNavigator.js# Bottom tabs & stack navigations
│       └── screens/
│           ├── LoginScreen.js
│           ├── RegisterScreen.js
│           ├── HomeScreen.js
│           ├── AddDeviceScreen.js
│           └── HistoryScreen.js
├── mock_device.py         # Virtual smart device simulator (MQTT responder)
├── verify_api.py          # Integration test runner
└── .gitignore             # Git ignore patterns
```

---

## API Endpoints List

### User Routes (`/api/users`)
| Method | Path | Request Body | Headers / Auth | Description |
| :--- | :--- | :--- | :--- | :--- |
| `POST` | `/register` | JSON (`username`, `email`, `password`) | None | Register a new user account |
| `POST` | `/login` | Form Data (`username`, `password`) | None | Verify password & issue JWT |
| `GET` | `/me` | None | `Authorization: Bearer <JWT>` | Retrieve current user profile |

### Device Routes (`/api/devices`)
| Method | Path | Request Body | Headers / Auth | Description |
| :--- | :--- | :--- | :--- | :--- |
| `POST` | `/` | JSON (`name`, `type`) | `Authorization: Bearer <JWT>` | Create a new home device |
| `GET` | `/` | None | `Authorization: Bearer <JWT>` | Retrieve all user-owned devices |
| `DELETE` | `/{device_id}` | None | `Authorization: Bearer <JWT>` | Remove a device and its history |
| `POST` | `/{device_id}/control` | JSON (`status`: `"ON"` \| `"OFF"`) | `Authorization: Bearer <JWT>` | Publish MQTT command & log history |
| `GET` | `/{device_id}/history` | None | `Authorization: Bearer <JWT>` | Fetch operation logs for a device |

---

## How to Run Locally

You can run the entire system locally by opening three separate terminal windows in the root workspace directory.

### Step 1: Start the Backend Server
Make sure you have installed the python dependencies from `backend/requirements.txt`:
```bash
pip install -r backend/requirements.txt
```
Then start the Uvicorn dev server:
```bash
python -m uvicorn backend.main:app --reload
```
The interactive Swagger API documentation will be available at: **[http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)**.

### Step 2: Start the Mock Device Simulator
To simulate smart appliances (like a Light or AC) reacting to MQTT triggers and reporting status confirmations:
```bash
python mock_device.py
```
This script runs in a loop, connects to the public broker, and auto-responds to commands published by the backend.

### Step 3: Run the Expo Mobile App
Install the mobile packages and Metro bundler:
```bash
cd mobile
npm install
```
Start the Expo packager:
```bash
npm start
```
- Press `a` to open in an Android Emulator.
- Press `i` to open in an iOS Simulator.
- Or download **Expo Go** on your physical phone (iOS App Store or Google Play Store) and scan the displayed terminal QR code to run the application on your physical device.

---

## Running Integration Tests

To run the automated suite which mocks the database, registers users, creates/deletes devices, sends toggles, and validates history outputs:
```bash
python verify_api.py
```

---

## License

This project is licensed under the MIT License. Feel free to use, modify, and distribute.
