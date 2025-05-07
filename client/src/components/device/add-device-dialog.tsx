import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { z } from "zod";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { deviceInsertSchema } from "@shared/schema";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// Create a form schema based on the device schema
const formSchema = z.object({
  name: z.string().min(2, "Device name must be at least 2 characters"),
  type: z.string().min(2, "Device type is required"),
  ip: z.string().regex(/^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$/, "Must be a valid IP address"),
  port: z.coerce.number().int().positive().default(80),
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
  location: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface AddDeviceDialogProps {
  open: boolean;
  onClose: () => void;
  onDeviceAdded?: () => void;
}

export default function AddDeviceDialog({
  open,
  onClose,
  onDeviceAdded,
}: AddDeviceDialogProps) {
  const { toast } = useToast();
  
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      type: "",
      ip: "",
      port: 80,
      username: "",
      password: "",
      location: "",
    },
  });

  const deviceTypes = [
    "Hikvision DS-2CD2385G1 IP Camera",
    "Hikvision DS-K1T501SF Access Control",
    "Hikvision DS-2CD2047G1 IP Camera",
    "Hikvision DS-K1T804MF Biometric Scanner",
    "Hikvision DS-K1A802 Fingerprint Access Control",
    "Hikvision DS-2DF8236I PTZ Camera",
    "Other Hikvision Device",
  ];

  const addDeviceMutation = useMutation({
    mutationFn: async (data: FormValues) => {
      const response = await apiRequest("POST", "/api/devices", data);
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "Device added successfully",
        description: "The device has been registered and connection will be tested.",
      });
      
      form.reset();
      queryClient.invalidateQueries({ queryKey: ["/api/devices"] });
      
      if (onDeviceAdded) {
        onDeviceAdded();
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Error adding device",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: FormValues) => {
    addDeviceMutation.mutate(data);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Add New Device</DialogTitle>
          <DialogDescription>
            Enter the details of the Hikvision device you want to connect.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Device Name</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. Main Entrance Camera" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Device Type</FormLabel>
                  <Select 
                    onValueChange={field.onChange} 
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select device type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {deviceTypes.map((type) => (
                        <SelectItem key={type} value={type}>
                          {type}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="ip"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>IP Address</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. 192.168.1.100" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="port"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Port</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        placeholder="80" 
                        {...field}
                        onChange={(e) => {
                          const value = e.target.value;
                          field.onChange(value === "" ? 80 : parseInt(value, 10));
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="username"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Username</FormLabel>
                    <FormControl>
                      <Input placeholder="Device username" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Password</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder="Device password" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            <FormField
              control={form.control}
              name="location"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Location (Optional)</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. Main Building, 1st Floor" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <DialogFooter className="mt-6">
              <Button 
                type="button" 
                variant="outline" 
                onClick={onClose}
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={addDeviceMutation.isPending}
              >
                {addDeviceMutation.isPending ? "Adding..." : "Add Device"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
