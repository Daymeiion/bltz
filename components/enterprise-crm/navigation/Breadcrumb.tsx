import Link from "next/link";
import { Fragment } from "react";
import { IconChevronRight } from "@tabler/icons-react";

export type BreadcrumbItem = { label: string; href?: string };

export function Breadcrumb({ items, label = "Breadcrumb" }: { items: readonly BreadcrumbItem[]; label?: string }) {
  return (
    <nav className="crm-breadcrumb" aria-label={label}>
      <ol>
        {items.map((item, index) => {
          const current = index === items.length - 1;
          return (
            <Fragment key={`${item.label}-${index}`}>
              <li>{item.href && !current ? <Link href={item.href}>{item.label}</Link> : <span aria-current={current ? "page" : undefined}>{item.label}</span>}</li>
              {!current ? <li aria-hidden className="crm-breadcrumb__separator"><IconChevronRight /></li> : null}
            </Fragment>
          );
        })}
      </ol>
    </nav>
  );
}
