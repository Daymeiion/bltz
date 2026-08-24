import Link from "next/link";
import { IconShieldLock } from "@tabler/icons-react";

export default function OrganizationNotFound() {
  return (
    <main className="dark flex min-h-[100dvh] items-center justify-center bg-[#0b0c0e] px-4 text-white">
      <section className="w-full max-w-xl rounded-xl border border-white/10 bg-white/[0.03] p-6 sm:p-8">
        <IconShieldLock className="size-8 text-[#ffbb00]" aria-hidden />
        <h1 className="mt-5 text-xl font-semibold">Workspace not available</h1>
        <p className="mt-2 text-sm leading-6 text-neutral-400">
          This workspace does not exist or your account does not have access to it.
        </p>
        <Link
          href="/organization/select"
          className="mt-6 inline-flex min-h-11 items-center rounded-lg border border-white/15 px-4 text-sm font-semibold text-white outline-none hover:bg-white/[0.06] focus-visible:ring-2 focus-visible:ring-[#ffbb00]"
        >
          Select organization
        </Link>
      </section>
    </main>
  );
}

