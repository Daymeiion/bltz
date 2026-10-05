import type { Activity } from "@/lib/queries/dashboard";

export function ActivityFeed({ activities }: { activities: Activity[] }) {
  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    
    if (diffInSeconds < 60) return 'Just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`;
    return date.toLocaleDateString();
  };

  const getActivityColor = (type: Activity['type']) => {
    switch (type) {
      case 'video_upload':
        return 'bg-blue-500';
      case 'video_view':
        return 'bg-green-500';
      case 'follower':
        return 'bg-purple-500';
      case 'achievement':
        return 'bg-orange-500';
      default:
        return 'bg-neutral-500';
    }
  };

  if (activities.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-sm text-neutral-500 dark:text-neutral-400">No recent activity</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {activities.map((activity) => (
        <div key={activity.id} className="flex gap-3">
          <div className={`w-2 h-2 ${getActivityColor(activity.type)} rounded-full mt-2 flex-shrink-0`}></div>
          <div className="flex-1 min-w-0">
            <p className="text-sm text-neutral-700 dark:text-neutral-300">
              {activity.description}
            </p>
            <p className="text-xs text-neutral-500 dark:text-neutral-500 mt-0.5">
              {formatTimeAgo(activity.timestamp)}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}

