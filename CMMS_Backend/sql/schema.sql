-- CMMS Database Schema (PostgreSQL)
-- Run via: npm run db:init

BEGIN;

-- Extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =========================
-- Reset (drop old tables to avoid mismatched schemas)
-- =========================
DROP TABLE IF EXISTS pm_plan_tasks CASCADE;
DROP TABLE IF EXISTS pm_plan_assets CASCADE;
DROP TABLE IF EXISTS pm_plans CASCADE;

DROP TABLE IF EXISTS purchase_order_lines CASCADE;
DROP TABLE IF EXISTS purchase_orders CASCADE;
DROP TABLE IF EXISTS suppliers CASCADE;

DROP TABLE IF EXISTS work_order_parts CASCADE;
DROP TABLE IF EXISTS inventory_transactions CASCADE;
DROP TABLE IF EXISTS inventory CASCADE;
DROP TABLE IF EXISTS warehouses CASCADE;
DROP TABLE IF EXISTS parts CASCADE;

DROP TABLE IF EXISTS request_events CASCADE;
DROP TABLE IF EXISTS work_order_comments CASCADE;
DROP TABLE IF EXISTS work_order_tasks CASCADE;
DROP TABLE IF EXISTS work_orders CASCADE;
DROP TABLE IF EXISTS work_order_statuses CASCADE;

DROP TABLE IF EXISTS maintenance_requests CASCADE;

DROP TABLE IF EXISTS meter_readings CASCADE;
DROP TABLE IF EXISTS meters CASCADE;

