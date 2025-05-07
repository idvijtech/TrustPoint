import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Device } from "@shared/schema";
import { formatDistanceToNow } from "date-fns";
import { MoreHorizontal, Settings2 } from "lucide-react";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface DeviceListProps {
  devices?: Device[];
  isLoading?: boolean;
  onRefresh?: () => void;
  pagination?: {
    currentPage: number;
    totalPages: number;
    onPageChange: (page: number) => void;
  };
  showViewDetails?: boolean;
}

export default function DeviceList({ 
  devices, 
  isLoading, 
  onRefresh,
  pagination,
  showViewDetails = false
}: DeviceListProps) {
  const { toast } = useToast();
  const [selectedDevice, setSelectedDevice] = useState<number | null>(null);

  const getDeviceTypeIcon = (type: string) => {
    if (type.toLowerCase().includes("camera")) {
      return "ri-camera-line";
    } else if (type.toLowerCase().includes("biometric") || type.toLowerCase().includes("finger")) {
      return "ri-fingerprint-line";
    } else if (type.toLowerCase().includes("access") || type.toLowerCase().includes("door")) {
      return "ri-door-lock-line";
    } else {
      return "ri-device-line";
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status.toLowerCase()) {
      case "online":
        return <span className="status-badge-online">Online</span>;
      case "offline":
        return <span className="status-badge-offline">Offline</span>;
      case "maintenance":
        return <span className="status-badge-maintenance">Maintenance</span>;
      default:
        return <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-neutral-100 text-neutral-800">Unknown</span>;
    }
  };

  const checkDeviceConnectivityMutation = useMutation({
    mutationFn: async (deviceId: number) => {
      const response = await apiRequest("POST", `/api/devices/${deviceId}/check`, {});
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: data.connected ? "Device is online" : "Device is offline",
        description: data.connected 
          ? "Connection to the device was successful" 
          : "Could not connect to the device. Please check the device configuration.",
        variant: data.connected ? "default" : "destructive",
      });
      
      // Refresh the device list to show updated status
      if (onRefresh) {
        onRefresh();
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Error checking device status",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteDeviceMutation = useMutation({
    mutationFn: async (deviceId: number) => {
      await apiRequest("DELETE", `/api/devices/${deviceId}`);
    },
    onSuccess: () => {
      toast({
        title: "Device deleted",
        description: "The device has been successfully removed.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/devices"] });
      setSelectedDevice(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Error deleting device",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleCheckConnectivity = (deviceId: number) => {
    checkDeviceConnectivityMutation.mutate(deviceId);
  };

  const handleDeleteDevice = (deviceId: number) => {
    deleteDeviceMutation.mutate(deviceId);
  };

  const getLastConnectionTime = (lastConnection: string | null | undefined) => {
    if (!lastConnection) return "Never";
    
    try {
      return formatDistanceToNow(new Date(lastConnection), { addSuffix: true });
    } catch (error) {
      return "Unknown";
    }
  };

  if (isLoading) {
    return (
      <div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Device</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Last Connection</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {[1, 2, 3, 4].map((i) => (
              <TableRow key={i}>
                <TableCell>
                  <div className="flex items-center">
                    <Skeleton className="h-8 w-8 rounded mr-3" />
                    <div>
                      <Skeleton className="h-4 w-32 mb-1" />
                      <Skeleton className="h-3 w-24" />
                    </div>
                  </div>
                </TableCell>
                <TableCell><Skeleton className="h-4 w-40" /></TableCell>
                <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                <TableCell className="text-right">
                  <Skeleton className="h-8 w-16 ml-auto" />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    );
  }

  // Sample devices if real data not available yet
  const sampleDevices = [
    {
      id: 1,
      name: "Main Entrance Camera",
      type: "Hikvision DS-2CD2385G1",
      ip: "192.168.1.100",
      status: "online",
      lastConnection: new Date(Date.now() - 120000).toISOString(), // 2 minutes ago
    },
    {
      id: 2,
      name: "Server Room Access",
      type: "Hikvision DS-K1T501SF",
      ip: "192.168.1.101",
      status: "online",
      lastConnection: new Date(Date.now() - 300000).toISOString(), // 5 minutes ago
    },
    {
      id: 3,
      name: "Parking Lot Camera",
      type: "Hikvision DS-2CD2047G1",
      ip: "192.168.1.102",
      status: "maintenance",
      lastConnection: new Date(Date.now() - 86400000).toISOString(), // 1 day ago
    },
    {
      id: 4,
      name: "Biometric Scanner",
      type: "Hikvision DS-K1T804MF",
      ip: "192.168.1.103",
      status: "offline",
      lastConnection: new Date(Date.now() - 259200000).toISOString(), // 3 days ago
    },
  ];

  const displayDevices = devices?.length ? devices : sampleDevices;

  return (
    <div className="bg-white rounded-lg shadow-sm border border-neutral-200">
      <div className="border-b border-neutral-200 p-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-neutral-800">Device Management</h2>
          {!showViewDetails && (
            <Button onClick={() => window.location.href = "/devices"}>
              <i className="ri-add-line mr-1"></i>
              Add Device
            </Button>
          )}
        </div>
      </div>
      
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Device</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Last Connection</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {displayDevices.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                  No devices found. Add a new device to get started.
                </TableCell>
              </TableRow>
            ) : (
              displayDevices.map((device) => (
                <TableRow key={device.id} className="hover:bg-neutral-50">
                  <TableCell>
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-8 w-8 rounded bg-neutral-100 flex items-center justify-center">
                        <i className={`${getDeviceTypeIcon(device.type)} text-neutral-500`}></i>
                      </div>
                      <div className="ml-3">
                        <div className="text-sm font-medium text-neutral-800">{device.name}</div>
                        <div className="text-xs text-neutral-500">{device.ip}</div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm text-neutral-700">{device.type}</div>
                  </TableCell>
                  <TableCell>
                    {getStatusBadge(device.status)}
                  </TableCell>
                  <TableCell className="text-sm text-neutral-700">
                    {getLastConnectionTime(device.lastConnection)}
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <MoreHorizontal className="h-4 w-4" />
                          <span className="sr-only">Actions</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => handleCheckConnectivity(device.id)}>
                          Check Connectivity
                        </DropdownMenuItem>
                        {showViewDetails && (
                          <DropdownMenuItem onClick={() => window.location.href = `/devices/${device.id}`}>
                            View Details
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuSeparator />
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <DropdownMenuItem 
                              onSelect={(e) => e.preventDefault()}
                              className="text-error"
                            >
                              Delete Device
                            </DropdownMenuItem>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                              <AlertDialogDescription>
                                This will permanently delete the device "{device.name}" from the system.
                                This action cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction 
                                onClick={() => handleDeleteDevice(device.id)}
                                className="bg-error hover:bg-error/90"
                              >
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
      
      {pagination && pagination.totalPages > 1 && (
        <div className="px-4 py-3 border-t border-neutral-200 flex items-center justify-between">
          <div className="text-sm text-neutral-500">
            Showing page {pagination.currentPage} of {pagination.totalPages}
          </div>
          <Pagination>
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious 
                  href="#"
                  onClick={(e) => {
                    e.preventDefault();
                    if (pagination.currentPage > 1) {
                      pagination.onPageChange(pagination.currentPage - 1);
                    }
                  }}
                  className={pagination.currentPage <= 1 ? "pointer-events-none opacity-50" : ""}
                />
              </PaginationItem>
              
              {/* Add pagination numbers for up to 5 pages */}
              {Array.from({ length: Math.min(5, pagination.totalPages) }).map((_, idx) => (
                <PaginationItem key={idx}>
                  <PaginationLink
                    href="#"
                    isActive={pagination.currentPage === idx + 1}
                    onClick={(e) => {
                      e.preventDefault();
                      pagination.onPageChange(idx + 1);
                    }}
                  >
                    {idx + 1}
                  </PaginationLink>
                </PaginationItem>
              ))}
              
              <PaginationItem>
                <PaginationNext 
                  href="#"
                  onClick={(e) => {
                    e.preventDefault();
                    if (pagination.currentPage < pagination.totalPages) {
                      pagination.onPageChange(pagination.currentPage + 1);
                    }
                  }}
                  className={pagination.currentPage >= pagination.totalPages ? "pointer-events-none opacity-50" : ""}
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </div>
      )}
    </div>
  );
}
