import { BRANCH_LABELS, DESTINATION_BRANCH_LABEL, type Branch, type SourceType } from "./types";

export interface MessageLineInput {
  request_number: string;
  part_code: string;
  part_name: string | null;
  quantity: number;
  source_type: SourceType;
}

/**
 * Builds the WhatsApp message text sent to a source branch asking it to
 * ship one or more spare parts to the Madinah branch. Groups every selected
 * line (which may belong to different maintenance requests) into a single,
 * ready-to-send message.
 */
export function buildWhatsAppMessage(
  branch: Branch,
  lines: MessageLineInput[],
  senderName?: string,
): string {
  const header = `📦 Spare Parts Request – Transfer to ${DESTINATION_BRANCH_LABEL} Branch\nTo: ${BRANCH_LABELS[branch]} Branch`;

  const body = lines
    .map((line, index) => {
      const parts = [
        `${index + 1}) Maintenance Request #: ${line.request_number}`,
        `Part Code: ${line.part_code}`,
      ];
      if (line.part_name) parts.push(`Part Name: ${line.part_name}`);
      parts.push(`Quantity: ${line.quantity}`);
      if (line.source_type === "stock_pull") {
        parts.push(`Note: pull from your existing stock (please do not sell it)`);
      }
      return parts.join("\n");
    })
    .join("\n----------------------\n");

  const footer = [
    "----------------------",
    `Please ship the parts above to the ${DESTINATION_BRANCH_LABEL} branch, and send the tracking number once available.`,
    senderName ? `Requested by: ${senderName}` : null,
  ]
    .filter(Boolean)
    .join("\n");

  return `${header}\n\n${body}\n\n${footer}`;
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
