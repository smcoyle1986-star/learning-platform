"use client";

import { CheckCircle2, FileSpreadsheet, LayoutDashboard, Save, X } from "lucide-react";
import type { ReactNode } from "react";

type SaveWorksheetDialogsProps = {
  showSaveModal: boolean;
  worksheetName: string;
  worksheetTypeLabel: string;
  isPublic: boolean;
  isSaving: boolean;
  saveError?: string;
  onNameChange: (value: string) => void;
  onTogglePublic: () => void;
  onCancelSave: () => void;
  onSave: () => void;
  showSaveLimitModal: boolean;
  onCloseSaveLimit: () => void;
  onManageDashboard: () => void;
  onUpgrade: () => void;
  showSuccessModal: boolean;
  onCloseSuccess: () => void;
  onOpenDashboard: () => void;
};

function ModalShell({ children, onClose, labelledBy, layer = "z-50" }: {
  children: ReactNode;
  onClose: () => void;
  labelledBy: string;
  layer?: string;
}) {
  return (
    <div className={`fixed inset-0 ${layer} flex items-center justify-center bg-black/45 px-4 py-8`}>
      <section role="dialog" aria-modal="true" aria-labelledby={labelledBy} className="relative w-full max-w-lg rounded-[2rem] border border-[#dfe5d9] bg-white p-6 shadow-[0_24px_70px_rgba(47,58,47,0.22)] sm:p-7">
        <button type="button" onClick={onClose} className="absolute right-4 top-4 inline-flex h-9 w-9 items-center justify-center rounded-full text-slate-400 transition hover:bg-slate-100 hover:text-slate-700" aria-label="Close dialog"><X size={18} /></button>
        {children}
      </section>
    </div>
  );
}

function Heading({ eyebrow, title, description, id }: { eyebrow: string; title: string; description: string; id: string }) {
  return (
    <div className="pr-10">
      <p className="text-[0.68rem] font-bold uppercase tracking-[0.2em] text-[#6f895f]">{eyebrow}</p>
      <h2 id={id} className="mt-2 text-2xl font-semibold text-[#2f3a2f]">{title}</h2>
      <p className="mt-2 text-sm leading-6 text-[#687268]">{description}</p>
    </div>
  );
}

export default function SaveWorksheetDialogs(props: SaveWorksheetDialogsProps) {
  return (
    <>
      {props.showSaveModal ? (
        <ModalShell onClose={props.onCancelSave} labelledBy="save-worksheet-title">
          <Heading eyebrow="Save worksheet" title="Save to Dashboard" description={`Save this ${props.worksheetTypeLabel} worksheet so it is ready to reuse across Classendo.`} id="save-worksheet-title" />
          <form className="mt-6" onSubmit={(event) => { event.preventDefault(); if (!props.isSaving) props.onSave(); }}>
            <label htmlFor="worksheet-save-name" className="text-sm font-semibold text-[#384638]">Worksheet name</label>
            <input id="worksheet-save-name" type="text" value={props.worksheetName} onChange={(event) => props.onNameChange(event.target.value)} placeholder="For example, Animals Crossword" autoFocus disabled={props.isSaving} aria-invalid={Boolean(props.saveError)} aria-describedby={props.saveError ? "worksheet-save-error" : undefined} className={`mt-2 w-full rounded-xl border bg-white px-4 py-3 text-sm outline-none transition focus:ring-2 disabled:bg-slate-50 ${props.saveError ? "border-red-300 focus:border-red-400 focus:ring-red-100" : "border-[#d7ddd1] focus:border-[#86a96a] focus:ring-[#e5efdf]"}`} />
            {props.saveError ? <p id="worksheet-save-error" className="mt-2 text-sm text-red-600">{props.saveError}</p> : null}
            <div className="mt-5 rounded-2xl border border-[#dfe5d9] bg-[#f7faf5] p-4">
              <label className="flex cursor-pointer items-start gap-3">
                <input type="checkbox" checked={props.isPublic} onChange={props.onTogglePublic} disabled={props.isSaving} aria-label="Make worksheet public" className="mt-0.5 h-5 w-5 rounded border-[#b8c5b2] accent-[#6f895f]" />
                <span>
                  <span className="block text-sm font-semibold text-[#384638]">{props.isPublic ? "Public" : "Private"}</span>
                  <span className="mt-0.5 block text-xs leading-5 text-[#687268]">{props.isPublic ? "Other teachers can discover and copy this worksheet from Community." : "Only you can access this worksheet from your Dashboard."}</span>
                </span>
              </label>
            </div>
            <div className="mt-7 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button type="button" onClick={props.onCancelSave} disabled={props.isSaving} className="btn btn-secondary px-5 py-2.5 disabled:opacity-50">Cancel</button>
              <button type="submit" disabled={props.isSaving || !props.worksheetName.trim()} className="btn btn-primary px-5 py-2.5 disabled:cursor-not-allowed disabled:opacity-55"><Save size={16} />{props.isSaving ? "Saving…" : "Save to Dashboard"}</button>
            </div>
          </form>
        </ModalShell>
      ) : null}

      {props.showSaveLimitModal ? (
        <ModalShell onClose={props.onCloseSaveLimit} labelledBy="worksheet-limit-title" layer="z-[60]">
          <Heading eyebrow="Dashboard storage" title="Dashboard save limit reached" description="Manage your saved resources to make space, or upgrade to Premium for additional Dashboard storage." id="worksheet-limit-title" />
          <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:justify-end">
            <button type="button" onClick={props.onCloseSaveLimit} className="btn btn-secondary px-5 py-2.5">Keep editing</button>
            <button type="button" onClick={props.onManageDashboard} className="btn btn-secondary px-5 py-2.5"><LayoutDashboard size={16} /> Manage saved resources</button>
            <button type="button" onClick={props.onUpgrade} className="btn btn-primary px-5 py-2.5">Upgrade to Premium</button>
          </div>
        </ModalShell>
      ) : null}

      {props.showSuccessModal ? (
        <ModalShell onClose={props.onCloseSuccess} labelledBy="worksheet-success-title" layer="z-[60]">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#e8f2e2] text-[#638054]"><CheckCircle2 size={26} /></div>
          <div className="mt-4"><Heading eyebrow="Save complete" title="Saved to Dashboard" description="Your worksheet is saved and ready to edit, print, or share again." id="worksheet-success-title" /></div>
          <div className="mt-7 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <button type="button" onClick={props.onCloseSuccess} className="btn btn-secondary px-5 py-2.5"><FileSpreadsheet size={16} /> Keep editing</button>
            <button type="button" onClick={props.onOpenDashboard} className="btn btn-primary px-5 py-2.5"><LayoutDashboard size={16} /> Open Dashboard</button>
          </div>
        </ModalShell>
      ) : null}
    </>
  );
}
