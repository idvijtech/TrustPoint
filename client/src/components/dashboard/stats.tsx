import { ArrowUpIcon, BarChart3, Users, Camera, AlertTriangle } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface StatsProps {
  stats?: {
    totalDevices: number;
    totalUsers: number;
    securityEvents: number;
  };
  isLoading: boolean;
}

export default function Stats({ stats, isLoading }: StatsProps) {
  const statCards = [
    {
      title: "Total Devices",
      value: stats?.totalDevices || 0,
      icon: <Camera className="h-5 w-5" />,
      change: "+8%",
      color: "text-primary",
      bgColor: "bg-primary/10",
    },
    {
      title: "Registered Users",
      value: stats?.totalUsers || 0,
      icon: <Users className="h-5 w-5" />,
      change: "+12%",
      color: "text-accent",
      bgColor: "bg-accent/10",
    },
    {
      title: "Security Events",
      value: stats?.securityEvents || 0,
      icon: <AlertTriangle className="h-5 w-5" />,
      change: "+5%",
      changeType: "negative",
      color: "text-error",
      bgColor: "bg-error/10",
    },
  ];

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-white p-4 rounded-lg shadow-sm border border-neutral-200">
            <Skeleton className="h-6 w-32 mb-2" />
            <Skeleton className="h-8 w-16 mb-4" />
            <Skeleton className="h-4 w-24" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      {statCards.map((card, index) => (
        <div
          key={index}
          className="bg-white p-4 rounded-lg shadow-sm border border-neutral-200"
        >
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm font-medium text-neutral-500">{card.title}</p>
              <h3 className="text-2xl font-bold text-neutral-800 mt-1">{card.value}</h3>
            </div>
            <div className={`p-2 rounded-md ${card.bgColor} ${card.color}`}>
              {card.icon}
            </div>
          </div>
          <div className="mt-4 flex items-center text-xs">
            <span className={`flex items-center font-medium ${card.changeType === 'negative' ? 'text-error' : 'text-success'}`}>
              <ArrowUpIcon className="mr-1 h-3 w-3" /> {card.change}
            </span>
            <span className="text-neutral-500 ml-2">vs last month</span>
          </div>
        </div>
      ))}
    </div>
  );
}