DROP TABLE IF EXISTS asset_documents CASCADE;
DROP TABLE IF EXISTS assets CASCADE;
DROP TABLE IF EXISTS asset_statuses CASCADE;
DROP TABLE IF EXISTS asset_categories CASCADE;
DROP TABLE IF EXISTS locations CASCADE;
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
CREATE TABLE locations (
  id          BIGSERIAL PRIMARY KEY,
  name        TEXT NOT NULL,
  code        TEXT UNIQUE,
  parent_id   BIGINT REFERENCES locations(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE asset_categories (
  id          BIGSERIAL PRIMARY KEY,
  name        TEXT NOT NULL UNIQUE,
  description TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE asset_statuses (
  id          BIGSERIAL PRIMARY KEY,
  name        TEXT NOT NULL UNIQUE,
  is_operational BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE priorities (
  id          BIGSERIAL PRIMARY KEY,
  name        TEXT NOT NULL UNIQUE,
  sort_order  INT NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =========================
-- Assets
-- =========================
CREATE TABLE assets (
  id              BIGSERIAL PRIMARY KEY,
  asset_code      TEXT UNIQUE,
  asset_name      TEXT NOT NULL,
  asset_type      TEXT, -- compatibility / quick typing
  category_id     BIGINT REFERENCES asset_categories(id) ON DELETE SET NULL,
  status_id       BIGINT REFERENCES asset_statuses(id) ON DELETE SET NULL,
  location_id     BIGINT REFERENCES locations(id) ON DELETE SET NULL,
  manufacturer    TEXT,
  model           TEXT,
  serial_number   TEXT,
  purchase_date   DATE,
  warranty_end    DATE,
  criticality     INT NOT NULL DEFAULT 3 CHECK (criticality BETWEEN 1 AND 5),
  notes           TEXT,
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_assets_location_id ON assets(location_id);
CREATE INDEX IF NOT EXISTS idx_assets_category_id ON assets(category_id);

CREATE TABLE asset_documents (
  id          BIGSERIAL PRIMARY KEY,
  asset_id    BIGINT NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
  file_name   TEXT NOT NULL,
  file_url    TEXT,
  mime_type   TEXT,
  uploaded_by BIGINT REFERENCES users(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =========================
-- Meters
-- =========================
CREATE TABLE meters (
  id          BIGSERIAL PRIMARY KEY,
  asset_id    BIGINT NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  unit        TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(asset_id, name)
);

CREATE TABLE meter_readings (
  id            BIGSERIAL PRIMARY KEY,
  meter_id      BIGINT NOT NULL REFERENCES meters(id) ON DELETE CASCADE,
  reading_value NUMERIC(18,3) NOT NULL,
  read_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  read_by       BIGINT REFERENCES users(id) ON DELETE SET NULL,
  note          TEXT
);

CREATE INDEX IF NOT EXISTS idx_meter_readings_meter_id ON meter_readings(meter_id);

-- =========================
-- Maintenance Requests & Tracking
-- =========================
CREATE TABLE maintenance_requests (
  id              BIGSERIAL PRIMARY KEY,
  request_code    TEXT UNIQUE,
  asset_name      TEXT,
  location        TEXT,
  description     TEXT NOT NULL,
  image_url       TEXT,
  priority_id     BIGINT REFERENCES priorities(id) ON DELETE SET NULL,
  requested_by    BIGINT REFERENCES users(id) ON DELETE SET NULL,
  assigned_to     BIGINT REFERENCES users(id) ON DELETE SET NULL,
  requested_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  started_at      TIMESTAMPTZ,
  completed_at    TIMESTAMPTZ,
  status          TEXT NOT NULL DEFAULT 'New' CHECK (status IN ('New','Assigned','In Progress','Done','Cancelled')),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =========================
-- Request Events (Timeline)
-- =========================
CREATE TABLE request_events (
  id            BIGSERIAL PRIMARY KEY,
  request_id    BIGINT NOT NULL REFERENCES maintenance_requests(id) ON DELETE CASCADE,
  user_id       BIGINT REFERENCES users(id) ON DELETE SET NULL,
  event_type    TEXT NOT NULL CHECK (event_type IN ('status_change', 'comment', 'assignment', 'system')),
  message       TEXT NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_maintenance_requests_status ON maintenance_requests(status);

-- =========================
-- Work Orders
-- =========================
CREATE TABLE work_order_statuses (
  id          BIGSERIAL PRIMARY KEY,
  name        TEXT NOT NULL UNIQUE,
  is_closed   BOOLEAN NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE work_orders (
  id                  BIGSERIAL PRIMARY KEY,
  wo_number           TEXT UNIQUE,
  title               TEXT NOT NULL,
  description         TEXT,
  asset_id            BIGINT REFERENCES assets(id) ON DELETE SET NULL,
  location_id         BIGINT REFERENCES locations(id) ON DELETE SET NULL,
  priority_id         BIGINT REFERENCES priorities(id) ON DELETE SET NULL,
  status_id           BIGINT REFERENCES work_order_statuses(id) ON DELETE SET NULL,
  maintenance_request_id BIGINT REFERENCES maintenance_requests(id) ON DELETE SET NULL,
  requested_by        BIGINT REFERENCES users(id) ON DELETE SET NULL,
  assigned_to         BIGINT REFERENCES users(id) ON DELETE SET NULL,
  scheduled_start_at  TIMESTAMPTZ,
  scheduled_end_at    TIMESTAMPTZ,
  started_at          TIMESTAMPTZ,
  completed_at        TIMESTAMPTZ,
  downtime_minutes    INT NOT NULL DEFAULT 0,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_work_orders_asset_id ON work_orders(asset_id);
CREATE INDEX IF NOT EXISTS idx_work_orders_status_id ON work_orders(status_id);

CREATE TABLE work_order_tasks (
  id            BIGSERIAL PRIMARY KEY,
  work_order_id BIGINT NOT NULL REFERENCES work_orders(id) ON DELETE CASCADE,
  task_name     TEXT NOT NULL,
  is_done       BOOLEAN NOT NULL DEFAULT FALSE,
  sort_order    INT NOT NULL DEFAULT 0
);

CREATE TABLE work_order_comments (
  id            BIGSERIAL PRIMARY KEY,
  work_order_id BIGINT NOT NULL REFERENCES work_orders(id) ON DELETE CASCADE,
  author_user_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
  body          TEXT NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =========================
-- Parts & Inventory
-- =========================
CREATE TABLE parts (
  id            BIGSERIAL PRIMARY KEY,
  part_number   TEXT UNIQUE,
  name          TEXT NOT NULL,
  description   TEXT,
  unit          TEXT NOT NULL DEFAULT 'pcs',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE warehouses (
  id          BIGSERIAL PRIMARY KEY,
  name        TEXT NOT NULL UNIQUE,
  location_id BIGINT REFERENCES locations(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE inventory (
  id            BIGSERIAL PRIMARY KEY,
  warehouse_id  BIGINT NOT NULL REFERENCES warehouses(id) ON DELETE CASCADE,
  part_id       BIGINT NOT NULL REFERENCES parts(id) ON DELETE CASCADE,
  qty_on_hand   NUMERIC(18,3) NOT NULL DEFAULT 0,
  min_qty       NUMERIC(18,3) NOT NULL DEFAULT 0,
  max_qty       NUMERIC(18,3),
  reorder_point NUMERIC(18,3),
  UNIQUE(warehouse_id, part_id)
);

CREATE TABLE inventory_transactions (
  id            BIGSERIAL PRIMARY KEY,
  warehouse_id  BIGINT NOT NULL REFERENCES warehouses(id) ON DELETE CASCADE,
  part_id       BIGINT NOT NULL REFERENCES parts(id) ON DELETE CASCADE,
  qty_delta     NUMERIC(18,3) NOT NULL,
  reason        TEXT NOT NULL,
  ref_type      TEXT,
  ref_id        TEXT,
  created_by    BIGINT REFERENCES users(id) ON DELETE SET NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_inventory_transactions_part ON inventory_transactions(part_id);

CREATE TABLE work_order_parts (
  id            BIGSERIAL PRIMARY KEY,
  work_order_id BIGINT NOT NULL REFERENCES work_orders(id) ON DELETE CASCADE,
  part_id       BIGINT NOT NULL REFERENCES parts(id) ON DELETE RESTRICT,
  warehouse_id  BIGINT REFERENCES warehouses(id) ON DELETE SET NULL,
  qty_used      NUMERIC(18,3) NOT NULL DEFAULT 1,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =========================
-- Suppliers & Purchasing
-- =========================
CREATE TABLE suppliers (
  id          BIGSERIAL PRIMARY KEY,
  name        TEXT NOT NULL UNIQUE,
  phone       TEXT,
  email       TEXT,
  address     TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE purchase_orders (
  id            BIGSERIAL PRIMARY KEY,
  po_number     TEXT UNIQUE,
  supplier_id   BIGINT REFERENCES suppliers(id) ON DELETE SET NULL,
  status        TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','submitted','approved','received','cancelled')),
  ordered_by    BIGINT REFERENCES users(id) ON DELETE SET NULL,
  ordered_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  notes         TEXT
);

CREATE TABLE purchase_order_lines (
  id              BIGSERIAL PRIMARY KEY,
  purchase_order_id BIGINT NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
  part_id         BIGINT REFERENCES parts(id) ON DELETE SET NULL,
  description     TEXT,
  qty             NUMERIC(18,3) NOT NULL,
  unit_price      NUMERIC(18,2) NOT NULL DEFAULT 0,
  received_qty    NUMERIC(18,3) NOT NULL DEFAULT 0
);

-- =========================
-- Preventive Maintenance
-- =========================
CREATE TABLE pm_plans (
  id              BIGSERIAL PRIMARY KEY,
  name            TEXT NOT NULL,
  description     TEXT,
  frequency_type  TEXT NOT NULL CHECK (frequency_type IN ('days','weeks','months','meter')),
  frequency_value INT NOT NULL,
  meter_id        BIGINT REFERENCES meters(id) ON DELETE SET NULL,
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE pm_plan_assets (
  id        BIGSERIAL PRIMARY KEY,
  pm_plan_id BIGINT NOT NULL REFERENCES pm_plans(id) ON DELETE CASCADE,
  asset_id  BIGINT NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
  UNIQUE(pm_plan_id, asset_id)
);

CREATE TABLE pm_plan_tasks (
  id          BIGSERIAL PRIMARY KEY,
  pm_plan_id  BIGINT NOT NULL REFERENCES pm_plans(id) ON DELETE CASCADE,
  task_name   TEXT NOT NULL,
  sort_order  INT NOT NULL DEFAULT 0
);

-- =========================
-- Seed core reference data (idempotent)
-- =========================
INSERT INTO roles (name, description)
VALUES
  ('admin','System administrator'),
  ('planner','Maintenance planner'),
  ('technician','Maintenance technician'),
  ('requester','Requester / operator')
ON CONFLICT (name) DO NOTHING;

-- Default admin user (password: admin123)
-- Uses pgcrypto's bcrypt-compatible crypt() so Node can verify with bcrypt.
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

-- Demo technician (password: tech123)
INSERT INTO users (full_name, email, password_hash, role_id, is_active)
SELECT
  'Maintenance Tech',
  'tech@cmms.local',
  crypt('tech123', gen_salt('bf')),
  r.id,
  TRUE
FROM roles r
WHERE r.name = 'technician'
ON CONFLICT (email) DO NOTHING;

-- Demo requester (password: user123) (e.g., doctor/student/assistant)
INSERT INTO users (full_name, email, password_hash, role_id, is_active)
SELECT
  'Requester User',
  'user@cmms.local',
  crypt('user123', gen_salt('bf')),
  r.id,
  TRUE
FROM roles r
WHERE r.name = 'requester'
ON CONFLICT (email) DO NOTHING;

INSERT INTO asset_statuses (name, is_operational)
VALUES
  ('Operational', TRUE),
  ('Down', FALSE),
  ('In Repair', FALSE),
  ('Standby', TRUE),
  ('Decommissioned', FALSE)
ON CONFLICT (name) DO NOTHING;

INSERT INTO priorities (name, sort_order)
VALUES
  ('Low', 10),
  ('Medium', 20),
  ('High', 30),
  ('Critical', 40)
ON CONFLICT (name) DO NOTHING;

INSERT INTO work_order_statuses (name, is_closed)
VALUES
  ('New', FALSE),
  ('Assigned', FALSE),
  ('In Progress', FALSE),
  ('On Hold', FALSE),
  ('Completed', TRUE),
  ('Closed', TRUE),
  ('Cancelled', TRUE)
ON CONFLICT (name) DO NOTHING;

COMMIT;

