import React, { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { 
  Tabs, 
  TabsContent, 
  TabsList, 
  TabsTrigger 
} from "@/components/ui/tabs";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger,
  DialogClose 
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { 
  Form, 
  FormControl, 
  FormDescription, 
  FormField, 
  FormItem, 
  FormLabel, 
  FormMessage 
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { 
  Popover, 
  PopoverContent, 
  PopoverTrigger 
} from "@/components/ui/popover";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { format } from "date-fns";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { 
  CalendarIcon, 
  Upload, 
  ImageIcon, 
  FileIcon, 
  VideoIcon, 
  DownloadIcon,
  ShareIcon,
  PlusIcon,
  Loader2,
  EyeIcon,
  Calendar as CalendarIcon2,
  Users,
  Tags,
  Building2,
  Lock,
  Unlock,
  LockIcon
} from "lucide-react";

// Form schemas
const eventFormSchema = z.object({
  name: z.string().min(2, "Event name must be at least 2 characters"),
  description: z.string().optional(),
  eventDate: z.date({
    required_error: "Event date is required",
  }),
  department: z.string().optional(),
  tags: z.string().optional(),
  isPublic: z.boolean().default(false),
});

const uploadFormSchema = z.object({
  files: z.instanceof(FileList).refine(files => files.length > 0, "Please select at least one file"),
  eventId: z.string().optional(),
  visibility: z.enum(["public", "private", "group"]).default("private"),
  watermarkEnabled: z.boolean().default(false),
  password: z.string().optional(),
  expiryDate: z.date().optional(),
});

// Main component
export default function MediaPage() {
  const { user, isLoading: authLoading } = useAuth();
  const [activeTab, setActiveTab] = useState("browse");
  const [selectedEvent, setSelectedEvent] = useState<any>(null);
  const [selectedFile, setSelectedFile] = useState<any>(null);
  const [createEventDialogOpen, setCreateEventDialogOpen] = useState(false);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [fileDetailsDialogOpen, setFileDetailsDialogOpen] = useState(false);
  
  // Fetch events
  const { 
    data: eventsData,
    isLoading: eventsLoading,
    error: eventsError,
  } = useQuery({ 
    queryKey: ['/api/media/events'],
    enabled: !authLoading && !!user,
  });

  // Check if user is admin or editor
  const isAdminOrEditor = user?.role === 'admin' || user?.role === 'editor';
  
  return (
    <div className="container mx-auto p-6">
      <header className="mb-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Media Repository</h1>
            <p className="text-muted-foreground">
              Browse, upload, and manage media files
            </p>
          </div>
          
          {isAdminOrEditor && (
            <div className="flex space-x-2">
              <Button 
                variant="outline" 
                onClick={() => setUploadDialogOpen(true)}
              >
                <Upload className="mr-2 h-4 w-4" /> Upload Files
              </Button>
              <Button 
                onClick={() => setCreateEventDialogOpen(true)}
              >
                <PlusIcon className="mr-2 h-4 w-4" /> New Event
              </Button>
            </div>
          )}
        </div>
      </header>
      
      <Tabs 
        defaultValue="browse" 
        onValueChange={setActiveTab}
        className="space-y-4"
      >
        <TabsList className="grid w-full max-w-md grid-cols-3">
          <TabsTrigger value="browse">Browse Events</TabsTrigger>
          <TabsTrigger value="gallery">Gallery</TabsTrigger>
          <TabsTrigger value="management">Management</TabsTrigger>
        </TabsList>
        
        <TabsContent value="browse" className="space-y-4">
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {eventsLoading ? (
              <div className="col-span-full flex justify-center p-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : eventsError ? (
              <div className="col-span-full text-center p-12">
                <p className="text-destructive font-medium">Failed to load events</p>
                <p className="text-muted-foreground text-sm">Please try again later</p>
              </div>
            ) : eventsData?.events?.length === 0 ? (
              <div className="col-span-full text-center p-12 border rounded-lg">
                <h3 className="text-lg font-medium mb-2">No events found</h3>
                <p className="text-muted-foreground mb-6">
                  There are no media events to display.
                </p>
                {isAdminOrEditor && (
                  <Button onClick={() => setCreateEventDialogOpen(true)}>
                    <PlusIcon className="mr-2 h-4 w-4" /> Create your first event
                  </Button>
                )}
              </div>
            ) : (
              eventsData?.events?.map((event: any) => (
                <EventCard 
                  key={event.id} 
                  event={event}
                  onClick={() => setSelectedEvent(event)}
                />
              ))
            )}
          </div>
          
          {selectedEvent && (
            <EventDetailsDialog 
              event={selectedEvent}
              open={!!selectedEvent} 
              onOpenChange={(open) => !open && setSelectedEvent(null)}
              onFileSelect={setSelectedFile}
              onUpload={() => setUploadDialogOpen(true)}
            />
          )}
        </TabsContent>
        
        <TabsContent value="gallery" className="space-y-4">
          <GalleryView 
            onFileSelect={setSelectedFile} 
          />
        </TabsContent>
        
        <TabsContent value="management" className="space-y-4">
          {isAdminOrEditor ? (
            <ManagementView />
          ) : (
            <div className="text-center p-12 border rounded-lg">
              <LockIcon className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">Access Restricted</h3>
              <p className="text-muted-foreground">
                You need admin or editor permissions to access this section.
              </p>
            </div>
          )}
        </TabsContent>
      </Tabs>
      
      {/* Create Event Dialog */}
      <CreateEventDialog 
        open={createEventDialogOpen}
        onOpenChange={setCreateEventDialogOpen}
      />
      
      {/* Upload Files Dialog */}
      <UploadFilesDialog 
        open={uploadDialogOpen}
        onOpenChange={setUploadDialogOpen}
        selectedEvent={selectedEvent}
      />
      
      {/* File Details Dialog */}
      {selectedFile && (
        <FileDetailsDialog 
          file={selectedFile}
          open={!!selectedFile} 
          onOpenChange={(open) => !open && setSelectedFile(null)}
        />
      )}
    </div>
  );
}

// Event Card Component
function EventCard({ event, onClick }: { event: any; onClick: () => void }) {
  return (
    <Card className="overflow-hidden hover:shadow-md transition-shadow cursor-pointer" onClick={onClick}>
      <CardHeader className="pb-2">
        <div className="flex justify-between items-start">
          <CardTitle className="line-clamp-1">{event.name}</CardTitle>
          {event.isPublic ? (
            <Badge variant="outline">Public</Badge>
          ) : (
            <Badge variant="secondary">Private</Badge>
          )}
        </div>
        <CardDescription>
          {format(new Date(event.eventDate), 'MMMM d, yyyy')}
        </CardDescription>
      </CardHeader>
      <CardContent className="pb-2">
        <p className="text-sm text-muted-foreground line-clamp-2">
          {event.description || 'No description provided'}
        </p>
      </CardContent>
      <CardFooter className="pt-0 flex justify-between text-xs text-muted-foreground">
        <div className="flex items-center">
          <Building2 className="h-3 w-3 mr-1" />
          {event.department || 'General'}
        </div>
        <div className="flex items-center">
          <EyeIcon className="h-3 w-3 mr-1" />
          {event.fileCount || 0} files
        </div>
      </CardFooter>
    </Card>
  );
}

// Event Details Dialog Component
function EventDetailsDialog({ 
  event, 
  open, 
  onOpenChange,
  onFileSelect,
  onUpload,
}: { 
  event: any; 
  open: boolean; 
  onOpenChange: (open: boolean) => void;
  onFileSelect: (file: any) => void;
  onUpload: () => void;
}) {
  const { user } = useAuth();
  const isAdminOrEditor = user?.role === 'admin' || user?.role === 'editor';
  
  // Fetch event details with files
  const { data, isLoading, error } = useQuery({ 
    queryKey: ['/api/media/events', event.id],
    enabled: open,
  });
  
  const eventDetails = data || event;
  const files = eventDetails?.files || [];
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>{eventDetails.name}</span>
            {eventDetails.isPublic ? (
              <Badge variant="outline" className="ml-2">Public</Badge>
            ) : (
              <Badge variant="secondary" className="ml-2">Private</Badge>
            )}
          </DialogTitle>
          <DialogDescription className="flex items-center space-x-4">
            <span className="flex items-center">
              <CalendarIcon2 className="h-4 w-4 mr-1" />
              {format(new Date(eventDetails.eventDate), 'MMMM d, yyyy')}
            </span>
            {eventDetails.department && (
              <span className="flex items-center">
                <Building2 className="h-4 w-4 mr-1" />
                {eventDetails.department}
              </span>
            )}
            {eventDetails.tags && (
              <span className="flex items-center">
                <Tags className="h-4 w-4 mr-1" />
                {Array.isArray(eventDetails.tags) 
                  ? eventDetails.tags.join(', ') 
                  : eventDetails.tags}
              </span>
            )}
          </DialogDescription>
        </DialogHeader>
        
        <div className="my-4">
          <h4 className="text-sm font-medium mb-1">Description</h4>
          <p className="text-sm text-muted-foreground">
            {eventDetails.description || 'No description provided'}
          </p>
        </div>
        
        <div>
          <div className="flex justify-between items-center mb-4">
            <h4 className="text-sm font-medium">Files ({files.length})</h4>
            {isAdminOrEditor && (
              <Button variant="outline" size="sm" onClick={onUpload}>
                <Upload className="h-4 w-4 mr-1" /> Upload Files
              </Button>
            )}
          </div>
          
          {isLoading ? (
            <div className="flex justify-center p-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : error ? (
            <div className="text-center p-6 border rounded-lg">
              <p className="text-destructive font-medium">Failed to load files</p>
              <p className="text-muted-foreground text-sm">Please try again later</p>
            </div>
          ) : files.length === 0 ? (
            <div className="text-center p-6 border rounded-lg">
              <p className="text-muted-foreground">No files have been uploaded yet</p>
              {isAdminOrEditor && (
                <Button variant="link" onClick={onUpload}>
                  Upload your first file
                </Button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {files.map((file: any) => (
                <FileCard 
                  key={file.id} 
                  file={file} 
                  onClick={() => onFileSelect(file)}
                />
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// File Card Component
function FileCard({ file, onClick }: { file: any; onClick: () => void }) {
  const getFileIcon = () => {
    if (file.mimeType?.startsWith('image/')) {
      return <ImageIcon className="h-12 w-12 text-primary" />;
    } else if (file.mimeType?.startsWith('video/')) {
      return <VideoIcon className="h-12 w-12 text-primary" />;
    } else {
      return <FileIcon className="h-12 w-12 text-primary" />;
    }
  };
  
  return (
    <Card 
      className="overflow-hidden hover:shadow-md transition-shadow cursor-pointer flex flex-col" 
      onClick={onClick}
    >
      <div className="flex-1 flex items-center justify-center p-4 bg-muted/30">
        {file.mimeType?.startsWith('image/') && file.url ? (
          <img 
            src={file.url} 
            alt={file.originalFilename} 
            className="max-h-24 object-contain"
          />
        ) : (
          getFileIcon()
        )}
      </div>
      <CardFooter className="flex-col items-start p-2">
        <p className="text-xs font-medium line-clamp-1 w-full">{file.originalFilename}</p>
        <div className="flex justify-between w-full text-xs text-muted-foreground mt-1">
          <span>{formatFileSize(file.size)}</span>
          <Badge 
            variant={file.visibility === 'public' ? 'outline' : 'secondary'} 
            className="text-[10px] h-4"
          >
            {file.visibility}
          </Badge>
        </div>
      </CardFooter>
    </Card>
  );
}

// File Details Dialog Component
function FileDetailsDialog({ 
  file, 
  open, 
  onOpenChange,
}: { 
  file: any; 
  open: boolean; 
  onOpenChange: (open: boolean) => void;
}) {
  const { user } = useAuth();
  const isAdminOrEditor = user?.role === 'admin' || user?.role === 'editor';
  
  // Fetch file details
  const { data, isLoading } = useQuery({ 
    queryKey: ['/api/media/files', file.id],
    enabled: open,
  });
  
  const fileDetails = data || file;
  
  // Generate share link
  const shareLinkMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest('POST', '/api/media/share-links', data);
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Share link created",
        description: "The share link has been generated successfully."
      });
      // Refresh file details
      queryClient.invalidateQueries({ queryKey: ['/api/media/files', file.id] });
    },
    onError: () => {
      toast({
        title: "Failed to create share link",
        description: "An error occurred while generating the share link.",
        variant: "destructive"
      });
    }
  });
  
  const handleCreateShareLink = () => {
    shareLinkMutation.mutate({
      fileId: fileDetails.id,
      maxViews: 10, // Default max views
    });
  };
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>File Details</DialogTitle>
          <DialogDescription>
            View and manage file details
          </DialogDescription>
        </DialogHeader>
        
        {isLoading ? (
          <div className="flex justify-center p-6">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <>
            <div className="grid gap-4 md:grid-cols-5">
              <div className="md:col-span-2 flex items-center justify-center p-4 bg-muted/30 rounded-lg">
                {fileDetails.mimeType?.startsWith('image/') && fileDetails.url ? (
                  <img 
                    src={fileDetails.url} 
                    alt={fileDetails.originalFilename} 
                    className="max-h-48 max-w-full object-contain"
                  />
                ) : fileDetails.mimeType?.startsWith('video/') && fileDetails.url ? (
                  <video 
                    src={fileDetails.url} 
                    controls 
                    className="max-h-48 max-w-full"
                  >
                    Your browser does not support the video tag.
                  </video>
                ) : (
                  <FileIcon className="h-24 w-24 text-primary" />
                )}
              </div>
              
              <div className="md:col-span-3 space-y-3">
                <div>
                  <h4 className="text-sm font-medium">Filename</h4>
                  <p className="text-sm break-all">{fileDetails.originalFilename}</p>
                </div>
                
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <h4 className="text-sm font-medium">Type</h4>
                    <p className="text-sm text-muted-foreground">{fileDetails.mimeType}</p>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium">Size</h4>
                    <p className="text-sm text-muted-foreground">{formatFileSize(fileDetails.size)}</p>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium">Visibility</h4>
                    <p className="text-sm">
                      <Badge 
                        variant={fileDetails.visibility === 'public' ? 'outline' : 'secondary'}
                      >
                        {fileDetails.visibility}
                      </Badge>
                    </p>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium">Uploaded</h4>
                    <p className="text-sm text-muted-foreground">
                      {format(new Date(fileDetails.uploadedAt), 'MMM d, yyyy')}
                    </p>
                  </div>
                </div>
                
                <div>
                  <h4 className="text-sm font-medium">Event</h4>
                  <p className="text-sm text-muted-foreground">
                    {fileDetails.event?.name || 'Not assigned to an event'}
                  </p>
                </div>
                
                {fileDetails.password && (
                  <div>
                    <h4 className="text-sm font-medium">Password Protected</h4>
                    <p className="text-sm text-muted-foreground">
                      <Lock className="h-3 w-3 inline mr-1" />
                      This file requires a password to access
                    </p>
                  </div>
                )}
                
                {fileDetails.expiryDate && (
                  <div>
                    <h4 className="text-sm font-medium">Expires</h4>
                    <p className="text-sm text-muted-foreground">
                      {format(new Date(fileDetails.expiryDate), 'MMM d, yyyy')}
                    </p>
                  </div>
                )}
              </div>
            </div>
            
            <div className="space-y-2 mt-2">
              <h4 className="text-sm font-medium">Statistics</h4>
              <div className="grid grid-cols-2 gap-2">
                <div className="border rounded p-2">
                  <p className="text-sm text-muted-foreground">Views</p>
                  <p className="text-lg font-medium">{fileDetails.views || 0}</p>
                </div>
                <div className="border rounded p-2">
                  <p className="text-sm text-muted-foreground">Downloads</p>
                  <p className="text-lg font-medium">{fileDetails.downloads || 0}</p>
                </div>
              </div>
            </div>
            
            {fileDetails.shareLinks?.length > 0 && (
              <div className="space-y-2 mt-2">
                <h4 className="text-sm font-medium">Share Links</h4>
                <div className="space-y-2">
                  {fileDetails.shareLinks.map((link: any) => (
                    <div key={link.id} className="border rounded p-2">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="text-sm break-all">{link.shareUrl}</p>
                          <div className="flex space-x-3 text-xs text-muted-foreground mt-1">
                            <span>Views: {link.views}/{link.maxViews || '∞'}</span>
                            {link.expiryDate && (
                              <span>Expires: {format(new Date(link.expiryDate), 'MMM d, yyyy')}</span>
                            )}
                            {link.password && <span>Password protected</span>}
                          </div>
                        </div>
                        <Button size="icon" variant="ghost" onClick={() => {
                          navigator.clipboard.writeText(link.shareUrl);
                          toast({
                            title: "Link copied",
                            description: "The share link has been copied to your clipboard."
                          });
                        }}>
                          <ShareIcon className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            <DialogFooter className="flex flex-col sm:flex-row gap-2">
              <a 
                href={`/api/media/files/${fileDetails.id}/download`} 
                target="_blank"
                rel="noopener noreferrer"
              >
                <Button variant="secondary">
                  <DownloadIcon className="mr-2 h-4 w-4" /> Download
                </Button>
              </a>
              
              {isAdminOrEditor && (
                <Button 
                  disabled={shareLinkMutation.isPending}
                  onClick={handleCreateShareLink}
                >
                  {shareLinkMutation.isPending ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <ShareIcon className="mr-2 h-4 w-4" />
                  )}
                  Create Share Link
                </Button>
              )}
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

// Create Event Dialog Component
function CreateEventDialog({ 
  open, 
  onOpenChange 
}: { 
  open: boolean; 
  onOpenChange: (open: boolean) => void;
}) {
  const form = useForm<z.infer<typeof eventFormSchema>>({
    resolver: zodResolver(eventFormSchema),
    defaultValues: {
      name: "",
      description: "",
      isPublic: false,
    },
  });
  
  const createEventMutation = useMutation({
    mutationFn: async (data: z.infer<typeof eventFormSchema>) => {
      // Convert tags from comma-separated string to array
      const formattedData = {
        ...data,
        tags: data.tags ? data.tags.split(',').map(tag => tag.trim()) : undefined,
      };
      
      const res = await apiRequest('POST', '/api/media/events', formattedData);
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Event created",
        description: "Your event has been created successfully."
      });
      form.reset();
      onOpenChange(false);
      // Refresh events list
      queryClient.invalidateQueries({ queryKey: ['/api/media/events'] });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to create event",
        description: error.message || "An error occurred while creating the event.",
        variant: "destructive"
      });
    }
  });
  
  const onSubmit = (data: z.infer<typeof eventFormSchema>) => {
    createEventMutation.mutate(data);
  };
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[525px]">
        <DialogHeader>
          <DialogTitle>Create New Event</DialogTitle>
          <DialogDescription>
            Create a new event to organize your media files. Fill in the details below.
          </DialogDescription>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Event Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Company Retreat 2023" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Brief description of the event..."
                      className="resize-none"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="eventDate"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Event Date</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant={"outline"}
                            className={`pl-3 text-left font-normal ${
                              !field.value ? "text-muted-foreground" : ""
                            }`}
                          >
                            {field.value ? (
                              format(field.value, "PPP")
                            ) : (
                              <span>Pick a date</span>
                            )}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="department"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Department</FormLabel>
                    <FormControl>
                      <Input placeholder="Marketing" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            <FormField
              control={form.control}
              name="tags"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tags</FormLabel>
                  <FormControl>
                    <Input placeholder="corporate, team, offsite" {...field} />
                  </FormControl>
                  <FormDescription>
                    Separate tags with commas
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="isPublic"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base">Public Event</FormLabel>
                    <FormDescription>
                      Make this event visible to all users
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <DialogFooter>
              <Button 
                type="submit" 
                disabled={createEventMutation.isPending}
              >
                {createEventMutation.isPending && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Create Event
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

// Upload Files Dialog Component
function UploadFilesDialog({ 
  open, 
  onOpenChange,
  selectedEvent
}: { 
  open: boolean; 
  onOpenChange: (open: boolean) => void;
  selectedEvent: any;
}) {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  
  const form = useForm<z.infer<typeof uploadFormSchema>>({
    resolver: zodResolver(uploadFormSchema),
    defaultValues: {
      eventId: selectedEvent?.id?.toString() || "",
      visibility: "private" as const,
      watermarkEnabled: false,
    },
  });
  
  // Reset form on open & when selected event changes
  React.useEffect(() => {
    if (open) {
      form.reset({
        eventId: selectedEvent?.id?.toString() || "",
        visibility: "private",
        watermarkEnabled: false,
      });
    }
  }, [open, selectedEvent, form]);
  
  // Get events for dropdown
  const { data: eventsData } = useQuery({ 
    queryKey: ['/api/media/events'],
    enabled: open,
  });
  
  const events = eventsData?.events || [];
  
  const uploadFilesMutation = useMutation({
    mutationFn: async (data: z.infer<typeof uploadFormSchema>) => {
      setIsUploading(true);
      setUploadProgress(0);
      
      const formData = new FormData();
      
      // Append files
      for (let i = 0; i < data.files.length; i++) {
        formData.append('files', data.files[i]);
      }
      
      // Append other fields
      if (data.eventId) formData.append('eventId', data.eventId);
      formData.append('visibility', data.visibility);
      formData.append('watermarkEnabled', data.watermarkEnabled.toString());
      if (data.password) formData.append('password', data.password);
      if (data.expiryDate) formData.append('expiryDate', data.expiryDate.toISOString());
      
      try {
        // Simulate progress for demo
        const interval = setInterval(() => {
          setUploadProgress(prev => {
            const newProgress = prev + Math.random() * 15;
            return newProgress >= 100 ? 100 : newProgress;
          });
        }, 500);
        
        const res = await fetch('/api/media/files/upload', {
          method: 'POST',
          body: formData,
          credentials: 'include',
        });
        
        clearInterval(interval);
        setUploadProgress(100);
        
        if (!res.ok) {
          const error = await res.json();
          throw new Error(error.message || 'Upload failed');
        }
        
        return res.json();
      } finally {
        setTimeout(() => {
          setIsUploading(false);
          setUploadProgress(0);
        }, 500);
      }
    },
    onSuccess: () => {
      toast({
        title: "Files uploaded",
        description: "Your files have been uploaded successfully."
      });
      form.reset();
      onOpenChange(false);
      // Refresh files if we had an event selected
      if (selectedEvent) {
        queryClient.invalidateQueries({ queryKey: ['/api/media/events', selectedEvent.id] });
      }
      // Refresh events list
      queryClient.invalidateQueries({ queryKey: ['/api/media/events'] });
    },
    onError: (error: Error) => {
      toast({
        title: "Upload failed",
        description: error.message || "An error occurred while uploading files.",
        variant: "destructive"
      });
    }
  });
  
  const onSubmit = (data: z.infer<typeof uploadFormSchema>) => {
    uploadFilesMutation.mutate(data);
  };
  
  return (
    <Dialog open={open} onOpenChange={isUploading ? undefined : onOpenChange}>
      <DialogContent className="sm:max-w-[525px]">
        <DialogHeader>
          <DialogTitle>Upload Files</DialogTitle>
          <DialogDescription>
            Upload media files to the repository.
          </DialogDescription>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="files"
              render={({ field: { onChange, value, ...fieldProps } }) => (
                <FormItem>
                  <FormLabel>Files</FormLabel>
                  <FormControl>
                    <div className="border-2 border-dashed rounded-lg p-6 text-center hover:bg-muted/50 transition cursor-pointer">
                      <Input
                        type="file"
                        multiple
                        accept="image/*,video/*"
                        className="hidden"
                        id="file-upload"
                        onChange={(e) => {
                          onChange(e.target.files);
                        }}
                        {...fieldProps}
                      />
                      <Label htmlFor="file-upload" className="cursor-pointer">
                        <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                        <p className="text-sm font-medium">Click to upload or drag and drop</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Images and videos up to 50MB
                        </p>
                        {value && value.length > 0 && (
                          <div className="mt-4 text-left">
                            <p className="text-xs font-medium mb-1">Selected files:</p>
                            <ul className="text-xs text-muted-foreground space-y-1 max-h-20 overflow-y-auto">
                              {Array.from(value).map((file, i) => (
                                <li key={i} className="truncate">
                                  {file.name} ({formatFileSize(file.size)})
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </Label>
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="eventId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Event (Optional)</FormLabel>
                  <Select 
                    onValueChange={field.onChange} 
                    defaultValue={field.value}
                    value={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select an event" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="no_event">No event</SelectItem>
                      {events.map((event: any) => (
                        <SelectItem key={event.id} value={event.id.toString()}>
                          {event.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    Assign these files to an event for better organization
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="visibility"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Visibility</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select visibility" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="public">Public</SelectItem>
                      <SelectItem value="private">Private</SelectItem>
                      <SelectItem value="group">Group</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    Control who can view these files
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <div className="space-y-2">
              <h4 className="text-sm font-medium">Advanced Options</h4>
              
              <FormField
                control={form.control}
                name="watermarkEnabled"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-3">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel className="text-sm">
                        Enable Watermark
                      </FormLabel>
                      <FormDescription>
                        Add a watermark to images when viewed
                      </FormDescription>
                    </div>
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Password Protection (Optional)</FormLabel>
                    <FormControl>
                      <Input 
                        type="password" 
                        placeholder="Enter password" 
                        {...field}
                        value={field.value || ''}
                      />
                    </FormControl>
                    <FormDescription>
                      Require a password to access these files
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="expiryDate"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Expiry Date (Optional)</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant={"outline"}
                            className={`pl-3 text-left font-normal ${
                              !field.value ? "text-muted-foreground" : ""
                            }`}
                          >
                            {field.value ? (
                              format(field.value, "PPP")
                            ) : (
                              <span>No expiry date</span>
                            )}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          initialFocus
                          disabled={(date) => date < new Date()}
                        />
                      </PopoverContent>
                    </Popover>
                    <FormDescription>
                      Files will expire after this date
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            {isUploading && (
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Uploading...</span>
                  <span>{Math.round(uploadProgress)}%</span>
                </div>
                <div className="w-full bg-muted rounded-full h-2.5">
                  <div 
                    className="bg-primary h-2.5 rounded-full"
                    style={{ width: `${uploadProgress}%` }}
                  ></div>
                </div>
              </div>
            )}
            
            <DialogFooter>
              <DialogClose asChild>
                <Button variant="outline" type="button" disabled={isUploading}>Cancel</Button>
              </DialogClose>
              <Button type="submit" disabled={isUploading || uploadFilesMutation.isPending}>
                {(isUploading || uploadFilesMutation.isPending) && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Upload Files
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

// Gallery View Component
function GalleryView({ 
  onFileSelect 
}: { 
  onFileSelect: (file: any) => void;
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [tagFilter, setTagFilter] = useState<string>('');
  const [dateRange, setDateRange] = useState<{ from?: Date; to?: Date }>({});
  
  // Fetch all files (with pagination in a real app)
  const { data, isLoading, error } = useQuery({ 
    queryKey: ['/api/media/files', { search: searchQuery, tags: tagFilter, from: dateRange.from, to: dateRange.to }],
  });
  
  // Simulated data for demo (in a real app this would come from the API)
  const files = data?.files || [];
  
  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row gap-4">
        <div className="flex-1">
          <Input
            placeholder="Search files..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full"
          />
        </div>
        
        <div className="flex gap-2">
          <Select value={tagFilter} onValueChange={setTagFilter}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Filter by tag" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all_tags">All Tags</SelectItem>
              <SelectItem value="event">Event</SelectItem>
              <SelectItem value="training">Training</SelectItem>
              <SelectItem value="corporate">Corporate</SelectItem>
            </SelectContent>
          </Select>
          
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="w-[150px] justify-start text-left font-normal">
                <CalendarIcon className="mr-2 h-4 w-4" />
                {dateRange.from ? (
                  dateRange.to ? (
                    <>
                      {format(dateRange.from, "LLL dd")} - {format(dateRange.to, "LLL dd")}
                    </>
                  ) : (
                    format(dateRange.from, "LLL dd")
                  )
                ) : (
                  <span>Date range</span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="range"
                selected={{ from: dateRange.from, to: dateRange.to }}
                onSelect={setDateRange}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </div>
      </div>
      
      {isLoading ? (
        <div className="flex justify-center p-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : error ? (
        <div className="text-center p-12 border rounded-lg">
          <p className="text-destructive font-medium">Failed to load files</p>
          <p className="text-muted-foreground text-sm">Please try again later</p>
        </div>
      ) : files.length === 0 ? (
        <div className="text-center p-12 border rounded-lg">
          <p className="font-medium mb-2">No files found</p>
          <p className="text-muted-foreground">
            {searchQuery || tagFilter || dateRange.from ? 
              "Try adjusting your search filters" : 
              "There are no files to display"}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {files.map((file: any) => (
            <FileCard 
              key={file.id} 
              file={file} 
              onClick={() => onFileSelect(file)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// Management View Component
function ManagementView() {
  const [activeTab, setActiveTab] = useState("stats");
  
  // Fetch management statistics
  const { data, isLoading } = useQuery({ 
    queryKey: ['/api/media/dashboard/stats'],
  });
  
  // Simulated data for demo (in a real app this would come from the API)
  const stats = data || {
    totalEvents: 0,
    totalFiles: 0,
    totalGroups: 0,
    storageUsed: { formatted: "0 KB" },
    topEvents: [],
    topFiles: [],
    recentActivity: [],
  };
  
  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Events</CardTitle>
            <CalendarIcon2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {isLoading ? (
                <Loader2 className="h-5 w-5 animate-spin text-primary" />
              ) : (
                stats.totalEvents
              )}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Media Files</CardTitle>
            <FileIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {isLoading ? (
                <Loader2 className="h-5 w-5 animate-spin text-primary" />
              ) : (
                stats.totalFiles
              )}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">User Groups</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {isLoading ? (
                <Loader2 className="h-5 w-5 animate-spin text-primary" />
              ) : (
                stats.totalGroups
              )}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Storage Used</CardTitle>
            <FileIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {isLoading ? (
                <Loader2 className="h-5 w-5 animate-spin text-primary" />
              ) : (
                stats.storageUsed.formatted
              )}
            </div>
          </CardContent>
        </Card>
      </div>
      
      <Tabs defaultValue="stats" onValueChange={setActiveTab}>
        <TabsList className="grid w-full max-w-md grid-cols-3">
          <TabsTrigger value="stats">Statistics</TabsTrigger>
          <TabsTrigger value="groups">User Groups</TabsTrigger>
          <TabsTrigger value="activity">Activity Log</TabsTrigger>
        </TabsList>
        
        <TabsContent value="stats" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Top Events</CardTitle>
                <CardDescription>
                  Events with the most files
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="flex justify-center p-6">
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                  </div>
                ) : stats.topEvents.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center p-6">
                    No event data available
                  </p>
                ) : (
                  <div className="space-y-4">
                    {stats.topEvents.map((event: any) => (
                      <div key={event.eventId} className="flex items-center">
                        <div className="w-full">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-sm font-medium">{event.eventName}</span>
                            <span className="text-sm text-muted-foreground">{event.count} files</span>
                          </div>
                          <div className="w-full bg-muted rounded-full h-2">
                            <div 
                              className="bg-primary h-2 rounded-full"
                              style={{ width: `${Math.min(100, (event.count / 10) * 100)}%` }}
                            ></div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Most Viewed Files</CardTitle>
                <CardDescription>
                  Files with highest view counts
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="flex justify-center p-6">
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                  </div>
                ) : stats.topFiles.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center p-6">
                    No file view data available
                  </p>
                ) : (
                  <div className="space-y-4">
                    {stats.topFiles.map((file: any) => (
                      <div key={file.id} className="flex items-center">
                        <div className="w-9 h-9 rounded bg-muted mr-2 flex items-center justify-center overflow-hidden">
                          {file.mimeType?.startsWith('image/') && file.url ? (
                            <img 
                              src={file.url} 
                              alt={file.originalFilename} 
                              className="w-full h-full object-cover"
                            />
                          ) : file.mimeType?.startsWith('video/') ? (
                            <VideoIcon className="h-5 w-5 text-muted-foreground" />
                          ) : (
                            <FileIcon className="h-5 w-5 text-muted-foreground" />
                          )}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-sm font-medium truncate max-w-[180px]">
                              {file.originalFilename}
                            </span>
                            <span className="text-sm text-muted-foreground">{file.views} views</span>
                          </div>
                          <div className="w-full bg-muted rounded-full h-2">
                            <div 
                              className="bg-primary h-2 rounded-full"
                              style={{ width: `${Math.min(100, (file.views / 100) * 100)}%` }}
                            ></div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        
        <TabsContent value="groups" className="space-y-4">
          <GroupsManagement />
        </TabsContent>
        
        <TabsContent value="activity" className="space-y-4">
          <ActivityLog />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// Groups Management Component
function GroupsManagement() {
  // Fetch groups
  const { data, isLoading } = useQuery({ 
    queryKey: ['/api/media/groups'],
  });
  
  const groups = data || [];
  
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="text-lg">User Groups</CardTitle>
          <CardDescription>
            Manage access groups for media sharing
          </CardDescription>
        </div>
        <Button size="sm">
          <PlusIcon className="h-4 w-4 mr-1" /> New Group
        </Button>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center p-6">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : groups.length === 0 ? (
          <div className="text-center p-6 border rounded-md">
            <p className="font-medium mb-1">No groups created yet</p>
            <p className="text-sm text-muted-foreground">
              Create a group to manage file permissions
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {groups.map((group: any) => (
              <div key={group.id} className="flex items-center justify-between p-3 border rounded-md">
                <div>
                  <p className="font-medium">{group.name}</p>
                  <p className="text-sm text-muted-foreground">{group.memberCount || 0} members</p>
                </div>
                <Button variant="outline" size="sm">
                  Manage
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Activity Log Component
function ActivityLog() {
  // Fetch activity logs
  const { data, isLoading } = useQuery({ 
    queryKey: ['/api/media/dashboard/activity'],
  });
  
  const activities = data || [];
  
  // Format timestamps
  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    return format(date, 'MMM d, yyyy HH:mm');
  };
  
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Recent Activity</CardTitle>
        <CardDescription>
          Recent actions in the media repository
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center p-6">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : activities.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center p-6">
            No recent activity
          </p>
        ) : (
          <div className="space-y-4">
            {activities.map((activity: any) => (
              <div key={activity.id} className="flex space-x-3 text-sm">
                <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                  {activity.adminId ? 
                    <Users className="h-4 w-4 text-muted-foreground" /> :
                    <EyeIcon className="h-4 w-4 text-muted-foreground" />
                  }
                </div>
                <div className="flex-1">
                  <div className="flex justify-between">
                    <p className="font-medium">
                      {activity.userName || activity.adminName || 'Anonymous'}
                    </p>
                    <p className="text-muted-foreground">
                      {formatTimestamp(activity.timestamp)}
                    </p>
                  </div>
                  <p className="text-muted-foreground">
                    {getActivityDescription(activity)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Helper function to format file sizes
function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Helper function to get activity descriptions
function getActivityDescription(activity: any): string {
  const actionMap: Record<string, string> = {
    'view_file': 'viewed a file',
    'download_file': 'downloaded a file',
    'upload_files': 'uploaded files',
    'create_event': 'created an event',
    'update_event': 'updated an event',
    'delete_event': 'deleted an event',
    'create_share_link': 'created a share link',
    'access_shared_link': 'accessed a shared link',
    'grant_permission': 'granted file permissions',
    'create_group': 'created a user group',
    'add_group_member': 'added a user to a group',
  };
  
  const action = actionMap[activity.action] || activity.action;
  let description = action;
  
  if (activity.fileName) {
    description += `: ${activity.fileName}`;
  } else if (activity.eventName) {
    description += `: ${activity.eventName}`;
  }
  
  return description;
}