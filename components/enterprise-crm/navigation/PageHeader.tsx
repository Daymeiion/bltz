import type { ReactNode } from "react";

export type PageHeaderProps = {
  eyebrow?: string;
  title: string;
  description?: string;
  meta?: ReactNode;
  actions?: ReactNode;
};

export function PageHeader({ eyebrow, title, description, meta, actions }: PageHeaderProps) {
  return (
    <header className="crm-page-header">
      <div className="crm-page-header__copy">
        {eyebrow ? <p className="crm-eyebrow">{eyebrow}</p> : null}
        <h1 className="crm-page-title">{title}</h1>
        {description ? <p className="crm-page-description">{description}</p> : null}
        {meta ? <div className="crm-page-header__meta">{meta}</div> : null}
      </div>
      {actions ? <div className="crm-page-header__actions">{actions}</div> : null}
    </header>
  );
}
