"use client";

import { useId } from "react";
import { IconUser } from "@tabler/icons-react";

export type MemberPickerOption = { id: string; label: string; context?: string; disabled?: boolean };
export type MemberPickerProps = { value: string; onChange: (memberId: string) => void; members: readonly MemberPickerOption[]; label?: string; error?: string; disabled?: boolean };

export function MemberPicker({ value, onChange, members, label = "Assign owner", error, disabled }: MemberPickerProps) {
  const errorId = useId();
  return (
    <label className="crm-member-picker">
      <span>{label}</span>
      <span className="crm-member-picker__control"><IconUser aria-hidden /><select value={value} onChange={(event) => onChange(event.target.value)} aria-invalid={Boolean(error)} aria-describedby={error ? errorId : undefined} disabled={disabled}><option value="">Select an eligible member</option>{members.map((member) => <option key={member.id} value={member.id} disabled={member.disabled}>{member.label}{member.context ? ` — ${member.context}` : ""}</option>)}</select></span>
      {error ? <span id={errorId} className="crm-field-error" role="alert">{error}</span> : null}
    </label>
  );
}
