import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Clipboard } from "lucide-react";

export default function ApiKeyDisplay() {
  const { toast } = useToast();
  const [isCreateKeyOpen, setIsCreateKeyOpen] = useState(false);
  const [keyName, setKeyName] = useState("");
  const [newKeyData, setNewKeyData] = useState<{ id: number; key: string } | null>(null);

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
      setIsCreateKeyOpen(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to create API key",
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

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg font-semibold">API Access</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-24 w-full rounded-md" />
          <Skeleton className="h-12 w-full rounded-md" />
          <Skeleton className="h-24 w-full rounded-md" />
        </CardContent>
      </Card>
    );
  }

  const primaryApiKey = apiKeys && apiKeys.length > 0 ? apiKeys[0] : null;

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold">API Access</CardTitle>
          <Button 
            variant="outline" 
            size="sm" 
            className="text-xs text-primary border-primary"
            onClick={() => window.location.href = "/settings"}
          >
            Manage Keys
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {primaryApiKey ? (
          <div className="p-3 border border-neutral-200 rounded-md bg-neutral-50">
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm font-medium text-neutral-800">{primaryApiKey.name}</div>
              <span className="px-2 py-0.5 text-xs rounded-full bg-success/10 text-success">Active</span>
            </div>
            <div className="bg-white border border-neutral-200 rounded p-2 flex items-center">
              <code className="text-xs font-mono text-neutral-500 truncate flex-1">
                {primaryApiKey.key}
              </code>
              <button 
                className="ml-2 text-neutral-400 hover:text-neutral-700"
                onClick={() => copyToClipboard(primaryApiKey.key)}
              >
                <Clipboard className="h-4 w-4" />
              </button>
            </div>
            <div className="mt-2 text-xs text-neutral-500 flex justify-between">
              <span>Created: {new Date(primaryApiKey.createdAt).toLocaleDateString()}</span>
              <span>
                Last used: {primaryApiKey.lastUsed 
                  ? new Date(primaryApiKey.lastUsed).toLocaleDateString() 
                  : "Never"}
              </span>
            </div>
          </div>
        ) : (
          <div className="p-3 border border-neutral-200 rounded-md">
            <div className="text-sm font-medium text-neutral-800 mb-2">No API Keys</div>
            <p className="text-xs text-neutral-500">
              You don't have any API keys yet. Create one to integrate with external applications.
            </p>
            <Button 
              className="mt-3 w-full text-xs"
              onClick={() => setIsCreateKeyOpen(true)}
            >
              Create API Key
            </Button>
          </div>
        )}
        
        <div className="p-3 border border-neutral-200 rounded-md">
          <div className="flex items-center justify-between mb-2">
            <div className="text-sm font-medium text-neutral-800">Integration Guide</div>
            <a href="/settings" className="text-xs text-primary">View Docs</a>
          </div>
          <p className="text-xs text-neutral-500">
            Connect your applications using our REST API with JWT authentication. 
            Support for device management and user provisioning.
          </p>
        </div>
        
        <div className="p-3 border border-neutral-200 rounded-md">
          <div className="text-sm font-medium text-neutral-800 mb-2">Example Request</div>
          <div className="bg-neutral-800 text-neutral-200 p-2 rounded text-xs font-mono overflow-x-auto">
            <pre>curl -X GET \
  https://api.secureaccess.com/v1/devices \
  -H 'Authorization: Bearer ${`{JWT_TOKEN}`}' \
  -H 'Content-Type: application/json'</pre>
          </div>
        </div>
      </CardContent>

      {/* Create API Key Dialog */}
      <Dialog open={isCreateKeyOpen} onOpenChange={setIsCreateKeyOpen}>
        <DialogContent className="sm:max-w-md">
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
            <Button variant="outline" onClick={() => setIsCreateKeyOpen(false)}>
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

      {/* New Key Display Dialog */}
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
    </Card>
  );
}
