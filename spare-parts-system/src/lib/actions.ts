"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import * as repo from "./repo";
import { BRANCHES, type Branch, type SourceType } from "./types";

function requireString(formData: FormData, key: string): string {
  return String(formData.get(key) ?? "").trim();
}

function optionalString(formData: FormData, key: string): string | null {
  const value = requireString(formData, key);
  return value || null;
}

// ---------------------------------------------------------------------------
// Maintenance requests
// ---------------------------------------------------------------------------

export async function createMaintenanceRequest(formData: FormData) {
  const request_number = requireString(formData, "request_number");
  if (!request_number) throw new Error("Maintenance request number is required");
  if (repo.requestNumberExists(request_number)) {
    throw new Error(`Maintenance request number "${request_number}" is already in use`);
  }

  const id = repo.createMaintenanceRequest({
    request_number,
    customer_name: optionalString(formData, "customer_name"),
    machine_name: optionalString(formData, "machine_name"),
    notes: optionalString(formData, "notes"),
  });

  revalidatePath("/maintenance-requests");
  redirect(`/maintenance-requests/${id}`);
}

export async function setMaintenanceRequestStatus(
  id: number,
  status: "open" | "closed",
  _formData?: FormData,
) {
  repo.setMaintenanceRequestStatus(id, status);
  revalidatePath(`/maintenance-requests/${id}`);
  revalidatePath("/maintenance-requests");
}

// ---------------------------------------------------------------------------
// Part requests
// ---------------------------------------------------------------------------

export async function addPartRequest(formData: FormData) {
  const maintenance_request_id = Number(formData.get("maintenance_request_id"));
  const part_code = requireString(formData, "part_code");
  const quantity_needed = Number(formData.get("quantity_needed"));

  if (!maintenance_request_id) throw new Error("Invalid maintenance request");
  if (!part_code) throw new Error("Part code is required");
  if (!Number.isFinite(quantity_needed) || quantity_needed <= 0) {
    throw new Error("Quantity needed must be a number greater than zero");
  }

  repo.createPartRequest({
    maintenance_request_id,
    part_code,
    part_name: optionalString(formData, "part_name"),
    quantity_needed,
    notes: optionalString(formData, "notes"),
  });

  revalidatePath(`/maintenance-requests/${maintenance_request_id}`);
}

// ---------------------------------------------------------------------------
// Part sourcing (branch splits)
// ---------------------------------------------------------------------------

export async function addSourcing(formData: FormData) {
  const part_request_id = Number(formData.get("part_request_id"));
  const maintenance_request_id = Number(formData.get("maintenance_request_id"));
  const branch = requireString(formData, "branch") as Branch;
  const quantity = Number(formData.get("quantity"));
  const source_type = requireString(formData, "source_type") as SourceType;

  if (!part_request_id) throw new Error("Invalid part");
  if (!BRANCHES.includes(branch)) throw new Error("Invalid branch");
  if (!Number.isFinite(quantity) || quantity <= 0) throw new Error("Invalid quantity");
  if (source_type !== "order" && source_type !== "stock_pull") {
    throw new Error("Invalid source type");
  }

  repo.createSourcing({ part_request_id, branch, quantity, source_type });

  if (source_type === "stock_pull") {
    const partRequest = repo.getPartRequest(part_request_id);
    if (partRequest) repo.decrementBranchStock(branch, partRequest.part_code, quantity);
    revalidatePath("/branch-stock");
  }

  revalidatePath(`/maintenance-requests/${maintenance_request_id}`);
  revalidatePath("/whatsapp-center");
  revalidatePath("/receiving");
  revalidatePath("/");
}

export async function markMessageSent(ids: number[]) {
  repo.markSourcingMessageSent(ids);
  revalidatePath("/whatsapp-center");
  revalidatePath("/receiving");
  revalidatePath("/maintenance-requests");
  revalidatePath("/");
}

export async function markShipped(id: number, formData: FormData) {
  const tracking_ref = optionalString(formData, "tracking_ref");
  repo.markSourcingShipped(id, tracking_ref);
  revalidatePath("/receiving");
  revalidatePath("/maintenance-requests");
}

export async function markReceived(id: number, formData: FormData) {
  const received_by = requireString(formData, "received_by");
  if (!received_by) throw new Error("Receiving technician's name is required to confirm receipt");
  const notes = optionalString(formData, "notes");
  repo.markSourcingReceived(id, received_by, notes);
  revalidatePath("/receiving");
  revalidatePath("/maintenance-requests");
  revalidatePath("/");
}

// ---------------------------------------------------------------------------
// Branch stock
// ---------------------------------------------------------------------------

export async function upsertBranchStock(formData: FormData) {
  const branch = requireString(formData, "branch") as Branch;
  const part_code = requireString(formData, "part_code");
  const quantity_available = Number(formData.get("quantity_available") ?? 0);

  if (!BRANCHES.includes(branch)) throw new Error("Invalid branch");
  if (!part_code) throw new Error("Part code is required");

  repo.upsertBranchStock({
    branch,
    part_code,
    part_name: optionalString(formData, "part_name"),
    quantity_available: Number.isFinite(quantity_available) ? Math.max(0, quantity_available) : 0,
  });

  revalidatePath("/branch-stock");
}

export async function deleteBranchStock(id: number) {
  repo.deleteBranchStock(id);
  revalidatePath("/branch-stock");
}

// ---------------------------------------------------------------------------
// Branch contacts
// ---------------------------------------------------------------------------

export async function saveBranchContact(formData: FormData) {
  const branch = requireString(formData, "branch") as Branch;
  if (!BRANCHES.includes(branch)) throw new Error("Invalid branch");

  repo.upsertBranchContact({
    branch,
    contact_name: optionalString(formData, "contact_name"),
    phone_number: optionalString(formData, "phone_number"),
  });

  revalidatePath("/settings");
  revalidatePath("/whatsapp-center");
}
