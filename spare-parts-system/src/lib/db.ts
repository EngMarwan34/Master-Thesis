import { DatabaseSync } from "node:sqlite";
import fs from "node:fs";
import path from "node:path";

// In production the container filesystem is ephemeral — anything not on a
// mounted persistent volume is wiped on every redeploy/restart.
// RAILWAY_VOLUME_MOUNT_PATH is auto-injected by Railway once a volume is
// attached to the service, so attaching one is enough on its own; DATABASE_DIR
// remains available as an explicit override for other hosts. Defaults to a
// local ./data folder for dev.
const DATA_DIR =
  process.env.DATABASE_DIR ?? process.env.RAILWAY_VOLUME_MOUNT_PATH ?? path.join(process.cwd(), "data");
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
    branch TEXT NOT NULL,
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
    branch TEXT NOT NULL,
    part_code TEXT NOT NULL,
    part_name TEXT,
    quantity_available INTEGER NOT NULL DEFAULT 0,
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE(branch, part_code)
  );

  CREATE TABLE IF NOT EXISTS branch_contacts (
    branch TEXT PRIMARY KEY,
    contact_name TEXT,
    phone_number TEXT
  );

  CREATE INDEX IF NOT EXISTS idx_part_requests_mr ON part_requests(maintenance_request_id);
  CREATE INDEX IF NOT EXISTS idx_part_sourcing_pr ON part_sourcing(part_request_id);
  CREATE INDEX IF NOT EXISTS idx_part_sourcing_status ON part_sourcing(status);
  CREATE INDEX IF NOT EXISTS idx_branch_stock_code ON branch_stock(part_code);
`;

/**
 * Earlier versions hardcoded the set of valid branches into a SQL CHECK
 * constraint (branch IN ('jeddah','riyadh','khobar')). Branches are no
 * longer fixed at three, so that constraint has to go — but CREATE TABLE
 * IF NOT EXISTS won't touch a table that already exists, and SQLite can't
 * ALTER a CHECK constraint in place. Detect the old constraint and rebuild
 * the affected tables (preserving every row) the one time it's still there.
 */
function migrateAwayFromBranchCheckConstraint(database: DatabaseSync) {
  const tables: Array<{ name: string; columns: string }> = [
    {
      name: "part_sourcing",
      columns:
        "id, part_request_id, branch, quantity, source_type, status, tracking_ref, notes, message_sent_at, shipped_at, received_at, received_by, created_at",
    },
    { name: "branch_stock", columns: "id, branch, part_code, part_name, quantity_available, updated_at" },
    { name: "branch_contacts", columns: "branch, contact_name, phone_number" },
  ];

  for (const table of tables) {
    const row = database
      .prepare(`SELECT sql FROM sqlite_master WHERE type = 'table' AND name = ?`)
      .get(table.name) as { sql?: string } | undefined;
    if (!row?.sql?.includes("branch IN (")) continue; // already migrated, or a fresh install

    database.exec(`ALTER TABLE ${table.name} RENAME TO ${table.name}_pre_branch_migration;`);
    database.exec(SCHEMA); // recreates this table (now sans CHECK) via CREATE TABLE IF NOT EXISTS
    database.exec(
      `INSERT INTO ${table.name} (${table.columns}) SELECT ${table.columns} FROM ${table.name}_pre_branch_migration;`,
    );
    database.exec(`DROP TABLE ${table.name}_pre_branch_migration;`);
  }
}

function isLockedError(error: unknown): boolean {
  return error instanceof Error && error.message.includes("database is locked");
}

function sleepSync(ms: number) {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}

function openAndInitialize(): DatabaseSync {
  const database = new DatabaseSync(DB_PATH);
  // Next.js opens this module from several worker processes at once (e.g.
  // during `next build`'s page-data collection), which race to create the
  // schema on a brand-new file. busy_timeout is supposed to make a loser
  // wait instead of failing immediately, but node:sqlite is still
  // experimental and doesn't honor it reliably for every statement — see
  // the retry loop in init() below for the belt-and-suspenders fix.
  database.exec("PRAGMA busy_timeout = 5000;");
  database.exec("PRAGMA journal_mode = WAL;");
  database.exec(SCHEMA);
  migrateAwayFromBranchCheckConstraint(database);
  return database;
}

function init(): DatabaseSync {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  const maxAttempts = 10;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return openAndInitialize();
    } catch (error) {
      if (!isLockedError(error) || attempt === maxAttempts) throw error;
      // Another process/worker is mid-migration on the same file — back
      // off with a bit of jitter and try opening fresh rather than reusing
      // a connection that may be in a half-finished transaction.
      sleepSync(50 + Math.floor(Math.random() * 150));
    }
  }
  throw new Error("Unreachable"); // satisfies TS control-flow analysis
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
