import type { ReactNode } from "react";

export const metadata = {
  title: "Claim your locker | BLTZ",
  description: "Build your career locker on BLTZ in three steps.",
};

export default function OnboardingLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-svh bg-gradient-to-br from-[hsl(var(--bltz-navy))] via-[#000000] to-[#000000] text-white">
      <main className="mx-auto flex w-full max-w-3xl flex-col px-6 py-10 md:py-16">
        {children}
      </main>
    </div>
  );
}
