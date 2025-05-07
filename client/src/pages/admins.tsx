import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, getQueryFn, apiRequest } from "@/lib/queryClient";
import { Admin, AdminRole, AdminPermissions } from "@shared/schema";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import Sidebar from "@/components/layout/sidebar";
import Header from "@/components/layout/header";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { Checkbox } from "@/components/ui/checkbox";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { format } from "date-fns";
import { Loader2, UserPlus, Edit2, Trash2, Shield, CheckCircle, XCircle } from "lucide-react";

type AdminWithoutPassword = Omit<Admin, "password">;
type AdminResponse = {
  admins: AdminWithoutPassword[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
};

export default function AdminsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedAdmin, setSelectedAdmin] = useState<AdminWithoutPassword | null>(null);
  const [formData, setFormData] = useState({
    username: "",
    password: "",
    fullName: "",
    email: "",
    department: "",
    phone: "",
    role: AdminRole.VIEWER,
  });
  const [permissionsForm, setPermissionsForm] = useState<AdminPermissions>({
    manageAdmins: false,
    manageUsers: false,
    manageDevices: false,
    viewDeviceLogs: false,
    createEvents: false,
    editEvents: false,
    deleteEvents: false,
    uploadMedia: false,
    editMedia: false,
    deleteMedia: false,
    manageGroups: false,
    managePermissions: false,
    manageSettings: false,
    viewAuditLogs: false,
    manageApiKeys: false,
  });

  // Fetch admins with pagination
  const { data, isLoading, isError } = useQuery<AdminResponse>({
    queryKey: ["/api/admins", { page, limit }],
    queryFn: getQueryFn({ on401: "returnNull" }),
  });

  // Add admin mutation
  const addAdminMutation = useMutation({
    mutationFn: async (adminData: any) => {
      const res = await apiRequest("POST", "/api/register", adminData);
      return await res.json();
    },
    onSuccess: () => {
      setIsAddDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: ["/api/admins"] });
      resetForms();
      toast({
        title: "Success",
        description: "Admin added successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: `Failed to add admin: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  // Update admin mutation
  const updateAdminMutation = useMutation({
    mutationFn: async ({ id, adminData }: { id: number; adminData: any }) => {
      const res = await apiRequest("PATCH", `/api/admins/${id}`, adminData);
      return await res.json();
    },
    onSuccess: () => {
      setIsEditDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: ["/api/admins"] });
      resetForms();
      toast({
        title: "Success",
        description: "Admin updated successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: `Failed to update admin: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  // Delete admin mutation
  const deleteAdminMutation = useMutation({
    mutationFn: async (id: number) => {
      return await apiRequest("DELETE", `/api/admins/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admins"] });
      toast({
        title: "Success",
        description: "Admin deactivated successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: `Failed to deactivate admin: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  // Handle form inputs
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleRoleChange = (value: string) => {
    setFormData({ ...formData, role: value as AdminRole });
    
    // Set default permissions for the selected role
    if (value) {
      const permissionsDefaults = getRolePermissionsDefaults(value as AdminRole);
      setPermissionsForm(permissionsDefaults);
    }
  };
  
  const handlePermissionChange = (permission: keyof AdminPermissions, checked: boolean) => {
    setPermissionsForm({
      ...permissionsForm,
      [permission]: checked,
    });
  };

  // Get default permissions based on role
  const getRolePermissionsDefaults = (role: AdminRole): AdminPermissions => {
    switch (role) {
      case AdminRole.SUPER_ADMIN:
        return {
          manageAdmins: true,
          manageUsers: true,
          manageDevices: true,
          viewDeviceLogs: true,
          createEvents: true,
          editEvents: true,
          deleteEvents: true,
          uploadMedia: true,
          editMedia: true,
          deleteMedia: true,
          manageGroups: true,
          managePermissions: true,
          manageSettings: true,
          viewAuditLogs: true,
          manageApiKeys: true,
        };
      case AdminRole.ADMIN:
        return {
          manageAdmins: true,
          manageUsers: true,
          manageDevices: true,
          viewDeviceLogs: true,
          createEvents: true,
          editEvents: true,
          deleteEvents: true,
          uploadMedia: true,
          editMedia: true,
          deleteMedia: true,
          manageGroups: true,
          managePermissions: true,
          manageSettings: true,
          viewAuditLogs: true,
          manageApiKeys: true,
        };
      case AdminRole.MANAGER:
        return {
          manageAdmins: false,
          manageUsers: true,
          manageDevices: true,
          viewDeviceLogs: true,
          createEvents: true,
          editEvents: true,
          deleteEvents: false,
          uploadMedia: true,
          editMedia: true,
          deleteMedia: false,
          manageGroups: true,
          managePermissions: false,
          manageSettings: false,
          viewAuditLogs: true,
          manageApiKeys: false,
        };
      case AdminRole.EDITOR:
        return {
          manageAdmins: false,
          manageUsers: false,
          manageDevices: false,
          viewDeviceLogs: true,
          createEvents: true,
          editEvents: true,
          deleteEvents: false,
          uploadMedia: true,
          editMedia: true,
          deleteMedia: false,
          manageGroups: false,
          managePermissions: false,
          manageSettings: false,
          viewAuditLogs: false,
          manageApiKeys: false,
        };
      case AdminRole.VIEWER:
      default:
        return {
          manageAdmins: false,
          manageUsers: false,
          manageDevices: false,
          viewDeviceLogs: false,
          createEvents: false,
          editEvents: false,
          deleteEvents: false,
          uploadMedia: false,
          editMedia: false,
          deleteMedia: false,
          manageGroups: false,
          managePermissions: false,
          manageSettings: false,
          viewAuditLogs: false,
          manageApiKeys: false,
        };
    }
  };

  // Submit handlers
  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    addAdminMutation.mutate({
      ...formData,
      permissions: permissionsForm,
      createdBy: user?.id,
    });
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAdmin) return;

    const updateData: any = {
      fullName: formData.fullName,
      email: formData.email,
      department: formData.department,
      phone: formData.phone,
      permissions: permissionsForm,
    };

    // Only include role if it's changed
    if (formData.role !== selectedAdmin.role) {
      updateData.role = formData.role;
    }

    // Only include password if it's provided (not empty)
    if (formData.password) {
      updateData.password = formData.password;
    }

    updateAdminMutation.mutate({
      id: selectedAdmin.id,
      adminData: updateData,
    });
  };

  const handleDelete = (id: number) => {
    deleteAdminMutation.mutate(id);
  };

  // Reset form data
  const resetForms = () => {
    setFormData({
      username: "",
      password: "",
      fullName: "",
      email: "",
      department: "",
      phone: "",
      role: AdminRole.VIEWER,
    });
    setPermissionsForm(getRolePermissionsDefaults(AdminRole.VIEWER));
    setSelectedAdmin(null);
  };

  // Edit admin handler
  const handleEditAdmin = (admin: AdminWithoutPassword) => {
    setSelectedAdmin(admin);
    setFormData({
      username: admin.username,
      password: "", // Don't set password for edit
      fullName: admin.fullName,
      email: admin.email,
      department: admin.department || "",
      phone: admin.phone || "",
      role: admin.role as AdminRole,
    });
    
    // Handle permissions safely
    if (admin.permissions && typeof admin.permissions === 'object') {
      // Start with default permissions for the role
      const defaultPermissions = getRolePermissionsDefaults(admin.role as AdminRole);
      
      // Override with actual permissions if they exist
      const adminPermissions = admin.permissions as unknown as Record<string, boolean>;
      const mergedPermissions = { ...defaultPermissions };
      
      // Only copy keys that exist in our permissions schema
      Object.keys(defaultPermissions).forEach(key => {
        if (key in adminPermissions) {
          mergedPermissions[key as keyof AdminPermissions] = !!adminPermissions[key];
        }
      });
      
      setPermissionsForm(mergedPermissions);
    } else {
      // Fallback to defaults if no permissions are set
      setPermissionsForm(getRolePermissionsDefaults(admin.role as AdminRole));
    }
    
    setIsEditDialogOpen(true);
  };

  // Format dates
  const formatDate = (date: string | Date | null) => {
    if (!date) return "N/A";
    return format(new Date(date), "MMM dd, yyyy HH:mm");
  };

  // Check if current user can manage the given admin
  const canManageAdmin = (adminRole: string): boolean => {
    if (!user) return false;
    
    const roleValues = {
      [AdminRole.SUPER_ADMIN]: 5,
      [AdminRole.ADMIN]: 4,
      [AdminRole.MANAGER]: 3,
      [AdminRole.EDITOR]: 2,
      [AdminRole.VIEWER]: 1,
    };
    
    // Only super_admin and admin roles can manage other admins
    if (user.role !== AdminRole.SUPER_ADMIN && user.role !== AdminRole.ADMIN) {
      return false;
    }
    
    // Super admins can manage everyone
    if (user.role === AdminRole.SUPER_ADMIN) {
      return true;
    }
    
    // Admins can only manage lower roles (not super_admins)
    if (user.role === AdminRole.ADMIN) {
      return adminRole !== AdminRole.SUPER_ADMIN && roleValues[user.role] > roleValues[adminRole as AdminRole];
    }
    
    return false;
  };

  // Render permission checkboxes
  const renderPermissionCheckboxes = () => {
    const permissions: { key: keyof AdminPermissions; label: string }[] = [
      { key: "manageAdmins", label: "Manage Administrators" },
      { key: "manageUsers", label: "Manage Users" },
      { key: "manageDevices", label: "Manage Devices" },
      { key: "viewDeviceLogs", label: "View Device Logs" },
      { key: "createEvents", label: "Create Events" },
      { key: "editEvents", label: "Edit Events" },
      { key: "deleteEvents", label: "Delete Events" },
      { key: "uploadMedia", label: "Upload Media" },
      { key: "editMedia", label: "Edit Media" },
      { key: "deleteMedia", label: "Delete Media" },
      { key: "manageGroups", label: "Manage Groups" },
      { key: "managePermissions", label: "Manage Permissions" },
      { key: "manageSettings", label: "Manage Settings" },
      { key: "viewAuditLogs", label: "View Audit Logs" },
      { key: "manageApiKeys", label: "Manage API Keys" },
    ];

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
        {permissions.map(({ key, label }) => (
          <div key={key} className="flex items-center space-x-2">
            <Checkbox 
              id={key} 
              checked={permissionsForm[key]} 
              onCheckedChange={(checked) => 
                handlePermissionChange(key, checked === true)
              }
            />
            <Label htmlFor={key}>{label}</Label>
          </div>
        ))}
      </div>
    );
  };

  // Show loading state
  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  // Show error state
  if (isError) {
    return (
      <div className="container mx-auto p-4">
        <Card className="w-full bg-destructive/10">
          <CardHeader>
            <CardTitle>Error</CardTitle>
          </CardHeader>
          <CardContent>
            <p>Failed to load administrators. Please try again later.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Check if current user has permission to view this page
  const hasPermission = user?.permissions && typeof user.permissions === 'object' 
    ? (user.permissions as Record<string, boolean>)['manageAdmins'] === true
    : false;
    
  const hasManageAdminsPermission = 
    hasPermission || 
    user?.role === AdminRole.SUPER_ADMIN || 
    user?.role === AdminRole.ADMIN;

  if (!hasManageAdminsPermission) {
    return (
      <div className="container mx-auto p-4">
        <Card className="w-full bg-destructive/10">
          <CardHeader>
            <CardTitle>Access Denied</CardTitle>
          </CardHeader>
          <CardContent>
            <p>You don't have permission to manage administrators.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">Administrator Management</h1>
          <p className="text-muted-foreground">
            Manage system administrators and their permissions
          </p>
        </div>
        
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button className="flex items-center gap-2">
              <UserPlus className="h-4 w-4" />
              Add Administrator
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Add New Administrator</DialogTitle>
              <DialogDescription>
                Create a new administrator account with specific role and permissions.
              </DialogDescription>
            </DialogHeader>
            
            <form onSubmit={handleAddSubmit}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="username">Username</Label>
                  <Input
                    id="username"
                    name="username"
                    value={formData.username}
                    onChange={handleInputChange}
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    name="password"
                    type="password"
                    value={formData.password}
                    onChange={handleInputChange}
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="fullName">Full Name</Label>
                  <Input
                    id="fullName"
                    name="fullName"
                    value={formData.fullName}
                    onChange={handleInputChange}
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="department">Department</Label>
                  <Input
                    id="department"
                    name="department"
                    value={formData.department}
                    onChange={handleInputChange}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone</Label>
                  <Input
                    id="phone"
                    name="phone"
                    value={formData.phone}
                    onChange={handleInputChange}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="role">Role</Label>
                  <Select
                    value={formData.role}
                    onValueChange={handleRoleChange}
                  >
                    <SelectTrigger id="role">
                      <SelectValue placeholder="Select a role" />
                    </SelectTrigger>
                    <SelectContent>
                      {user?.role === AdminRole.SUPER_ADMIN && (
                        <SelectItem value={AdminRole.SUPER_ADMIN}>Super Admin</SelectItem>
                      )}
                      <SelectItem value={AdminRole.ADMIN}>Admin</SelectItem>
                      <SelectItem value={AdminRole.MANAGER}>Manager</SelectItem>
                      <SelectItem value={AdminRole.EDITOR}>Editor</SelectItem>
                      <SelectItem value={AdminRole.VIEWER}>Viewer</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label className="text-lg font-medium">Permissions</Label>
                <div className="border rounded-md p-4 bg-muted/50">
                  {renderPermissionCheckboxes()}
                </div>
              </div>
              
              <DialogFooter className="mt-6">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    resetForms();
                    setIsAddDialogOpen(false);
                  }}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={addAdminMutation.isPending}>
                  {addAdminMutation.isPending && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  Add Administrator
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>Administrators</CardTitle>
          <CardDescription>
            View and manage all system administrators
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Username</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Last Login</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data?.admins.map((admin) => (
                  <TableRow key={admin.id}>
                    <TableCell className="font-medium">{admin.fullName}</TableCell>
                    <TableCell>{admin.username}</TableCell>
                    <TableCell>{admin.email}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Shield className="h-4 w-4" />
                        <span>{admin.role}</span>
                      </div>
                    </TableCell>
                    <TableCell>{admin.department || "—"}</TableCell>
                    <TableCell>
                      {admin.active ? (
                        <div className="flex items-center text-green-600">
                          <CheckCircle className="h-4 w-4 mr-1" />
                          <span>Active</span>
                        </div>
                      ) : (
                        <div className="flex items-center text-red-600">
                          <XCircle className="h-4 w-4 mr-1" />
                          <span>Inactive</span>
                        </div>
                      )}
                    </TableCell>
                    <TableCell>{formatDate(admin.lastLogin)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        {canManageAdmin(admin.role) && (
                          <>
                            <Button
                              variant="outline"
                              size="icon"
                              onClick={() => handleEditAdmin(admin)}
                            >
                              <Edit2 className="h-4 w-4" />
                            </Button>
                            
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="outline" size="icon" className="text-destructive">
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Deactivate Administrator</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Are you sure you want to deactivate {admin.fullName}? This will revoke their access to the system.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => handleDelete(admin.id)}
                                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                  >
                                    Deactivate
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}

                {data?.admins.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                      No administrators found
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
        
        {data && data.pagination.totalPages > 1 && (
          <CardFooter>
            <Pagination className="w-full flex justify-center">
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious
                    href="#"
                    onClick={(e) => {
                      e.preventDefault();
                      if (page > 1) setPage(page - 1);
                    }}
                    className={page === 1 ? "pointer-events-none opacity-50" : ""}
                  />
                </PaginationItem>
                
                {Array.from({ length: data.pagination.totalPages }).map((_, index) => (
                  <PaginationItem key={index}>
                    <PaginationLink
                      href="#"
                      onClick={(e) => {
                        e.preventDefault();
                        setPage(index + 1);
                      }}
                      isActive={page === index + 1}
                    >
                      {index + 1}
                    </PaginationLink>
                  </PaginationItem>
                ))}
                
                <PaginationItem>
                  <PaginationNext
                    href="#"
                    onClick={(e) => {
                      e.preventDefault();
                      if (page < data.pagination.totalPages) setPage(page + 1);
                    }}
                    className={
                      page === data.pagination.totalPages
                        ? "pointer-events-none opacity-50"
                        : ""
                    }
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          </CardFooter>
        )}
      </Card>
      
      {/* Edit Admin Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Administrator</DialogTitle>
            <DialogDescription>
              Update administrator information and permissions.
            </DialogDescription>
          </DialogHeader>
          
          <form onSubmit={handleEditSubmit}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="username">Username</Label>
                <Input
                  id="username"
                  name="username"
                  value={formData.username}
                  disabled
                  className="bg-muted"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="password">
                  Password <span className="text-muted-foreground">(Leave empty to keep current)</span>
                </Label>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  value={formData.password}
                  onChange={handleInputChange}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="fullName">Full Name</Label>
                <Input
                  id="fullName"
                  name="fullName"
                  value={formData.fullName}
                  onChange={handleInputChange}
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="department">Department</Label>
                <Input
                  id="department"
                  name="department"
                  value={formData.department}
                  onChange={handleInputChange}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  name="phone"
                  value={formData.phone}
                  onChange={handleInputChange}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="role">Role</Label>
                <Select
                  value={formData.role}
                  onValueChange={handleRoleChange}
                >
                  <SelectTrigger id="role">
                    <SelectValue placeholder="Select a role" />
                  </SelectTrigger>
                  <SelectContent>
                    {user?.role === AdminRole.SUPER_ADMIN && (
                      <SelectItem value={AdminRole.SUPER_ADMIN}>Super Admin</SelectItem>
                    )}
                    <SelectItem value={AdminRole.ADMIN}>Admin</SelectItem>
                    <SelectItem value={AdminRole.MANAGER}>Manager</SelectItem>
                    <SelectItem value={AdminRole.EDITOR}>Editor</SelectItem>
                    <SelectItem value={AdminRole.VIEWER}>Viewer</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="space-y-2">
              <Label className="text-lg font-medium">Permissions</Label>
              <div className="border rounded-md p-4 bg-muted/50">
                {renderPermissionCheckboxes()}
              </div>
            </div>
            
            <DialogFooter className="mt-6">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  resetForms();
                  setIsEditDialogOpen(false);
                }}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={updateAdminMutation.isPending}>
                {updateAdminMutation.isPending && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Save Changes
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}