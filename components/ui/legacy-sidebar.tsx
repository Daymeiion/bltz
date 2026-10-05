"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";
import { useEffect } from "react";

type SidebarProps = {
  open?: boolean;
  setOpen?: (open: boolean) => void;
  children?: React.ReactNode;
  className?: string;
};

export function Sidebar({ open = true, children, className }: SidebarProps) {
  return (
    <aside
      className={cn(
        "bg-neutral-50 dark:bg-neutral-900 border-r border-white/10 dark:border-white/10",
        "w-64 shrink-0 overflow-auto",
        !open && "hidden md:block",
        className
      )}
    >
      {children}
    </aside>
  );
}

export function SidebarBody({
  className,
  children,
}: {
  className?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className={cn("flex h-full flex-col p-3 gap-3", className)}>{children}</div>
  );
}

export function SidebarLink({
  link,
  className,
}: {
  link: { label: string; href: string; icon?: React.ReactNode };
  className?: string;
}) {
  return (
    <Link
      href={link.href}
      className={cn(
        "flex items-center gap-2 rounded-md px-3 py-2 text-sm",
        "text-neutral-800 hover:bg-neutral-100 dark:text-neutral-200 dark:hover:bg-neutral-800",
        className
      )}
    >
      {link.icon}
      <span className="truncate">{link.label}</span>
    </Link>
  );
}


