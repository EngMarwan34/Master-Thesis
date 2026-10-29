import { db, toPlainRow, toPlainRows } from "./db";
import type {
  Branch,
  BranchContact,
  BranchStock,
  MaintenanceRequest,
  PartRequest,
  PartSourcing,
  SourceType,
} from "./types";

// ---------------------------------------------------------------------------
// Maintenance requests
// ---------------------------------------------------------------------------

export function listMaintenanceRequests(includeClosed = false): MaintenanceRequest[] {
  const where = includeClosed ? "" : "WHERE status = 'open'";
  return toPlainRows<MaintenanceRequest>(
    db.prepare(`SELECT * FROM maintenance_requests ${where} ORDER BY created_at DESC`).all(),
  );
}

export function countClosedMaintenanceRequests(): number {
  return (
    db.prepare(`SELECT COUNT(*) AS c FROM maintenance_requests WHERE status = 'closed'`).get() as {
      c: number;
    }
  ).c;
}

export function getMaintenanceRequest(id: number): MaintenanceRequest | undefined {
  return toPlainRow<MaintenanceRequest | undefined>(
    db.prepare(`SELECT * FROM maintenance_requests WHERE id = ?`).get(id),
  );
}

export function requestNumberExists(request_number: string, excludeId?: number): boolean {
  const row = excludeId
    ? db
        .prepare(`SELECT id FROM maintenance_requests WHERE request_number = ? AND id != ?`)
        .get(request_number, excludeId)
    : db.prepare(`SELECT id FROM maintenance_requests WHERE request_number = ?`).get(request_number);
  return Boolean(row);
}

export function createMaintenanceRequest(data: {
  request_number: string;
  customer_name: string | null;
  machine_name: string | null;
  notes: string | null;
}): number {
  const info = db
    .prepare(
      `INSERT INTO maintenance_requests (request_number, customer_name, machine_name, notes)
       VALUES (?, ?, ?, ?)`,
    )
    .run(data.request_number, data.customer_name, data.machine_name, data.notes);
  return Number(info.lastInsertRowid);
}

export function setMaintenanceRequestStatus(id: number, status: "open" | "closed") {
  db.prepare(`UPDATE maintenance_requests SET status = ? WHERE id = ?`).run(status, id);
}

export function updateMaintenanceRequest(
  id: number,
  data: {
    request_number: string;
    customer_name: string | null;
    machine_name: string | null;
    notes: string | null;
  },
) {
  db.prepare(
    `UPDATE maintenance_requests
     SET request_number = ?, customer_name = ?, machine_name = ?, notes = ?
     WHERE id = ?`,
  ).run(data.request_number, data.customer_name, data.machine_name, data.notes, id);
}

export function deleteMaintenanceRequest(id: number) {
  // part_requests and their part_sourcing rows cascade via ON DELETE CASCADE.
  db.prepare(`DELETE FROM maintenance_requests WHERE id = ?`).run(id);
}

// ---------------------------------------------------------------------------
// Part requests
// ---------------------------------------------------------------------------

export function getPartRequest(id: number): PartRequest | undefined {
  return toPlainRow<PartRequest | undefined>(
    db.prepare(`SELECT * FROM part_requests WHERE id = ?`).get(id),
  );
}

export function createPartRequest(data: {
  maintenance_request_id: number;
  part_code: string;
  part_name: string | null;
  quantity_needed: number;
  notes: string | null;
}): number {
  const info = db
    .prepare(
      `INSERT INTO part_requests (maintenance_request_id, part_code, part_name, quantity_needed, notes)
       VALUES (?, ?, ?, ?, ?)`,
    )
    .run(
      data.maintenance_request_id,
      data.part_code,
      data.part_name,
      data.quantity_needed,
      data.notes,
    );
  return Number(info.lastInsertRowid);
}

export function updatePartRequest(
  id: number,
  data: {
    part_code: string;
    part_name: string | null;
    quantity_needed: number;
    notes: string | null;
  },
) {
  db.prepare(
    `UPDATE part_requests SET part_code = ?, part_name = ?, quantity_needed = ?, notes = ? WHERE id = ?`,
  ).run(data.part_code, data.part_name, data.quantity_needed, data.notes, id);
}

export function deletePartRequest(id: number) {
  // part_sourcing rows cascade via ON DELETE CASCADE.
  db.prepare(`DELETE FROM part_requests WHERE id = ?`).run(id);
}

export interface PartRequestSummary extends PartRequest {
  sourced_quantity: number;
  received_quantity: number;
}

export function listPartRequestsWithSummary(maintenanceRequestId: number): PartRequestSummary[] {
  return toPlainRows<PartRequestSummary>(
    db
      .prepare(
        `SELECT pr.*,
           COALESCE(SUM(ps.quantity), 0) AS sourced_quantity,
           COALESCE(SUM(CASE WHEN ps.status = 'received' THEN ps.quantity ELSE 0 END), 0) AS received_quantity
         FROM part_requests pr
         LEFT JOIN part_sourcing ps ON ps.part_request_id = pr.id
         WHERE pr.maintenance_request_id = ?
         GROUP BY pr.id
         ORDER BY pr.created_at ASC`,
      )
      .all(maintenanceRequestId),
  );
}

