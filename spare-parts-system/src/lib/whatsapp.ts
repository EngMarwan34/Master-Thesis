import { BRANCH_LABELS, DESTINATION_BRANCH_LABEL, type Branch, type SourceType } from "./types";

export interface MessageLineInput {
  request_number: string;
  customer_name: string | null;
  part_code: string;
  part_name: string | null;
  quantity: number;
  source_type: SourceType;
}

/**
 * Builds the WhatsApp message text sent to a source branch asking it to
 * ship one or more spare parts to the Madinah branch. Kept intentionally
 * bare — a "FROM / TO" routing line, then just the request number/site and
 * the part code + quantity per item, in the exact short format the branch
 * teams already use and respond to.
 */
export function buildWhatsAppMessage(branch: Branch, lines: MessageLineInput[]): string {
  const header = `FROM ${BRANCH_LABELS[branch]} TO ${DESTINATION_BRANCH_LABEL}`;

  const body = lines
    .map((line) => {
      const site = line.customer_name ? ` - ${line.customer_name}` : "";
      const name = line.part_name ? ` - ${line.part_name}` : "";
      const stockTag = line.source_type === "stock_pull" ? " (STOCK)" : "";
      return [
        `Maintenance Request #: ${line.request_number}${site}`,
        `Part Code: ${line.part_code}${name}----${line.quantity}PCS${stockTag}`,
      ].join("\n");
    })
    .join("\n----------------\n");

  return `${header}\n${body}`;
}

/**
 * Builds a wa.me / WhatsApp web link that opens with the message pre-filled.
 * When no phone number is saved for the branch, falls back to the generic
 * "send" link which lets the user pick a chat manually.
 */
export function buildWhatsAppLink(phoneNumber: string | null | undefined, message: string): string {
  const text = encodeURIComponent(message);
  if (phoneNumber) {
    const digits = phoneNumber.replace(/[^\d]/g, "");
    if (digits) return `https://wa.me/${digits}?text=${text}`;
  }
  return `https://api.whatsapp.com/send?text=${text}`;
}
