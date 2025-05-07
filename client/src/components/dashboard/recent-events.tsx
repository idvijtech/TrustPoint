import { formatDistanceToNow } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle, CheckCircle, Settings, AlertTriangle } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface Event {
  id: number;
  userId?: number;
  deviceId?: number;
  eventType: string;
  timestamp: string;
  user?: {
    firstName: string;
    lastName: string;
  };
  device?: {
    name: string;
  };
  details?: any;
}

interface RecentEventsProps {
  events?: Event[];
  isLoading?: boolean;
}

export default function RecentEvents({ events, isLoading }: RecentEventsProps) {
  const getEventIcon = (eventType: string) => {
    switch (eventType) {
      case "access_granted":
        return (
          <div className="flex-shrink-0 h-8 w-8 rounded-full bg-success/10 flex items-center justify-center mt-1">
            <CheckCircle className="h-4 w-4 text-success" />
          </div>
        );
      case "access_denied":
        return (
          <div className="flex-shrink-0 h-8 w-8 rounded-full bg-warning/10 flex items-center justify-center mt-1">
            <AlertCircle className="h-4 w-4 text-warning" />
          </div>
        );
      case "system_config":
        return (
          <div className="flex-shrink-0 h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center mt-1">
            <Settings className="h-4 w-4 text-primary" />
          </div>
        );
      case "device_offline":
        return (
          <div className="flex-shrink-0 h-8 w-8 rounded-full bg-error/10 flex items-center justify-center mt-1">
            <AlertTriangle className="h-4 w-4 text-error" />
          </div>
        );
      default:
        return (
          <div className="flex-shrink-0 h-8 w-8 rounded-full bg-neutral-100 flex items-center justify-center mt-1">
            <AlertCircle className="h-4 w-4 text-neutral-500" />
          </div>
        );
    }
  };

  const getEventTitle = (event: Event) => {
    switch (event.eventType) {
      case "access_granted":
        return "User access granted";
      case "access_denied":
        return "Access denied";
      case "system_config":
        return "System configuration changed";
      case "device_offline":
        return "Device offline";
      default:
        return "Unknown event";
    }
  };

  const getEventDescription = (event: Event) => {
    if (event.eventType === "access_granted" && event.user && event.device) {
      return `${event.user.firstName} ${event.user.lastName} accessed ${event.device.name}`;
    } else if (event.eventType === "access_denied" && event.device) {
      return `Failed access attempt at ${event.device.name}`;
    } else if (event.eventType === "system_config") {
      return "Admin updated system settings";
    } else if (event.eventType === "device_offline" && event.device) {
      return `${event.device.name} disconnected`;
    }
    return "";
  };

  const getTimeAgo = (timestamp: string) => {
    try {
      return formatDistanceToNow(new Date(timestamp), { addSuffix: true });
    } catch (error) {
      return "Unknown time";
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="flex justify-between items-center pb-2">
          <CardTitle className="text-lg font-semibold">Recent Events</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="flex items-start">
              <Skeleton className="h-8 w-8 rounded-full mr-3" />
              <div className="space-y-2 flex-1">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-3 w-16" />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  // Sample events if real data not available yet
  const sampleEvents = [
    {
      id: 1,
      eventType: "access_granted",
      timestamp: new Date(Date.now() - 600000).toISOString(), // 10 min ago
      user: { firstName: "John", lastName: "Doe" },
      device: { name: "Server Room" },
    },
    {
      id: 2,
      eventType: "access_denied",
      timestamp: new Date(Date.now() - 1500000).toISOString(), // 25 min ago
      device: { name: "Main Entrance" },
    },
    {
      id: 3,
      eventType: "system_config",
      timestamp: new Date(Date.now() - 7200000).toISOString(), // 2 hours ago
    },
    {
      id: 4,
      eventType: "device_offline",
      timestamp: new Date(Date.now() - 259200000).toISOString(), // 3 days ago
      device: { name: "Biometric Scanner" },
    },
  ];

  const displayEvents = events || sampleEvents;

  return (
    <Card>
      <CardHeader className="flex justify-between items-center pb-2">
        <CardTitle className="text-lg font-semibold">Recent Events</CardTitle>
        <a href="#" className="text-xs text-primary">
          View All
        </a>
      </CardHeader>
      <CardContent className="space-y-3">
        {displayEvents.map((event) => (
          <div key={event.id} className="flex items-start">
            {getEventIcon(event.eventType)}
            <div className="ml-3">
              <div className="text-sm font-medium text-neutral-800">
                {getEventTitle(event)}
              </div>
              <div className="text-xs text-neutral-500">
                {getEventDescription(event)}
              </div>
              <div className="text-xs text-neutral-400 mt-1">
                {getTimeAgo(event.timestamp)}
              </div>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
