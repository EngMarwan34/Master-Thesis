import * as repo from "@/lib/repo";
import { BRANCHES, BRANCH_LABELS } from "@/lib/types";
import { saveBranchContact } from "@/lib/actions";

export const dynamic = "force-dynamic";

export default function SettingsPage() {
  const contacts = repo.listBranchContacts();
  const contactMap = Object.fromEntries(contacts.map((contact) => [contact.branch, contact]));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Settings</h1>
        <p className="mt-1 text-sm text-slate-500">
          Link each branch to the WhatsApp number of whoever handles shipping, so the chat can be
          opened directly when preparing a message.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {BRANCHES.map((branch) => {
          const contact = contactMap[branch];
          return (
            <form
              key={branch}
              action={saveBranchContact}
              className="space-y-3 rounded-xl border border-slate-200 bg-white p-5"
            >
              <input type="hidden" name="branch" value={branch} />
              <h2 className="font-semibold text-slate-800">{BRANCH_LABELS[branch]} Branch</h2>
              <label className="block text-sm text-slate-600">
                Contact name
                <input
                  name="contact_name"
                  defaultValue={contact?.contact_name ?? ""}
                  className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-slate-900"
                />
              </label>
              <label className="block text-sm text-slate-600">
                WhatsApp number (international format, e.g. 9665xxxxxxxx)
                <input
                  name="phone_number"
                  defaultValue={contact?.phone_number ?? ""}
                  className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-slate-900"
                />
              </label>
              <button className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700">
                Save
              </button>
            </form>
          );
        })}
      </div>
    </div>
  );
}
