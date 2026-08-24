"use client";

import Link from "next/link";
import { IconAlertTriangle } from "@tabler/icons-react";

export default function OrganizationError({ reset }: { reset: () => void }) {
  return (
    <div className="flex min-h-[60dvh] items-center justify-center px-4 py-12">
      <section className="w-full max-w-xl rounded-xl border border-red-400/20 bg-red-400/[0.06] p-6 sm:p-8">
        <IconAlertTriangle className="size-8 text-red-300" aria-hidden />
        <h1 className="mt-5 text-xl font-semibold text-white">Workspace unavailable</h1>
        <p className="mt-2 text-sm leading-6 text-neutral-400">
          The organization workspace could not be loaded. Retry the request or return to workspace selection.
        </p>
        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <button
            type="button"
            onClick={reset}
            className="min-h-11 rounded-lg bg-[#ffbb00] px-4 text-sm font-semibold text-[#111111] outline-none hover:bg-[#e5a800] focus-visible:ring-2 focus-visible:ring-[#ffbb00] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0b0c0e]"
          >
            Retry
          </button>
          <Link
            href="/organization/select"
            className="inline-flex min-h-11 items-center justify-center rounded-lg border border-white/15 px-4 text-sm font-semibold text-white outline-none hover:bg-white/[0.06] focus-visible:ring-2 focus-visible:ring-[#ffbb00]"
          >
            Select organization
          </Link>
        </div>
      </section>
    </div>
  );
}

