"use client";

import { IconChevronLeft, IconChevronRight } from "@tabler/icons-react";

export type PaginationProps = { page: number; pageCount: number; onPageChange: (page: number) => void; label?: string; disabled?: boolean };

export function Pagination({ page, pageCount, onPageChange, label = "Pagination", disabled }: PaginationProps) {
  const safeCount = Math.max(1, pageCount);
  const safePage = Math.min(Math.max(1, page), safeCount);
  return (
    <nav className="crm-pagination" aria-label={label}>
      <button type="button" className="crm-button crm-button--secondary" disabled={disabled || safePage <= 1} onClick={() => onPageChange(safePage - 1)}><IconChevronLeft aria-hidden />Previous</button>
      <span aria-live="polite">Page <strong>{safePage}</strong> of {safeCount}</span>
      <button type="button" className="crm-button crm-button--secondary" disabled={disabled || safePage >= safeCount} onClick={() => onPageChange(safePage + 1)}>Next<IconChevronRight aria-hidden /></button>
    </nav>
  );
}
