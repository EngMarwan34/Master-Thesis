import { DatabaseSync } from "node:sqlite";
import fs from "node:fs";
import path from "node:path";

// In production the container filesystem is ephemeral — anything not on a
// mounted persistent volume is wiped on every redeploy/restart. Set
// DATABASE_DIR to that volume's mount path (e.g. "/data" on Railway) so the
// database survives deploys. Defaults to a local ./data folder for dev.
const DATA_DIR = process.env.DATABASE_DIR ?? path.join(process.cwd(), "data");
const DB_PATH = path.join(DATA_DIR, "app.db");

const SCHEMA = `
  PRAGMA foreign_keys = ON;

  CREATE TABLE IF NOT EXISTS maintenance_requests (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    request_number TEXT NOT NULL UNIQUE,
    customer_name TEXT,
    machine_name TEXT,
    notes TEXT,
    status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','closed')),
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS part_requests (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    maintenance_request_id INTEGER NOT NULL REFERENCES maintenance_requests(id) ON DELETE CASCADE,
    part_code TEXT NOT NULL,
    part_name TEXT,
    quantity_needed INTEGER NOT NULL CHECK (quantity_needed > 0),
    notes TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS part_sourcing (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    part_request_id INTEGER NOT NULL REFERENCES part_requests(id) ON DELETE CASCADE,
    branch TEXT NOT NULL CHECK (branch IN ('jeddah','riyadh','khobar')),
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    source_type TEXT NOT NULL DEFAULT 'order' CHECK (source_type IN ('order','stock_pull')),
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','message_sent','shipped','received')),
    tracking_ref TEXT,
    notes TEXT,
    message_sent_at TEXT,
    shipped_at TEXT,
    received_at TEXT,
    received_by TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS branch_stock (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    branch TEXT NOT NULL CHECK (branch IN ('jeddah','riyadh','khobar')),
    part_code TEXT NOT NULL,
    part_name TEXT,
    quantity_available INTEGER NOT NULL DEFAULT 0,
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE(branch, part_code)
  );

  CREATE TABLE IF NOT EXISTS branch_contacts (
    branch TEXT PRIMARY KEY CHECK (branch IN ('jeddah','riyadh','khobar')),
    contact_name TEXT,
    phone_number TEXT
  );

  CREATE INDEX IF NOT EXISTS idx_part_requests_mr ON part_requests(maintenance_request_id);
  CREATE INDEX IF NOT EXISTS idx_part_sourcing_pr ON part_sourcing(part_request_id);
  CREATE INDEX IF NOT EXISTS idx_part_sourcing_status ON part_sourcing(status);
  CREATE INDEX IF NOT EXISTS idx_branch_stock_code ON branch_stock(part_code);
`;

function init(): DatabaseSync {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  const database = new DatabaseSync(DB_PATH);
  // Next.js opens this module from several worker processes at once (e.g.
  // during `next build`'s page-data collection), which race to create the
  // schema on a brand-new file. Without a busy timeout the loser gets an
  // immediate "database is locked" instead of just waiting its turn.
  database.exec("PRAGMA busy_timeout = 5000;");
  database.exec("PRAGMA journal_mode = WAL;");
  database.exec(SCHEMA);
  return database;
}

// Reuse a single connection across Next.js dev hot-reloads / server action
// invocations instead of opening a new SQLite handle every request.
const globalForDb = globalThis as unknown as { __sparePartsDb?: DatabaseSync };

export const db = globalForDb.__sparePartsDb ?? init();

if (process.env.NODE_ENV !== "production") {
  globalForDb.__sparePartsDb = db;
}

/**
 * node:sqlite returns rows as Object.create(null) instances (no prototype).
 * That trips up React's "plain objects only" check when a server component
 * passes query results straight to a client component, so every row read
 * from the database must be normalized through these helpers first.
 */
export function toPlainRow<T>(row: unknown): T {
  return row ? ({ ...(row as Record<string, unknown>) } as T) : (row as T);
}

export function toPlainRows<T>(rows: unknown[]): T[] {
  return rows.map((row) => ({ ...(row as Record<string, unknown>) })) as T[];
}
