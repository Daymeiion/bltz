"use client";

export function InviteAnalytics() {
  const inviteData = [
    { source: "Email", sent: 2400, accepted: 1680, rate: 70 },
    { source: "SMS", sent: 1800, accepted: 1260, rate: 70 },
    { source: "Social Media", sent: 3200, accepted: 1920, rate: 60 },
    { source: "Direct Link", sent: 1600, accepted: 1120, rate: 70 },
  ];

  const totalSent = inviteData.reduce((sum, d) => sum + d.sent, 0);
  const totalAccepted = inviteData.reduce((sum, d) => sum + d.accepted, 0);
  const avgRate = Math.round((totalAccepted / totalSent) * 100);

  return (
    <div className="bg-neutral-900/50 border border-neutral-800 rounded-xl p-4 md:p-6">
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-white mb-1">Invitation Analytics</h3>
        <p className="text-sm text-neutral-500">Sent vs. accepted by channel</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-neutral-800/50 rounded-lg p-4">
          <p className="text-xs text-neutral-500 mb-1">Total Sent</p>
          <p className="text-2xl font-bold text-white">{totalSent.toLocaleString()}</p>
        </div>
        <div className="bg-neutral-800/50 rounded-lg p-4">
          <p className="text-xs text-neutral-500 mb-1">Total Accepted</p>
          <p className="text-2xl font-bold text-[#FFCA33]">{totalAccepted.toLocaleString()}</p>
        </div>
        <div className="bg-neutral-800/50 rounded-lg p-4">
          <p className="text-xs text-neutral-500 mb-1">Acceptance Rate</p>
          <p className="text-2xl font-bold text-[#000CF5]">{avgRate}%</p>
        </div>
      </div>

      {/* Channel Breakdown */}
      <div className="space-y-4">
        {inviteData.map((item, idx) => (
          <div key={idx} className="bg-neutral-800/30 rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-medium text-white">{item.source}</span>
              <span className="text-sm font-semibold text-[#FFCA33]">{item.rate}%</span>
            </div>
            <div className="flex items-center gap-4 text-xs text-neutral-400">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-neutral-600"></div>
                <span>Sent: {item.sent.toLocaleString()}</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-[#000CF5]"></div>
                <span>Accepted: {item.accepted.toLocaleString()}</span>
              </div>
            </div>
            <div className="relative h-2 bg-neutral-700 rounded-full overflow-hidden mt-3">
              <div
                className="absolute inset-y-0 left-0 bg-[#000CF5] rounded-full"
                style={{ width: `${item.rate}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

