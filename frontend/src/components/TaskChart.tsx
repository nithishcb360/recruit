'use client';

interface TaskChartProps {
  statusCounts: Record<string, number>;
  priorityCounts: Record<string, number>;
}

export default function TaskChart({ statusCounts, priorityCounts }: TaskChartProps) {
  const statusColors = {
    completed: '#10b981', // green
    in_progress: '#3b82f6', // blue
    pending: '#f59e0b', // amber
    cancelled: '#ef4444' // red
  };

  const priorityColors = {
    urgent: '#dc2626', // red
    high: '#ea580c', // orange
    medium: '#d97706', // amber
    low: '#65a30d' // lime
  };

  const getTotal = (counts: Record<string, number>) => {
    return Object.values(counts).reduce((sum, count) => sum + count, 0);
  };

  const getPercentage = (count: number, total: number) => {
    return total > 0 ? Math.round((count / total) * 100) : 0;
  };

  const statusTotal = getTotal(statusCounts);
  const priorityTotal = getTotal(priorityCounts);

  const StatusBar = ({ status, count, total }: { status: string, count: number, total: number }) => {
    const percentage = getPercentage(count, total);
    const color = statusColors[status as keyof typeof statusColors] || '#6b7280';
    
    return (
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-2">
          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: color }}></div>
          <span className="text-sm font-medium text-gray-700 capitalize">
            {status.replace('_', ' ')}
          </span>
        </div>
        <div className="flex items-center space-x-2">
          <span className="text-sm text-gray-500">{count}</span>
          <div className="w-20 h-2 bg-gray-200 rounded-full overflow-hidden">
            <div 
              className="h-full rounded-full"
              style={{ 
                width: `${percentage}%`,
                backgroundColor: color
              }}
            ></div>
          </div>
          <span className="text-sm font-medium text-gray-700 w-10 text-right">
            {percentage}%
          </span>
        </div>
      </div>
    );
  };

  const PriorityBar = ({ priority, count, total }: { priority: string, count: number, total: number }) => {
    const percentage = getPercentage(count, total);
    const color = priorityColors[priority as keyof typeof priorityColors] || '#6b7280';
    
    return (
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-2">
          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: color }}></div>
          <span className="text-sm font-medium text-gray-700 capitalize">
            {priority}
          </span>
        </div>
        <div className="flex items-center space-x-2">
          <span className="text-sm text-gray-500">{count}</span>
          <div className="w-20 h-2 bg-gray-200 rounded-full overflow-hidden">
            <div 
              className="h-full rounded-full"
              style={{ 
                width: `${percentage}%`,
                backgroundColor: color
              }}
            ></div>
          </div>
          <span className="text-sm font-medium text-gray-700 w-10 text-right">
            {percentage}%
          </span>
        </div>
      </div>
    );
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      <div className="p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-6">Task Analytics</h2>

        <div className="space-y-6">
          {/* Status Chart */}
          <div>
            <h3 className="text-sm font-medium text-gray-700 mb-4">By Status ({statusTotal} total)</h3>
            {Object.keys(statusCounts).length === 0 ? (
              <p className="text-gray-500 text-sm">No status data available</p>
            ) : (
              Object.entries(statusCounts).map(([status, count]) => (
                <StatusBar key={status} status={status} count={count} total={statusTotal} />
              ))
            )}
          </div>

          {/* Priority Chart */}
          <div className="pt-4 border-t border-gray-100">
            <h3 className="text-sm font-medium text-gray-700 mb-4">By Priority ({priorityTotal} total)</h3>
            {Object.keys(priorityCounts).length === 0 ? (
              <p className="text-gray-500 text-sm">No priority data available</p>
            ) : (
              Object.entries(priorityCounts).map(([priority, count]) => (
                <PriorityBar key={priority} priority={priority} count={count} total={priorityTotal} />
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}