// ---------------------------------------------------------------------------
// Part sourcing (per-branch split of a part request)
// ---------------------------------------------------------------------------

export function listSourcingForPartRequest(partRequestId: number): PartSourcing[] {
  return toPlainRows<PartSourcing>(
    db
      .prepare(`SELECT * FROM part_sourcing WHERE part_request_id = ? ORDER BY created_at ASC`)
      .all(partRequestId),
  );
}

export function getSourcing(id: number): PartSourcing | undefined {
  return toPlainRow<PartSourcing | undefined>(
    db.prepare(`SELECT * FROM part_sourcing WHERE id = ?`).get(id),
  );
}

export function createSourcing(data: {
  part_request_id: number;
  branch: Branch;
  quantity: number;
  source_type: SourceType;
}): number {
  const info = db
    .prepare(
      `INSERT INTO part_sourcing (part_request_id, branch, quantity, source_type)
       VALUES (?, ?, ?, ?)`,
    )
    .run(data.part_request_id, data.branch, data.quantity, data.source_type);
  return Number(info.lastInsertRowid);
}

export function deleteSourcing(id: number) {
  db.prepare(`DELETE FROM part_sourcing WHERE id = ?`).run(id);
}

export interface SourcingWithContext extends PartSourcing {
  part_code: string;
  part_name: string | null;
  request_number: string;
  maintenance_request_id: number;
  customer_name: string | null;
}

const SOURCING_WITH_CONTEXT_SELECT = `
  SELECT ps.*, pr.part_code AS part_code, pr.part_name AS part_name,
         mr.request_number AS request_number, mr.id AS maintenance_request_id,
         mr.customer_name AS customer_name
  FROM part_sourcing ps
  JOIN part_requests pr ON pr.id = ps.part_request_id
  JOIN maintenance_requests mr ON mr.id = pr.maintenance_request_id
`;

export function listPendingSourcing(): SourcingWithContext[] {
  return toPlainRows<SourcingWithContext>(
    db
      .prepare(
        `${SOURCING_WITH_CONTEXT_SELECT} WHERE ps.status = 'pending' ORDER BY ps.branch, ps.created_at ASC`,
      )
      .all(),
  );
}

export function listAwaitingReceipt(): SourcingWithContext[] {
  return toPlainRows<SourcingWithContext>(
    db
      .prepare(
        `${SOURCING_WITH_CONTEXT_SELECT} WHERE ps.status IN ('message_sent','shipped') ORDER BY ps.status DESC, ps.created_at ASC`,
      )
      .all(),
  );
}

export function markSourcingMessageSent(ids: number[]) {
  if (ids.length === 0) return;
  const now = new Date().toISOString();
  const stmt = db.prepare(
    `UPDATE part_sourcing SET status = 'message_sent', message_sent_at = ? WHERE id = ? AND status = 'pending'`,
  );
  for (const id of ids) stmt.run(now, id);
}

export function markSourcingShipped(id: number, tracking_ref: string | null) {
  const now = new Date().toISOString();
  db.prepare(
    `UPDATE part_sourcing SET status = 'shipped', shipped_at = ?, tracking_ref = COALESCE(?, tracking_ref) WHERE id = ?`,
  ).run(now, tracking_ref, id);
}

export function markSourcingReceived(id: number, received_by: string, notes: string | null) {
  const now = new Date().toISOString();
  db.prepare(
    `UPDATE part_sourcing SET status = 'received', received_at = ?, received_by = ?, notes = COALESCE(?, notes) WHERE id = ?`,
  ).run(now, received_by, notes, id);
}

// ---------------------------------------------------------------------------
// Branch stock (existing inventory at Jeddah / Riyadh / Khobar)
// ---------------------------------------------------------------------------

export function listBranchStock(): BranchStock[] {
  return toPlainRows<BranchStock>(
    db.prepare(`SELECT * FROM branch_stock ORDER BY branch, part_code`).all(),
  );
}

export function findStockForPart(part_code: string): BranchStock[] {
  return toPlainRows<BranchStock>(
    db
      .prepare(`SELECT * FROM branch_stock WHERE part_code = ? AND quantity_available > 0`)
      .all(part_code),
  );
}

export function upsertBranchStock(data: {
  branch: Branch;
  part_code: string;
  part_name: string | null;
  quantity_available: number;
}) {
  db.prepare(
    `INSERT INTO branch_stock (branch, part_code, part_name, quantity_available, updated_at)
     VALUES (?, ?, ?, ?, datetime('now'))
     ON CONFLICT(branch, part_code) DO UPDATE SET
       part_name = excluded.part_name,
       quantity_available = excluded.quantity_available,
       updated_at = datetime('now')`,
  ).run(data.branch, data.part_code, data.part_name, data.quantity_available);
}

