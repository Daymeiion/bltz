"use client";

export function LocationMap() {
  const topStates = [
    { state: "California", users: 4820, percentage: 28 },
    { state: "Texas", users: 3240, percentage: 19 },
    { state: "Florida", users: 2680, percentage: 16 },
    { state: "New York", users: 2140, percentage: 12 },
    { state: "Nevada", users: 1890, percentage: 11 },
    { state: "Arizona", users: 1420, percentage: 8 },
    { state: "Other", users: 1010, percentage: 6 },
  ];

  const maxPercentage = Math.max(...topStates.map((s) => s.percentage));

  return (
    <div className="bg-neutral-900/50 border border-neutral-800 rounded-xl p-4 md:p-6">
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-white mb-1">User Location Breakdown</h3>
        <p className="text-sm text-neutral-500">Top states by active users</p>
      </div>

      <div className="space-y-4">
        {topStates.map((item, idx) => (
          <div key={idx} className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-neutral-300 font-medium">{item.state}</span>
              <div className="flex items-center gap-3">
                <span className="text-neutral-400">{item.users.toLocaleString()} users</span>
                <span className="text-white font-semibold w-12 text-right">{item.percentage}%</span>
              </div>
            </div>
            <div className="relative h-2 bg-neutral-800 rounded-full overflow-hidden">
              <div
                className="absolute inset-y-0 left-0 bg-gradient-to-r from-[#000CF5] to-[#FFCA33] rounded-full transition-all duration-500"
                style={{ width: `${item.percentage}%` }}
              />
            </div>
          </div>
        ))}
      </div>

      <div className="mt-6 pt-6 border-t border-neutral-800">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs text-neutral-500 mb-1">Total Users</p>
            <p className="text-2xl font-bold text-white">
              {topStates.reduce((sum, s) => sum + s.users, 0).toLocaleString()}
            </p>
          </div>
          <div>
            <p className="text-xs text-neutral-500 mb-1">Top State</p>
            <p className="text-2xl font-bold text-[#000CF5]">{topStates[0].state}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

