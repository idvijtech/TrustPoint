import { useQuery } from "@tanstack/react-query";
import Sidebar from "@/components/layout/sidebar";
import Header from "@/components/layout/header";
import Stats from "@/components/dashboard/stats";
import ActivityChart from "@/components/dashboard/activity-chart";
import RecentEvents from "@/components/dashboard/recent-events";
import DeviceList from "@/components/device/device-list";
import QuickActions from "@/components/quick-actions";
import ApiKeyDisplay from "@/components/api/api-key-display";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Dashboard() {
  const { data: stats, isLoading: isStatsLoading } = useQuery({
    queryKey: ["/api/dashboard/stats"],
  });

  const { data: events, isLoading: isEventsLoading } = useQuery({
    queryKey: ["/api/dashboard/events"],
  });

  const { data: devicesData, isLoading: isDevicesLoading } = useQuery({
    queryKey: ["/api/devices"],
  });

  return (
    <div className="flex h-screen overflow-hidden bg-neutral-50">
      <Sidebar />

      <main className="flex-1 flex flex-col overflow-hidden">
        <Header />

        <div className="flex-1 overflow-y-auto p-4 md:p-6">
          {/* Auth Status Card */}
          <div className="mb-6 p-4 bg-white rounded-lg shadow-sm border border-neutral-200">
            <div className="flex items-center">
              <div className="flex-shrink-0 p-2 rounded-full bg-success/10 text-success">
                <CheckCircle className="h-5 w-5" />
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-neutral-800">Authentication Status</h3>
                <p className="text-sm text-neutral-600">You are authenticated with JWT. Session expires in <span className="font-medium">45 minutes</span>.</p>
              </div>
              <div className="ml-auto">
                <Button variant="outline" size="sm" className="text-xs text-primary border-primary hover:bg-primary/5">
                  Refresh Token
                </Button>
              </div>
            </div>
          </div>

          {/* Main Dashboard content */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
            {/* Left section - Key stats and device management */}
            <div className="md:col-span-8 space-y-6">
              {/* Stats overview */}
              <Stats stats={stats} isLoading={isStatsLoading} />

              {/* Recent activity chart */}
              <ActivityChart />

              {/* Device Management */}
              <DeviceList devices={devicesData?.devices} isLoading={isDevicesLoading} />
            </div>

            {/* Right sidebar - Quick actions, API integration, etc. */}
            <div className="md:col-span-4 space-y-6">
              {/* Quick Actions */}
              <QuickActions />

              {/* API Access */}
              <ApiKeyDisplay />

              {/* Recent Events */}
              <RecentEvents events={events} isLoading={isEventsLoading} />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
