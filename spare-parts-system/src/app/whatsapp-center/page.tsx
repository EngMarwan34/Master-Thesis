import * as repo from "@/lib/repo";
import { BRANCHES } from "@/lib/types";
import BranchMessagePanel from "./BranchMessagePanel";

export const dynamic = "force-dynamic";

export default function WhatsAppCenterPage() {
  const pending = repo.listPendingSourcing();
  const contacts = repo.listBranchContacts();
  const contactMap = Object.fromEntries(contacts.map((contact) => [contact.branch, contact]));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">WhatsApp Center</h1>
        <p className="mt-1 text-sm text-slate-500">
          Prepare one combined message per branch listing every part still awaiting a request,
          then copy it or send it directly over WhatsApp.
        </p>
      </div>

      {pending.length === 0 && (
        <p className="rounded-xl border border-dashed border-slate-300 bg-white p-6 text-center text-slate-400">
          No parts awaiting a message right now 🎉
        </p>
      )}

      <div className="space-y-4">
        {BRANCHES.map((branch) => (
          <BranchMessagePanel
            key={branch}
            branch={branch}
            lines={pending.filter((line) => line.branch === branch)}
            contactName={contactMap[branch]?.contact_name ?? null}
            phoneNumber={contactMap[branch]?.phone_number ?? null}
          />
        ))}
      </div>
    </div>
  );
}
