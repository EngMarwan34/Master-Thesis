import { type SourceType } from "./types";

export interface MessageLineInput {
  request_number: string;
  customer_name: string | null;
  part_code: string;
  quantity: number;
  source_type: SourceType;
}

/**
 * Builds the WhatsApp message text sent to a source branch asking it to
 * ship one or more spare parts to the Madinah branch. Kept intentionally
 * bare — just the request number/site and the part code + quantity, in the
 * exact short format the branch teams already use and respond to. No
 * header, signature, or branch name: anything more than that and they
 * don't read it.
 */
export function buildWhatsAppMessage(lines: MessageLineInput[]): string {
  return lines
    .map((line) => {
      const site = line.customer_name ? ` - ${line.customer_name}` : "";
      const stockTag = line.source_type === "stock_pull" ? " (STOCK)" : "";
      return [
        `Maintenance Request #: ${line.request_number}${site}`,
        `Part Code: ${line.part_code}----${line.quantity}PCS${stockTag}`,
      ].join("\n");
    })
    .join("\n----------------\n");
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
