import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import AddUserDialog from "@/components/user/add-user-dialog";
import AddDeviceDialog from "@/components/device/add-device-dialog";

export default function QuickActions() {
  const { toast } = useToast();
  const [isAddUserOpen, setIsAddUserOpen] = useState(false);
  const [isAddDeviceOpen, setIsAddDeviceOpen] = useState(false);

  const handleBackupSystem = () => {
    toast({
      title: "Backup initiated",
      description: "System backup has been started. This may take a few minutes.",
    });
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg font-semibold">Quick Actions</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <Button
          variant="outline"
          className="w-full flex items-center justify-between p-3 border border-neutral-200 rounded-md hover:bg-neutral-50 text-left group"
          onClick={() => setIsAddUserOpen(true)}
        >
          <div className="flex items-center">
            <div className="p-2 rounded-md bg-primary/10 text-primary mr-3">
              <i className="ri-user-add-line"></i>
            </div>
            <div>
              <div className="text-sm font-medium text-neutral-800">Register New User</div>
              <div className="text-xs text-neutral-500">Add user with biometric data</div>
            </div>
          </div>
          <div className="text-neutral-400 group-hover:text-primary">
            <i className="ri-arrow-right-line"></i>
          </div>
        </Button>

        <Button
          variant="outline"
          className="w-full flex items-center justify-between p-3 border border-neutral-200 rounded-md hover:bg-neutral-50 text-left group"
          onClick={() => setIsAddDeviceOpen(true)}
        >
          <div className="flex items-center">
            <div className="p-2 rounded-md bg-primary/10 text-primary mr-3">
              <i className="ri-device-recover-line"></i>
            </div>
            <div>
              <div className="text-sm font-medium text-neutral-800">Register New Device</div>
              <div className="text-xs text-neutral-500">Connect Hikvision device</div>
            </div>
          </div>
          <div className="text-neutral-400 group-hover:text-primary">
            <i className="ri-arrow-right-line"></i>
          </div>
        </Button>

        <Link href="/settings">
          <Button
            variant="outline"
            className="w-full flex items-center justify-between p-3 border border-neutral-200 rounded-md hover:bg-neutral-50 text-left group"
          >
            <div className="flex items-center">
              <div className="p-2 rounded-md bg-primary/10 text-primary mr-3">
                <i className="ri-file-search-line"></i>
              </div>
              <div>
                <div className="text-sm font-medium text-neutral-800">View Audit Logs</div>
                <div className="text-xs text-neutral-500">Check system activity</div>
              </div>
            </div>
            <div className="text-neutral-400 group-hover:text-primary">
              <i className="ri-arrow-right-line"></i>
            </div>
          </Button>
        </Link>

        <Button
          variant="outline"
          className="w-full flex items-center justify-between p-3 border border-neutral-200 rounded-md hover:bg-neutral-50 text-left group"
          onClick={handleBackupSystem}
        >
          <div className="flex items-center">
            <div className="p-2 rounded-md bg-primary/10 text-primary mr-3">
              <i className="ri-download-cloud-line"></i>
            </div>
            <div>
              <div className="text-sm font-medium text-neutral-800">System Backup</div>
              <div className="text-xs text-neutral-500">Backup configuration</div>
            </div>
          </div>
          <div className="text-neutral-400 group-hover:text-primary">
            <i className="ri-arrow-right-line"></i>
          </div>
        </Button>
      </CardContent>

      {/* User Registration Dialog */}
      <AddUserDialog
        open={isAddUserOpen}
        onClose={() => setIsAddUserOpen(false)}
        onUserAdded={() => {
          setIsAddUserOpen(false);
          toast({
            title: "User added",
            description: "User has been registered successfully.",
          });
        }}
      />

      {/* Device Registration Dialog */}
      <AddDeviceDialog
        open={isAddDeviceOpen}
        onClose={() => setIsAddDeviceOpen(false)}
        onDeviceAdded={() => {
          setIsAddDeviceOpen(false);
          toast({
            title: "Device added",
            description: "Device has been registered successfully.",
          });
        }}
      />
    </Card>
  );
}
