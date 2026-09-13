import Link from "next/link";
import { redirect } from "next/navigation";
import {
  IconArrowRight,
  IconBuildingStadium,
  IconShieldLock,
} from "@tabler/icons-react";
import { listAccessibleOrganizations } from "@/lib/organization/context";

function formatCode(value: string): string {
  return value
    .split("_")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export default async function OrganizationSelectPage() {
  const result = await listAccessibleOrganizations();

  if (!result.ok) {
    redirect(`/auth/login?next=${encodeURIComponent("/organization/select")}`);
  }

  return (
    <main className="dark min-h-[100dvh] bg-[#0b0c0e] px-4 py-10 text-white sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-3xl">
        <Link
          href="/"
          className="mb-12 inline-flex items-center gap-2 rounded-md outline-none focus-visible:ring-2 focus-visible:ring-[#ffbb00]"
        >
          <span className="flex size-9 items-center justify-center rounded-lg bg-[#ffbb00] font-black text-[#111111]">B</span>
          <span className="font-[var(--font-oswald)] text-lg font-bold tracking-wide">BLTZ</span>
        </Link>

        <div className="max-w-2xl">
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.14em] text-[#ffbb00]">
            Media operations
          </p>
          <h1 className="font-[var(--font-oswald)] text-3xl font-bold tracking-tight sm:text-4xl">
            Select an organization workspace
          </h1>
          <p className="mt-3 max-w-xl text-sm leading-6 text-neutral-400 sm:text-base">
            Your available workspaces are derived from active organization access and platform assignments.
          </p>
        </div>

        {result.organizations.length > 0 ? (
          <div className="mt-10 grid gap-3">
            {result.organizations.map((entry) => {
              const access = entry.access.scope === "platform"
                ? "Platform access"
                : formatCode(entry.access.role);

              return (
                <Link
                  key={entry.organization.id}
                  href={`/organization/${entry.organization.id}/dashboard`}
                  className="group flex min-h-20 items-center gap-4 rounded-xl border border-white/10 bg-white/[0.03] p-4 outline-none transition-colors hover:border-[#ffbb00]/50 hover:bg-white/[0.06] focus-visible:ring-2 focus-visible:ring-[#ffbb00]"
                >
                  <span className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-[#ffbb00] text-[#111111]">
                    <IconBuildingStadium className="size-5" aria-hidden />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-semibold text-white">
                      {entry.organization.name}
                    </span>
                    <span className="mt-1 block truncate text-sm text-neutral-400">
                      {formatCode(entry.organization.organizationType)} | {access}
                    </span>
                  </span>
                  <IconArrowRight className="size-5 shrink-0 text-neutral-600 transition-colors group-hover:text-[#ffbb00]" aria-hidden />
                </Link>
              );
            })}
          </div>
        ) : (
          <section className="mt-10 rounded-xl border border-white/10 bg-white/[0.03] p-6 sm:p-8">
            <IconShieldLock className="size-8 text-[#ffbb00]" aria-hidden />
            <h2 className="mt-5 text-lg font-semibold">No workspace access</h2>
            <p className="mt-2 max-w-lg text-sm leading-6 text-neutral-400">
              Your account does not have an active organization membership. Ask an organization owner or platform administrator to review your access.
            </p>
            <Link
              href="/dashboard"
              className="mt-6 inline-flex min-h-11 items-center rounded-lg border border-white/15 px-4 text-sm font-semibold text-white outline-none transition-colors hover:bg-white/[0.06] focus-visible:ring-2 focus-visible:ring-[#ffbb00]"
            >
              Return to personal dashboard
            </Link>
          </section>
        )}
      </div>
    </main>
  );
}

