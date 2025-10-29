'use client';

interface StatsCardsProps {
  stats: {
    total_users: number;
    active_users: number;
    total_revenue: number;
    orders_today: number;
  };
}

export default function StatsCards({ stats }: StatsCardsProps) {
  const cards = [
    {
      title: 'Total Users',
      value: stats.total_users.toLocaleString(),
      icon: '👥',
      color: 'bg-blue-500',
      bgColor: 'bg-blue-50',
      textColor: 'text-blue-600'
    },
    {
      title: 'Active Users',
      value: stats.active_users.toLocaleString(),
      icon: '🟢',
      color: 'bg-green-500',
      bgColor: 'bg-green-50',
      textColor: 'text-green-600'
    },
    {
      title: 'Total Revenue',
      value: `$${stats.total_revenue.toLocaleString('en-US', { minimumFractionDigits: 2 })}`,
      icon: '💰',
      color: 'bg-yellow-500',
      bgColor: 'bg-yellow-50',
      textColor: 'text-yellow-600'
    },
    {
      title: 'Orders Today',
      value: stats.orders_today.toLocaleString(),
      icon: '📦',
      color: 'bg-purple-500',
      bgColor: 'bg-purple-50',
      textColor: 'text-purple-600'
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      {cards.map((card) => (
        <div key={card.title} className={`${card.bgColor} rounded-lg shadow-sm p-6 border border-gray-200`}>
          <div className="flex items-center justify-between">
            <div>
              <p className={`text-sm font-medium ${card.textColor} opacity-75`}>
                {card.title}
              </p>
              <p className={`text-2xl font-bold ${card.textColor}`}>
                {card.value}
              </p>
            </div>
            <div className={`${card.color} text-white p-3 rounded-full text-xl`}>
              {card.icon}
            </div>
          </div>
          <div className="mt-4">
            <div className={`flex items-center text-sm ${card.textColor}`}>
              <span className="font-medium">↗️ 12%</span>
              <span className="ml-2 opacity-75">vs last month</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}