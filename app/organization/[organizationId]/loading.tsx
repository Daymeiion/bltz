export default function OrganizationLoading() {
  return (
    <div className="dark min-h-[100dvh] bg-[#0b0c0e] text-white" aria-label="Loading organization workspace">
      <div className="fixed inset-y-0 left-0 hidden w-64 border-r border-white/10 bg-[#111214] p-4 md:block">
        <div className="h-9 w-28 animate-pulse rounded-lg bg-white/[0.06]" />
        <div className="mt-6 h-14 animate-pulse rounded-xl bg-white/[0.06]" />
        <div className="mt-8 space-y-2">
          {Array.from({ length: 7 }).map((_, index) => (
            <div key={index} className="h-11 animate-pulse rounded-xl bg-white/[0.04]" />
          ))}
        </div>
      </div>
      <div className="md:pl-64">
        <div className="h-16 border-b border-white/10 bg-[#0b0c0e]" />
        <div className="mx-auto max-w-[1440px] px-4 py-8 sm:px-6 lg:px-8">
          <div className="h-3 w-20 animate-pulse rounded bg-[#ffbb00]/20" />
          <div className="mt-3 h-10 max-w-sm animate-pulse rounded-lg bg-white/[0.06]" />
          <div className="mt-4 h-5 max-w-lg animate-pulse rounded bg-white/[0.04]" />
          <div className="mt-8 h-28 animate-pulse border-y border-white/10 bg-white/[0.02]" />
          <div className="mt-8 h-44 animate-pulse rounded-xl border border-white/10 bg-white/[0.03]" />
        </div>
      </div>
    </div>
  );
}

