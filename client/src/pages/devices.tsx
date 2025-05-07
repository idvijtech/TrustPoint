import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Sidebar from "@/components/layout/sidebar";
import Header from "@/components/layout/header";
import DeviceList from "@/components/device/device-list";
import AddDeviceDialog from "@/components/device/add-device-dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

export default function DevicesPage() {
  const [isAddDeviceOpen, setIsAddDeviceOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["/api/devices", { page: currentPage, limit: pageSize }],
  });

  const devices = data?.devices || [];
  const totalDevices = data?.total || 0;
  const totalPages = Math.ceil(totalDevices / pageSize);

  return (
    <div className="flex h-screen overflow-hidden bg-neutral-50">
      <Sidebar />

      <main className="flex-1 flex flex-col overflow-hidden">
        <Header />

        <div className="flex-1 overflow-y-auto p-4 md:p-6">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold text-neutral-800">Device Management</h1>
            <Button onClick={() => setIsAddDeviceOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Device
            </Button>
          </div>

          <Card>
            <CardHeader className="border-b border-neutral-200">
              <CardTitle>Registered Devices</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <DeviceList 
                devices={devices} 
                isLoading={isLoading} 
                onRefresh={refetch}
                pagination={{
                  currentPage,
                  totalPages,
                  onPageChange: setCurrentPage
                }}
                showViewDetails
              />
            </CardContent>
          </Card>

          <AddDeviceDialog 
            open={isAddDeviceOpen} 
            onClose={() => setIsAddDeviceOpen(false)}
            onDeviceAdded={() => {
              refetch();
              setIsAddDeviceOpen(false);
            }}
          />
        </div>
      </main>
    </div>
  );
}
