"use client";

import type { ChangeEvent, ReactNode } from "react";
import { IconAdjustmentsHorizontal, IconSearch, IconX } from "@tabler/icons-react";

export type SearchInputProps = {
  value: string;
  onChange: (value: string) => void;
  label: string;
  placeholder?: string;
  resultCount?: number;
  disabled?: boolean;
};

export function SearchInput({ value, onChange, label, placeholder = "Search", resultCount, disabled }: SearchInputProps) {
  const handleChange = (event: ChangeEvent<HTMLInputElement>) => onChange(event.target.value);
  return (
    <div className="crm-search-input">
      <IconSearch aria-hidden />
      <input type="search" value={value} onChange={handleChange} aria-label={label} placeholder={placeholder} disabled={disabled} />
      {typeof resultCount === "number" ? <span className="crm-search-input__count" aria-live="polite">{resultCount} {resultCount === 1 ? "result" : "results"}</span> : null}
      {value && !disabled ? <button type="button" className="crm-icon-button" aria-label={`Clear ${label}`} onClick={() => onChange("")}><IconX aria-hidden /></button> : null}
    </div>
  );
}

export type FilterBarProps = {
  children: ReactNode;
  activeCount?: number;
  onReset?: () => void;
  resultSummary?: string;
  label?: string;
};

export function FilterBar({ children, activeCount = 0, onReset, resultSummary, label = "Filters" }: FilterBarProps) {
  return (
    <section className="crm-filter-bar" aria-label={label}>
      <div className="crm-filter-bar__label"><IconAdjustmentsHorizontal aria-hidden /><strong>{label}</strong>{activeCount > 0 ? <span>{activeCount} active</span> : null}</div>
      <div className="crm-filter-bar__controls">{children}</div>
      <div className="crm-filter-bar__status">{resultSummary ? <span aria-live="polite">{resultSummary}</span> : null}{activeCount > 0 && onReset ? <button type="button" className="crm-button crm-button--secondary" onClick={onReset}>Reset filters</button> : null}</div>
    </section>
  );
}
