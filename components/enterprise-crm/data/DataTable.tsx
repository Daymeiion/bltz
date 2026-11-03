"use client";

import type { ReactNode } from "react";
import { IconArrowsSort, IconChevronDown, IconChevronUp } from "@tabler/icons-react";
import { EmptyState, ErrorState, FilteredEmptyState, LoadingState, RestrictedState } from "../states";

export type DataTableState = "default" | "loading" | "empty" | "filtered-empty" | "error" | "restricted";
export type DataTableSort = { columnId: string; direction: "ascending" | "descending" };
export type DataTableColumn<Row> = {
  id: string;
  header: string;
  cell: (row: Row) => ReactNode;
  sortable?: boolean;
  align?: "start" | "center" | "end";
};

export type DataTableProps<Row> = {
  caption: string;
  columns: readonly DataTableColumn<Row>[];
  rows: readonly Row[];
  rowKey: (row: Row) => string;
  state?: DataTableState;
  sort?: DataTableSort;
  onSort?: (sort: DataTableSort) => void;
  onResetFilters?: () => void;
  onRetry?: () => void;
  rowActionLabel?: (row: Row) => string;
  onRowAction?: (row: Row) => void;
};

export function DataTable<Row>({ caption, columns, rows, rowKey, state = "default", sort, onSort, onResetFilters, onRetry, rowActionLabel, onRowAction }: DataTableProps<Row>) {
  if (state === "loading") return <LoadingState title={`Loading ${caption}`} />;
  if (state === "empty") return <EmptyState title="No records yet" description={`Records available for ${caption.toLowerCase()} will appear here.`} />;
  if (state === "filtered-empty") return <FilteredEmptyState onReset={onResetFilters} />;
  if (state === "error") return <ErrorState onRetry={onRetry} />;
  if (state === "restricted") return <RestrictedState />;
  const chooseSort = (columnId: string) => onSort?.({ columnId, direction: sort?.columnId === columnId && sort.direction === "ascending" ? "descending" : "ascending" });
  return (
    <div className="crm-data-table-region">
      <table className="crm-data-table">
        <caption>{caption}</caption>
        <thead><tr>{columns.map((column) => <th key={column.id} scope="col" data-align={column.align ?? "start"}>{column.sortable ? <button type="button" onClick={() => chooseSort(column.id)} aria-label={`Sort by ${column.header}${sort?.columnId === column.id ? `, currently ${sort.direction}` : ""}`}>{column.header}{sort?.columnId === column.id ? sort.direction === "ascending" ? <IconChevronUp aria-hidden /> : <IconChevronDown aria-hidden /> : <IconArrowsSort aria-hidden />}</button> : column.header}</th>)}{onRowAction ? <th scope="col"><span className="sr-only">Actions</span></th> : null}</tr></thead>
        <tbody>{rows.map((row) => <tr key={rowKey(row)}>{columns.map((column) => <td key={column.id} data-label={column.header} data-align={column.align ?? "start"}>{column.cell(row)}</td>)}{onRowAction ? <td className="crm-data-table__action"><button type="button" className="crm-button crm-button--secondary" onClick={() => onRowAction(row)}>{rowActionLabel?.(row) ?? "Open"}</button></td> : null}</tr>)}</tbody>
      </table>
    </div>
  );
}
