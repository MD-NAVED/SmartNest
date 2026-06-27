-- Enable pgcrypto extension for gen_random_uuid() support
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Drop existing tables if migrating from scratch
DROP TABLE IF EXISTS device_histories CASCADE;
DROP TABLE IF EXISTS devices CASCADE;
DROP TABLE IF EXISTS rooms CASCADE;
DROP TABLE IF EXISTS homes CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- 1. Users Table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    hashed_password VARCHAR(255) NOT NULL
);

-- Indexing for users
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_email ON users(email);

-- 2. Homes Table
CREATE TABLE homes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    owner_id UUID NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    CONSTRAINT fk_homes_owner FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Indexing for homes
CREATE INDEX idx_homes_owner ON homes(owner_id);

-- 3. Rooms Table
CREATE TABLE rooms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    home_id UUID NOT NULL,
    name VARCHAR(100) NOT NULL,
    room_type VARCHAR(50) NOT NULL, -- e.g., living_room, bedroom, kitchen, bathroom
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    CONSTRAINT fk_rooms_home FOREIGN KEY (home_id) REFERENCES homes(id) ON DELETE CASCADE
);

-- Indexing for rooms
CREATE INDEX idx_rooms_home ON rooms(home_id);

-- 4. Devices Table
CREATE TABLE devices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    room_id UUID,
    home_id UUID NOT NULL,
    node_id VARCHAR(100) UNIQUE NOT NULL, -- Unique ESP32 Chip ID String
    name VARCHAR(100) NOT NULL,
    device_type VARCHAR(50) NOT NULL, -- e.g., light, fan, AC
    is_online BOOLEAN DEFAULT FALSE NOT NULL,
    current_state JSONB DEFAULT '{}'::jsonb NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    CONSTRAINT fk_devices_room FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE SET NULL,
    CONSTRAINT fk_devices_home FOREIGN KEY (home_id) REFERENCES homes(id) ON DELETE CASCADE
);

-- Indexing for devices
CREATE INDEX idx_devices_node ON devices(node_id);
CREATE INDEX idx_devices_room ON devices(room_id);
CREATE INDEX idx_devices_home ON devices(home_id);

-- 5. Device Histories Table (Timeline Logs)
CREATE TABLE device_histories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    device_id UUID NOT NULL,
    change_type VARCHAR(50) NOT NULL, -- e.g., command_sent, status_confirmed, device_created
    previous_state JSONB,
    new_state JSONB NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    CONSTRAINT fk_histories_device FOREIGN KEY (device_id) REFERENCES devices(id) ON DELETE CASCADE
);

-- Indexing for history
CREATE INDEX idx_histories_device ON device_histories(device_id);
CREATE INDEX idx_histories_timestamp ON device_histories(timestamp DESC);
