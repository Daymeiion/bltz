"use client";

import { useId, useState, type FormEvent, type ReactNode } from "react";
import { IconBell, IconCalendar, IconCheck, IconMessageCircle } from "@tabler/icons-react";
import { EntityReference, PriorityBadge, StatusBadge, type Priority, type StatusVariant } from "../data";

export function WorkloadLegend({ items }: { items: readonly { label: string; count: number; variant: "high" | "medium" | "low" | "delegated" }[] }) {
  return <ul className="crm-workload-legend" aria-label="Workload distribution">{items.map((item) => <li key={item.variant} className={`crm-workload-key crm-workload-key--${item.variant}`}><i aria-hidden /><span>{item.label}</span><strong>{item.count}</strong></li>)}</ul>;
}

type WorkflowRowProps = { title: string; context?: string; status: string; statusVariant?: StatusVariant; priority?: Priority; due?: string; action?: ReactNode };
export function TaskRow({ title, context, status, statusVariant = "neutral", priority, due, action }: WorkflowRowProps) {
  return <article className="crm-workflow-row"><div><strong>{title}</strong>{context ? <span>{context}</span> : null}</div><StatusBadge label={status} variant={statusVariant} />{priority ? <PriorityBadge priority={priority} /> : null}{due ? <span className="crm-workflow-row__date"><IconCalendar aria-hidden />{due}</span> : null}{action}</article>;
}
export function ApprovalRow(props: WorkflowRowProps & { approver?: string }) {
  return <article className="crm-workflow-row crm-workflow-row--approval"><div><strong>{props.title}</strong>{props.context ? <span>{props.context}</span> : null}{props.approver ? <small>Approver: {props.approver}</small> : null}</div><StatusBadge label={props.status} variant={props.statusVariant ?? "review"} />{props.due ? <span className="crm-workflow-row__date"><IconCalendar aria-hidden />{props.due}</span> : null}{props.action}</article>;
}

export type ActivityFeedItem = { id: string; actor: string; context?: string; action: string; timestamp: string; icon?: ReactNode };
export function ActivityFeed({ items, label = "Activity" }: { items: readonly ActivityFeedItem[]; label?: string }) {
  const titleId = useId();
  return <section className="crm-activity-feed" aria-labelledby={titleId}><h3 id={titleId}>{label}</h3><ol>{items.map((item) => <li key={item.id}><span className="crm-activity-feed__icon" aria-hidden>{item.icon ?? <IconCheck />}</span><div><strong>{item.actor}</strong> {item.action}{item.context ? <span>{item.context}</span> : null}<time>{item.timestamp}</time></div></li>)}</ol></section>;
}

export type CommentItem = { id: string; author: string; context?: string; body: string; timestamp: string; initials?: string };
export function CommentThread({ comments, onSubmit, disabled }: { comments: readonly CommentItem[]; onSubmit?: (comment: string) => void; disabled?: boolean }) {
  const [value, setValue] = useState("");
  const titleId = useId();
  const inputId = useId();
  const submit = (event: FormEvent) => { event.preventDefault(); const next = value.trim(); if (!next || !onSubmit) return; onSubmit(next); setValue(""); };
  return <section className="crm-comment-thread" aria-labelledby={titleId}><h3 id={titleId}><IconMessageCircle aria-hidden />Comments</h3><ol>{comments.map((comment) => <li key={comment.id}><EntityReference label={comment.author} context={comment.context} initials={comment.initials} /><p>{comment.body}</p><time>{comment.timestamp}</time></li>)}</ol>{onSubmit ? <form onSubmit={submit}><label htmlFor={inputId}>Add comment</label><textarea id={inputId} value={value} onChange={(event) => setValue(event.target.value)} disabled={disabled} /><button type="submit" className="crm-button crm-button--primary" disabled={disabled || !value.trim()}>Add comment</button></form> : null}</section>;
}

export function NotificationItem({ title, context, timestamp, unread, action }: { title: string; context: string; timestamp: string; unread?: boolean; action?: ReactNode }) {
  return <article className="crm-notification-card" data-unread={unread || undefined}><span className="crm-notification-card__icon" aria-hidden><IconBell /></span><div><strong>{title}</strong><p>{context}</p><time>{timestamp}</time></div>{unread ? <span className="sr-only">Unread</span> : null}{action}</article>;
}
