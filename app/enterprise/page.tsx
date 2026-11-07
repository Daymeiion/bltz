import type { Metadata } from "next";
import { EnterpriseHeroPage } from "@/components/redesign/EnterpriseLanding";
import { LiveRoutes } from "@/components/redesign/SiteChrome";
import { redesignFontClasses } from "../redesign/fonts";

export const metadata: Metadata = {
  title: "BLTZ for Athletic Departments and NIL Collectives",
  description:
    "Give your former players a Locker, see which moments are worth celebrating next, and measure the reach. Book a demo.",
};

// The full enterprise page is in progress at /redesign/enterprise.
export default function EnterprisePage() {
  return (
    <div data-redesign className={redesignFontClasses}>
      <LiveRoutes>
        <EnterpriseHeroPage />
      </LiveRoutes>
    </div>
  );
}