export function decrementBranchStock(branch: Branch, part_code: string, quantity: number) {
  db.prepare(
    `UPDATE branch_stock SET quantity_available = MAX(0, quantity_available - ?), updated_at = datetime('now')
     WHERE branch = ? AND part_code = ?`,
  ).run(quantity, branch, part_code);
}

// Puts quantity back when a stock-pull sourcing line is deleted. Only touches
// an existing stock row — if that row was later removed, there is nothing to
// restore and this is a silent no-op.
export function incrementBranchStock(branch: Branch, part_code: string, quantity: number) {
  db.prepare(
    `UPDATE branch_stock SET quantity_available = quantity_available + ?, updated_at = datetime('now')
     WHERE branch = ? AND part_code = ?`,
  ).run(quantity, branch, part_code);
}

export function deleteBranchStock(id: number) {
  db.prepare(`DELETE FROM branch_stock WHERE id = ?`).run(id);
}

// ---------------------------------------------------------------------------
// Branch contacts (WhatsApp numbers)
// ---------------------------------------------------------------------------

export function listBranchContacts(): BranchContact[] {
  return toPlainRows<BranchContact>(db.prepare(`SELECT * FROM branch_contacts`).all());
}

export function upsertBranchContact(data: {
  branch: Branch;
  contact_name: string | null;
  phone_number: string | null;
}) {
  db.prepare(
    `INSERT INTO branch_contacts (branch, contact_name, phone_number) VALUES (?, ?, ?)
     ON CONFLICT(branch) DO UPDATE SET contact_name = excluded.contact_name, phone_number = excluded.phone_number`,
  ).run(data.branch, data.contact_name, data.phone_number);
}

// ---------------------------------------------------------------------------
// Global part search
// ---------------------------------------------------------------------------

export interface PartOccurrence {
  maintenance_request_id: number;
  request_number: string;
  customer_name: string | null;
  request_status: "open" | "closed";
  part_request_id: number;
  part_code: string;
  part_name: string | null;
  quantity_needed: number;
  // Sourcing columns are null when the part has no branch split yet.
  sourcing_id: number | null;
  branch: Branch | null;
  quantity: number | null;
  source_type: SourceType | null;
  sourcing_status: PartSourcing["status"] | null;
  received_by: string | null;
  received_at: string | null;
  tracking_ref: string | null;
}

export function searchPartOccurrences(query: string): PartOccurrence[] {
  const like = `%${query}%`;
  return toPlainRows<PartOccurrence>(
    db
      .prepare(
        `SELECT
           mr.id AS maintenance_request_id, mr.request_number AS request_number,
           mr.customer_name AS customer_name, mr.status AS request_status,
           pr.id AS part_request_id, pr.part_code AS part_code, pr.part_name AS part_name,
           pr.quantity_needed AS quantity_needed,
           ps.id AS sourcing_id, ps.branch AS branch, ps.quantity AS quantity,
           ps.source_type AS source_type, ps.status AS sourcing_status,
           ps.received_by AS received_by, ps.received_at AS received_at,
           ps.tracking_ref AS tracking_ref
         FROM part_requests pr
         JOIN maintenance_requests mr ON mr.id = pr.maintenance_request_id
         LEFT JOIN part_sourcing ps ON ps.part_request_id = pr.id
         WHERE pr.part_code LIKE ? OR pr.part_name LIKE ?
         ORDER BY mr.created_at DESC, pr.created_at ASC, ps.created_at ASC`,
      )
      .all(like, like),
  );
}

export function searchStock(query: string): BranchStock[] {
  const like = `%${query}%`;
  return toPlainRows<BranchStock>(
    db
      .prepare(
        `SELECT * FROM branch_stock
         WHERE part_code LIKE ? OR part_name LIKE ?
         ORDER BY part_code, branch`,
      )
      .all(like, like),
  );
}

// ---------------------------------------------------------------------------
// Dashboard
// ---------------------------------------------------------------------------

export function dashboardStats() {
  const openRequests = (
    db.prepare(`SELECT COUNT(*) AS c FROM maintenance_requests WHERE status = 'open'`).get() as {
      c: number;
    }
  ).c;
  const pendingMessages = (
    db.prepare(`SELECT COUNT(*) AS c FROM part_sourcing WHERE status = 'pending'`).get() as {
      c: number;
    }
  ).c;
  const awaitingReceipt = (
    db
      .prepare(`SELECT COUNT(*) AS c FROM part_sourcing WHERE status IN ('message_sent','shipped')`)
      .get() as { c: number }
  ).c;
  const receivedToday = (
    db
      .prepare(
        `SELECT COUNT(*) AS c FROM part_sourcing WHERE status = 'received' AND date(received_at) = date('now')`,
      )
      .get() as { c: number }
  ).c;
  return { openRequests, pendingMessages, awaitingReceipt, receivedToday };
}
