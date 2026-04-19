-- CMMS Database Schema (Modernized)
-- Run via: npm run db:init

BEGIN;

-- Extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =========================
-- Reset
-- =========================
DROP TABLE IF EXISTS notifications CASCADE;
DROP TABLE IF EXISTS request_events CASCADE;
DROP TABLE IF EXISTS maintenance_requests CASCADE;
DROP TABLE IF EXISTS devices CASCADE;
DROP TABLE IF EXISTS labs CASCADE;

DROP TABLE IF EXISTS pm_plan_tasks CASCADE;
DROP TABLE IF EXISTS pm_plans CASCADE;

DROP TABLE IF EXISTS priorities CASCADE;
DROP TABLE IF EXISTS audit_logs CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS roles CASCADE;

-- =========================
-- Core / IAM
-- =========================
CREATE TABLE roles (
  id            BIGSERIAL PRIMARY KEY,
  name          TEXT NOT NULL UNIQUE,
  description   TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE users (
  id            BIGSERIAL PRIMARY KEY,
  full_name     TEXT NOT NULL,
  email         TEXT NOT NULL UNIQUE,
  password_hash TEXT,            -- nullable for Google OAuth users
  google_id     TEXT UNIQUE,     -- Google sub ID for OAuth users
  avatar_url    TEXT,            -- Google profile picture
  phone         TEXT,
  department    TEXT,
  job_title     TEXT,
  role_id       BIGINT REFERENCES roles(id),
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,
  last_login_at TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE audit_logs (
  id            BIGSERIAL PRIMARY KEY,
  actor_user_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
  action        TEXT NOT NULL,
  entity_type   TEXT,
  entity_id     TEXT,
  metadata      JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =========================
-- Master Data
-- =========================
CREATE TABLE priorities (
  id          BIGSERIAL PRIMARY KEY,
  name        TEXT NOT NULL UNIQUE,
  sort_order  INT NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE labs (
  id          BIGSERIAL PRIMARY KEY,
  name        TEXT NOT NULL UNIQUE,
  location    TEXT,
  description TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE devices (
  id          BIGSERIAL PRIMARY KEY,
  lab_id      BIGINT REFERENCES labs(id) ON DELETE SET NULL,
  name        TEXT NOT NULL,
  type        TEXT,
  status      TEXT NOT NULL DEFAULT 'Active',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =========================
-- Maintenance Requests
-- =========================
CREATE TABLE maintenance_requests (
  id              BIGSERIAL PRIMARY KEY,
  request_code    TEXT UNIQUE,
  title           TEXT,
  asset_name      TEXT, -- legacy field or quick typing
  location        TEXT, -- legacy field or quick typing
  description     TEXT NOT NULL,
  image_url       TEXT,
  priority_id     BIGINT REFERENCES priorities(id) ON DELETE SET NULL,
  requested_by    BIGINT REFERENCES users(id) ON DELETE SET NULL,
  assigned_to     BIGINT REFERENCES users(id) ON DELETE SET NULL,
  device_id       BIGINT REFERENCES devices(id) ON DELETE SET NULL,
  lab_id          BIGINT REFERENCES labs(id) ON DELETE SET NULL,
  status          TEXT NOT NULL DEFAULT 'New' CHECK (status IN ('New','Assigned','In Progress','Done','Cancelled')),
  requested_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  started_at      TIMESTAMPTZ,
  completed_at    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE request_events (
  id            BIGSERIAL PRIMARY KEY,
  request_id    BIGINT NOT NULL REFERENCES maintenance_requests(id) ON DELETE CASCADE,
  user_id       BIGINT REFERENCES users(id) ON DELETE SET NULL,
  event_type    TEXT NOT NULL CHECK (event_type IN ('status_change', 'comment', 'assignment', 'system')),
  message       TEXT NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE notifications (
  id            BIGSERIAL PRIMARY KEY,
  user_id       BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title         TEXT NOT NULL,
  message       TEXT NOT NULL,
  link          TEXT,
  is_read       BOOLEAN NOT NULL DEFAULT FALSE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =========================
-- Preventive Maintenance
-- =========================
CREATE TABLE pm_plans (
  id              BIGSERIAL PRIMARY KEY,
  name            TEXT NOT NULL,
  description     TEXT,
  frequency_type  TEXT NOT NULL CHECK (frequency_type IN ('days','weeks','months')),
  frequency_value INT NOT NULL,
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE pm_plan_tasks (
  id          BIGSERIAL PRIMARY KEY,
  pm_plan_id  BIGINT NOT NULL REFERENCES pm_plans(id) ON DELETE CASCADE,
  task_name   TEXT NOT NULL,
  sort_order  INT NOT NULL DEFAULT 0
);

-- =========================
-- Seed Data
-- =========================
INSERT INTO roles (name, description)
VALUES
  ('admin','System administrator'),
  ('planner','Maintenance planner'),
  ('technician','Maintenance technician'),
  ('requester','Requester / operator'),
  ('it support','IT Support / Lab technician')
ON CONFLICT (name) DO NOTHING;

-- Default admin user (password: admin123)
INSERT INTO users (full_name, email, password_hash, role_id, is_active)
SELECT
  'System Admin',
  'admin@cmms.local',
  crypt('admin123', gen_salt('bf')),
  r.id,
  TRUE
FROM roles r
WHERE r.name = 'admin'
ON CONFLICT (email) DO NOTHING;

INSERT INTO priorities (name, sort_order)
VALUES
  ('Low', 10),
  ('Medium', 20),
  ('High', 30),
  ('Critical', 40)
ON CONFLICT (name) DO NOTHING;

COMMIT;
