"use client";

import { useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import { IconAlertTriangle, IconCheck } from "@tabler/icons-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { MemberPicker, type MemberPickerOption } from "./MemberPicker";

export type AssignmentChoice = { value: string; label: string; disabled?: boolean };
export type AssignmentDraft = { memberId: string; priority: string; dueDate?: string; comment?: string };
export type AssignmentDrawerState = "default" | "submitting" | "error" | "success" | "restricted";
export type AssignmentDrawerProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sourceTitle: string;
  sourceContext?: ReactNode;
  members: readonly MemberPickerOption[];
  priorities: readonly AssignmentChoice[];
  initialValue?: Partial<AssignmentDraft>;
  state?: AssignmentDrawerState;
  errorMessage?: string;
  onSubmit: (draft: AssignmentDraft) => void;
};

export function AssignmentDrawer({ open, onOpenChange, sourceTitle, sourceContext, members, priorities, initialValue, state = "default", errorMessage, onSubmit }: AssignmentDrawerProps) {
  const firstField = useRef<HTMLSelectElement>(null);
  const keepEditingControl = useRef<HTMLButtonElement>(null);
  const returnFocus = useRef<HTMLElement | null>(null);
  const discarding = useRef(false);
  const restoreEditorAfterPrompt = useRef(false);
  const [draft, setDraft] = useState<AssignmentDraft>({ memberId: initialValue?.memberId ?? "", priority: initialValue?.priority ?? "", dueDate: initialValue?.dueDate ?? "", comment: initialValue?.comment ?? "" });
  const [dirty, setDirty] = useState(false);
  const [discardPrompt, setDiscardPrompt] = useState(false);
  const [validation, setValidation] = useState<string>();
  const busy = state === "submitting";

  useEffect(() => { if (open) setDiscardPrompt(false); }, [open]);
  const update = (key: keyof AssignmentDraft, value: string) => { setDraft((current) => ({ ...current, [key]: value })); setDirty(true); setValidation(undefined); };
  const requestOpenChange = (next: boolean) => { if (!next && dirty && state !== "success") { setDiscardPrompt(true); return; } onOpenChange(next); };
  const submit = (event: FormEvent) => { event.preventDefault(); if (!draft.memberId || !draft.priority) { setValidation("Choose an eligible member and priority."); return; } onSubmit(draft); };
  const discard = () => { discarding.current = true; restoreEditorAfterPrompt.current = false; setDirty(false); setDiscardPrompt(false); onOpenChange(false); };
  const keepEditing = () => { restoreEditorAfterPrompt.current = true; setDiscardPrompt(false); };
  const changeDiscardPrompt = (next: boolean) => {
    if (next) { setDiscardPrompt(true); return; }
    if (discarding.current) { discarding.current = false; return; }
    keepEditing();
  };

  return (
    <Sheet open={open} onOpenChange={requestOpenChange}>
      <SheetContent side="right" className="crm-assignment-drawer" onOpenAutoFocus={(event) => { event.preventDefault(); returnFocus.current = document.activeElement instanceof HTMLElement ? document.activeElement : null; const target = firstField.current && !firstField.current.disabled ? firstField.current : document.querySelector<HTMLButtonElement>('[data-slot="sheet-content"][data-state="open"] button:not([disabled])'); target?.focus(); }} onCloseAutoFocus={(event) => { event.preventDefault(); returnFocus.current?.focus(); }}>
        <SheetHeader className="crm-assignment-drawer__header"><p className="crm-eyebrow">Delegation</p><SheetTitle>Assign owner</SheetTitle><SheetDescription>Choose an eligible member and add the context needed to continue the source work.</SheetDescription></SheetHeader>
        <form className="crm-assignment-form" onSubmit={submit}>
          <div className="crm-assignment-source"><span>Source</span><strong>{sourceTitle}</strong>{sourceContext ? <div>{sourceContext}</div> : null}</div>
          {state === "restricted" ? <div className="crm-inline-state crm-inline-state--restricted" role="status">Assignment is not available for this source.</div> : <>
            <div ref={(node) => { firstField.current = node?.querySelector("select") ?? null; }}><MemberPicker value={draft.memberId} onChange={(value) => update("memberId", value)} members={members} disabled={busy} /></div>
            <label className="crm-form-field"><span>Priority</span><select value={draft.priority} onChange={(event) => update("priority", event.target.value)} disabled={busy}><option value="">Select priority</option>{priorities.map((option) => <option key={option.value} value={option.value} disabled={option.disabled}>{option.label}</option>)}</select></label>
            <label className="crm-form-field"><span>Due date <small>Optional</small></span><input type="date" value={draft.dueDate} onChange={(event) => update("dueDate", event.target.value)} disabled={busy} /></label>
            <label className="crm-form-field"><span>Comment <small>Optional</small></span><textarea value={draft.comment} onChange={(event) => update("comment", event.target.value)} rows={4} disabled={busy} /></label>
            {validation ? <div className="crm-inline-state crm-inline-state--error" role="alert"><IconAlertTriangle aria-hidden />{validation}</div> : null}
            {state === "error" ? <div className="crm-inline-state crm-inline-state--error" role="alert"><IconAlertTriangle aria-hidden />{errorMessage ?? "Assignment could not be saved. Review the details and try again."}</div> : null}
            {state === "success" ? <div className="crm-inline-state crm-inline-state--success" role="status"><IconCheck aria-hidden />Owner assigned. The source can now refresh.</div> : null}
          </>}
          <SheetFooter className="crm-assignment-drawer__footer"><button type="button" className="crm-button crm-button--secondary" onClick={() => requestOpenChange(false)} disabled={busy}>Cancel</button>{state !== "restricted" ? <button type="submit" className="crm-button crm-button--primary" disabled={busy || state === "success"}>{busy ? "Assigning…" : state === "success" ? "Assigned" : "Assign"}</button> : null}</SheetFooter>
        </form>
      </SheetContent>
      <AlertDialog open={discardPrompt} onOpenChange={changeDiscardPrompt}>
        <AlertDialogContent aria-modal="true" className="crm-unsaved-warning" onOpenAutoFocus={(event) => { event.preventDefault(); keepEditingControl.current?.focus(); }} onCloseAutoFocus={(event) => { event.preventDefault(); if (restoreEditorAfterPrompt.current) { restoreEditorAfterPrompt.current = false; firstField.current?.focus(); } }}>
          <AlertDialogHeader>
            <AlertDialogTitle>Discard unsaved changes?</AlertDialogTitle>
            <AlertDialogDescription>Your assignment details have not been submitted.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel ref={keepEditingControl} className="crm-button crm-button--secondary" onClick={keepEditing}>Keep editing</AlertDialogCancel>
            <AlertDialogAction className="crm-button crm-button--destructive" onClick={discard}>Discard changes</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Sheet>
  );
}
