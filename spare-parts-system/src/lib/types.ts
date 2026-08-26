export type Branch = "jeddah" | "riyadh" | "khobar";

export const BRANCHES: Branch[] = ["jeddah", "riyadh", "khobar"];

export const BRANCH_LABELS: Record<Branch, string> = {
  jeddah: "جدة",
  riyadh: "الرياض",
  khobar: "الخبر",
};

export type SourceType = "order" | "stock_pull";

export type SourcingStatus = "pending" | "message_sent" | "shipped" | "received";

export interface MaintenanceRequest {
  id: number;
  request_number: string;
  customer_name: string | null;
  machine_name: string | null;
  notes: string | null;
  status: "open" | "closed";
  created_at: string;
}

export interface PartRequest {
  id: number;
  maintenance_request_id: number;
  part_code: string;
  part_name: string | null;
  quantity_needed: number;
  notes: string | null;
  created_at: string;
}

export interface PartSourcing {
  id: number;
  part_request_id: number;
  branch: Branch;
  quantity: number;
  source_type: SourceType;
  status: SourcingStatus;
  tracking_ref: string | null;
  notes: string | null;
  message_sent_at: string | null;
  shipped_at: string | null;
  received_at: string | null;
  received_by: string | null;
  created_at: string;
}

export interface BranchStock {
  id: number;
  branch: Branch;
  part_code: string;
  part_name: string | null;
  quantity_available: number;
  updated_at: string;
}

export interface BranchContact {
  branch: Branch;
  contact_name: string | null;
  phone_number: string | null;
}
