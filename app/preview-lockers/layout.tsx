import type { Metadata } from "next";
export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "BLTZ Player Locker Preview", robots: { index: false, follow: false, noarchive: true }, referrer: "no-referrer" };
export default async function PrivatePreviewLayout({ children }: { children: React.ReactNode }) {
  // The required [slug] layout authorizes every Locker and nested room.
  return <>{children}</>;
}
