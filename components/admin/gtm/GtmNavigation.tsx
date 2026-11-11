"use client";

import { IconAddressBook, IconChartDots3, IconFileUpload, IconUsersGroup } from "@tabler/icons-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const items = [
  { href: "/admin/gtm", label: "Overview", icon: IconChartDots3 },
  { href: "/admin/gtm/contacts", label: "Contacts", icon: IconAddressBook },
  { href: "/admin/gtm/players", label: "Players", icon: IconUsersGroup },
  { href: "/admin/gtm/imports", label: "Imports", icon: IconFileUpload },
] as const;

export function GtmNavigation() {
  const pathname = usePathname();

  return (
    <nav aria-label="GTM sections" className="flex max-w-full gap-1 overflow-x-auto rounded-xl border border-neutral-200 bg-white p-1 dark:border-neutral-800 dark:bg-neutral-900">
      {items.map(({ href, label, icon: Icon }) => {
        const active = pathname === href;
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "inline-flex min-h-10 shrink-0 items-center gap-2 rounded-lg px-3 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ffbb00]",
              active
                ? "bg-neutral-950 text-white dark:bg-white dark:text-neutral-950"
                : "text-neutral-500 hover:bg-neutral-100 hover:text-neutral-950 dark:hover:bg-neutral-800 dark:hover:text-white",
            )}
          >
            <Icon className="h-4 w-4" aria-hidden="true" />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
