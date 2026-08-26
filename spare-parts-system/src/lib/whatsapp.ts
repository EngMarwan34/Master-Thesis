import { BRANCH_LABELS, type Branch, type SourceType } from "./types";

export interface MessageLineInput {
  request_number: string;
  part_code: string;
  part_name: string | null;
  quantity: number;
  source_type: SourceType;
}

/**
 * Builds the Arabic WhatsApp message text sent to a source branch asking it
 * to ship one or more spare parts to the Madinah branch. Groups every
 * selected line (which may belong to different maintenance requests) into a
 * single, ready-to-send message.
 */
export function buildWhatsAppMessage(
  branch: Branch,
  lines: MessageLineInput[],
  senderName?: string,
): string {
  const header = `📦 طلب قطع غيار – تحويل إلى فرع المدينة\nإلى: فرع ${BRANCH_LABELS[branch]}`;

  const body = lines
    .map((line, index) => {
      const parts = [
        `${index + 1}) رقم طلب الصيانة: ${line.request_number}`,
        `كود القطعة: ${line.part_code}`,
      ];
      if (line.part_name) parts.push(`اسم القطعة: ${line.part_name}`);
      parts.push(`الكمية: ${line.quantity}`);
      if (line.source_type === "stock_pull") {
        parts.push(`ملاحظة: سحب من المخزون المتوفر لديكم (الرجاء عدم بيعها)`);
      }
      return parts.join("\n");
    })
    .join("\n----------------------\n");

  const footer = [
    "----------------------",
    "الرجاء شحن القطع أعلاه إلى فرع المدينة، ويُرجى إرسال رقم تتبع الشحنة عند توفره.",
    senderName ? `جهة الطلب: ${senderName}` : null,
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
