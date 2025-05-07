import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import Sidebar from "@/components/layout/sidebar";
import Header from "@/components/layout/header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Clipboard, Key, Trash2 } from "lucide-react";
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState("api-keys");
  const [isCreateKeyDialogOpen, setIsCreateKeyDialogOpen] = useState(false);
  const [keyName, setKeyName] = useState("");
  const [newKeyData, setNewKeyData] = useState<{ id: number; key: string } | null>(null);
  const { toast } = useToast();

  const { data: apiKeys, isLoading } = useQuery({
    queryKey: ["/api/api-keys"],
  });

  const createApiKeyMutation = useMutation({
    mutationFn: async (name: string) => {
      const res = await apiRequest("POST", "/api/api-keys", { name });
      return await res.json();
    },
    onSuccess: (data) => {
      setNewKeyData({ id: data.id, key: data.key });
      queryClient.invalidateQueries({ queryKey: ["/api/api-keys"] });
      setKeyName("");
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to create API key",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteApiKeyMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/api-keys/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/api-keys"] });
      toast({
        title: "API key deleted",
        description: "The API key has been successfully deleted.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to delete API key",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleCreateKey = () => {
    if (!keyName.trim()) {
      toast({
        title: "Name required",
        description: "Please provide a name for the API key.",
        variant: "destructive",
      });
      return;
    }
    
    createApiKeyMutation.mutate(keyName);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied to clipboard",
      description: "API key has been copied to your clipboard.",
    });
  };

  return (
    <div className="flex h-screen overflow-hidden bg-neutral-50">
      <Sidebar />

      <main className="flex-1 flex flex-col overflow-hidden">
        <Header />

        <div className="flex-1 overflow-y-auto p-4 md:p-6">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold text-neutral-800">System Settings</h1>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="mb-8">
              <TabsTrigger value="api-keys">API Keys</TabsTrigger>
              <TabsTrigger value="system">System Configuration</TabsTrigger>
              <TabsTrigger value="backup">Backup & Restore</TabsTrigger>
            </TabsList>
            
            <TabsContent value="api-keys">
              <Card className="mb-6">
                <CardHeader>
                  <div className="flex justify-between items-center">
                    <div>
                      <CardTitle>API Keys</CardTitle>
                      <CardDescription>Manage API keys for external integrations</CardDescription>
                    </div>
                    <Dialog open={isCreateKeyDialogOpen} onOpenChange={setIsCreateKeyDialogOpen}>
                      <DialogTrigger asChild>
                        <Button>
                          <Key className="h-4 w-4 mr-2" />
                          Create API Key
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Create New API Key</DialogTitle>
                          <DialogDescription>
                            This key will have full access to the API. Keep it secure.
                          </DialogDescription>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                          <div className="grid gap-2">
                            <Label htmlFor="key-name">Key Name</Label>
                            <Input
                              id="key-name"
                              placeholder="e.g., Production Integration"
                              value={keyName}
                              onChange={(e) => setKeyName(e.target.value)}
                            />
                          </div>
                        </div>
                        <DialogFooter>
                          <Button variant="outline" onClick={() => setIsCreateKeyDialogOpen(false)}>
                            Cancel
                          </Button>
                          <Button 
                            onClick={handleCreateKey} 
                            disabled={createApiKeyMutation.isPending}
                          >
                            {createApiKeyMutation.isPending ? "Creating..." : "Create Key"}
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>

                    {/* Show the newly created API key */}
                    {newKeyData && (
                      <Dialog 
                        open={!!newKeyData} 
                        onOpenChange={(open) => !open && setNewKeyData(null)}
                      >
                        <DialogContent className="sm:max-w-md">
                          <DialogHeader>
                            <DialogTitle>API Key Created</DialogTitle>
                            <DialogDescription>
                              This is your API key. Please save it now as you won't be able to see it again.
                            </DialogDescription>
                          </DialogHeader>
                          <div className="p-4 bg-neutral-50 rounded-md border border-neutral-200 mt-4">
                            <div className="font-mono text-sm break-all">{newKeyData.key}</div>
                          </div>
                          <DialogFooter className="sm:justify-between mt-4">
                            <Button 
                              variant="secondary" 
                              onClick={() => copyToClipboard(newKeyData.key)}
                            >
                              <Clipboard className="h-4 w-4 mr-2" />
                              Copy to Clipboard
                            </Button>
                            <Button 
                              onClick={() => setNewKeyData(null)}
                            >
                              I've Saved My Key
                            </Button>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  {isLoading ? (
                    <div className="text-center py-8 text-muted-foreground">
                      Loading API keys...
                    </div>
                  ) : apiKeys?.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      No API keys found. Create your first key to get started.
                    </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Name</TableHead>
                          <TableHead>Key</TableHead>
                          <TableHead>Created</TableHead>
                          <TableHead>Last Used</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {apiKeys?.map((apiKey) => (
                          <TableRow key={apiKey.id}>
                            <TableCell className="font-medium">{apiKey.name}</TableCell>
                            <TableCell>
                              <div className="font-mono bg-neutral-50 p-1 rounded text-xs">
                                {apiKey.key}
                              </div>
                            </TableCell>
                            <TableCell>
                              {new Date(apiKey.createdAt).toLocaleDateString()}
                            </TableCell>
                            <TableCell>
                              {apiKey.lastUsed 
                                ? new Date(apiKey.lastUsed).toLocaleDateString() 
                                : "Never used"}
                            </TableCell>
                            <TableCell>
                              {apiKey.active ? (
                                <Badge variant="outline" className="bg-success/10 text-success border-success/20">
                                  Active
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="bg-error/10 text-error border-error/20">
                                  Inactive
                                </Badge>
                              )}
                            </TableCell>
                            <TableCell className="text-right">
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button variant="ghost" size="sm" className="text-error">
                                    <Trash2 className="h-4 w-4" />
                                    <span className="sr-only">Delete API key</span>
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Delete API Key</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Are you sure you want to delete this API key? Any applications using this key will no longer be able to access the API.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction 
                                      onClick={() => deleteApiKeyMutation.mutate(apiKey.id)}
                                      className="bg-error hover:bg-error/90"
                                    >
                                      Delete
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>API Documentation</CardTitle>
                  <CardDescription>
                    Examples for using the API with your generated keys
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-lg font-semibold mb-2">Authentication</h3>
                      <p className="text-sm text-muted-foreground mb-2">
                        Use your API key in the Authorization header:
                      </p>
                      <div className="bg-neutral-900 text-neutral-100 p-3 rounded-md">
                        <pre className="text-sm font-mono whitespace-pre-wrap overflow-x-auto">
{`Authorization: Bearer YOUR_JWT_TOKEN

# To get a JWT token:
curl -X POST \\
  https://your-domain.com/api/login \\
  -H 'Content-Type: application/json' \\
  -d '{
    "username": "your_username",
    "password": "your_password"
  }'`}
                        </pre>
                      </div>
                    </div>

                    <Separator />

                    <div>
                      <h3 className="text-lg font-semibold mb-2">List Devices</h3>
                      <p className="text-sm text-muted-foreground mb-2">
                        Get a list of all registered devices:
                      </p>
                      <div className="bg-neutral-900 text-neutral-100 p-3 rounded-md">
                        <pre className="text-sm font-mono whitespace-pre-wrap overflow-x-auto">
{`curl -X GET \\
  https://your-domain.com/api/devices \\
  -H 'Authorization: Bearer YOUR_JWT_TOKEN'`}
                        </pre>
                      </div>
                    </div>

                    <Separator />

                    <div>
                      <h3 className="text-lg font-semibold mb-2">Register New User</h3>
                      <p className="text-sm text-muted-foreground mb-2">
                        Register a new user in the system:
                      </p>
                      <div className="bg-neutral-900 text-neutral-100 p-3 rounded-md">
                        <pre className="text-sm font-mono whitespace-pre-wrap overflow-x-auto">
{`curl -X POST \\
  https://your-domain.com/api/users \\
  -H 'Authorization: Bearer YOUR_JWT_TOKEN' \\
  -H 'Content-Type: application/json' \\
  -d '{
    "employeeId": "EMP001",
    "firstName": "John",
    "lastName": "Doe",
    "email": "john.doe@example.com",
    "department": "IT",
    "position": "Developer"
  }'`}
                        </pre>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="system">
              <Card>
                <CardHeader>
                  <CardTitle>System Configuration</CardTitle>
                  <CardDescription>Configure global system settings</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    <div className="grid gap-2">
                      <Label htmlFor="system-name">System Name</Label>
                      <Input id="system-name" defaultValue="SecureAccess Biometric System" />
                    </div>
                    
                    <Separator />
                    
                    <div className="grid gap-2">
                      <Label htmlFor="session-timeout">Session Timeout (minutes)</Label>
                      <Input id="session-timeout" type="number" defaultValue="45" />
                    </div>
                    
                    <Separator />
                    
                    <div className="grid gap-2">
                      <Label htmlFor="log-retention">Log Retention Period (days)</Label>
                      <Input id="log-retention" type="number" defaultValue="90" />
                    </div>
                    
                    <Button className="mt-4">Save Changes</Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="backup">
              <Card>
                <CardHeader>
                  <CardTitle>Backup & Restore</CardTitle>
                  <CardDescription>Manage system backups and restoration</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-lg font-semibold mb-2">Create Backup</h3>
                      <p className="text-sm text-muted-foreground mb-4">
                        Create a backup of all system data, including users, devices, and configuration.
                      </p>
                      <Button>Create Backup</Button>
                    </div>
                    
                    <Separator />
                    
                    <div>
                      <h3 className="text-lg font-semibold mb-2">Restore System</h3>
                      <p className="text-sm text-muted-foreground mb-4">
                        Restore the system from a previous backup file.
                      </p>
                      <div className="flex items-center gap-4">
                        <Input id="backup-file" type="file" />
                        <Button variant="outline">Restore</Button>
                      </div>
                    </div>
                    
                    <Separator />
                    
                    <div>
                      <h3 className="text-lg font-semibold mb-2">Scheduled Backups</h3>
                      <p className="text-sm text-muted-foreground mb-4">
                        Configure automatic scheduled backups.
                      </p>
                      <div className="space-y-4">
                        <div className="flex items-center space-x-2">
                          <input type="checkbox" id="enable-scheduled" className="accent-primary" />
                          <Label htmlFor="enable-scheduled">Enable scheduled backups</Label>
                        </div>
                        <div className="grid gap-2">
                          <Label htmlFor="backup-frequency">Frequency</Label>
                          <select id="backup-frequency" className="h-10 w-full rounded-md border border-input bg-background px-3 py-2">
                            <option>Daily</option>
                            <option>Weekly</option>
                            <option>Monthly</option>
                          </select>
                        </div>
                        <Button>Save Schedule</Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  );
}
