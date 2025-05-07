import React, { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
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
import Sidebar from "@/components/layout/sidebar";
import Header from "@/components/layout/header";

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
  const [, setLocation] = useLocation();
  const [activeTab, setActiveTab] = useState("browse");
  const [selectedEvent, setSelectedEvent] = useState<any>(null);
  const [selectedFile, setSelectedFile] = useState<any>(null);
  const [createEventDialogOpen, setCreateEventDialogOpen] = useState(false);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [fileDetailsDialogOpen, setFileDetailsDialogOpen] = useState(false);
  const [page, setPage] = useState(1);

  // Safe date formatting function
  const formatEventDate = (dateStr: string) => {
    try {
      if (!dateStr) return 'No date';
      const date = new Date(dateStr);
      return !isNaN(date.getTime()) 
        ? format(date, 'MMMM d, yyyy')
        : 'Invalid date';
    } catch (e) {
      return 'Invalid date';
    }
  };
  
  // Fetch events with pagination (20 items per page)
  const { 
    data: eventsData,
    isLoading: eventsLoading,
    error: eventsError,
  } = useQuery({ 
    queryKey: ['/api/media/events', { page, limit: 20 }],
    enabled: !authLoading && !!user,
  });

  // Check if user is admin or editor
  const isAdminOrEditor = user?.role === 'admin' || user?.role === 'editor';
  
  return (
    <div className="flex h-screen overflow-hidden bg-neutral-50">
      <Sidebar />

      <main className="flex-1 flex flex-col overflow-hidden">
        <Header />
        
        <div className="flex-1 overflow-auto p-6">
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
              <div className="rounded-md border">
                <div className="relative w-full overflow-auto">
                  <table className="w-full caption-bottom text-sm">
                    <thead className="[&_tr]:border-b">
                      <tr className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted">
                        <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Name</th>
                        <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Date</th>
                        <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Visibility</th>
                        <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Department</th>
                        <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Files</th>
                        <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="[&_tr:last-child]:border-0">
                      {eventsLoading ? (
                        <tr>
                          <td colSpan={6} className="py-12 text-center">
                            <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
                          </td>
                        </tr>
                      ) : eventsError ? (
                        <tr>
                          <td colSpan={6} className="py-8 text-center">
                            <p className="text-destructive font-medium">Failed to load events</p>
                            <p className="text-muted-foreground text-sm">Please try again later</p>
                          </td>
                        </tr>
                      ) : eventsData?.events?.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="py-8 text-center">
                            <h3 className="text-lg font-medium mb-2">No events found</h3>
                            <p className="text-muted-foreground mb-6">
                              There are no media events to display.
                            </p>
                            {isAdminOrEditor && (
                              <Button onClick={() => setCreateEventDialogOpen(true)}>
                                <PlusIcon className="mr-2 h-4 w-4" /> Create your first event
                              </Button>
                            )}
                          </td>
                        </tr>
                      ) : (
                        eventsData?.events?.map((event: any) => (
                          <tr
                            key={event.id}
                            className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted cursor-pointer"
                            onClick={() => setLocation(`/media/events/${event.id}`)}
                          >
                            <td className="p-4 align-middle font-medium">
                              {event.name}
                            </td>
                            <td className="p-4 align-middle">
                              {formatEventDate(event.eventDate)}
                            </td>
                            <td className="p-4 align-middle">
                              {event.isPublic ? (
                                <Badge variant="outline">Public</Badge>
                              ) : (
                                <Badge variant="secondary">Private</Badge>
                              )}
                            </td>
                            <td className="p-4 align-middle">
                              {event.department || "General"}
                            </td>
                            <td className="p-4 align-middle">
                              {event.fileCount || 0}
                            </td>
                            <td className="p-4 align-middle">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setLocation(`/media/events/${event.id}`);
                                }}
                              >
                                <EyeIcon className="h-4 w-4" />
                              </Button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
                
                {/* Pagination */}
                {eventsData?.pagination && eventsData.pagination.pages > 1 && (
                  <div className="flex items-center justify-between px-4 py-4 border-t">
                    <div className="text-sm text-muted-foreground">
                      Showing <span className="font-medium">{((eventsData.pagination.page - 1) * eventsData.pagination.limit) + 1}</span> to{" "}
                      <span className="font-medium">
                        {Math.min(eventsData.pagination.page * eventsData.pagination.limit, eventsData.pagination.total)}
                      </span>{" "}
                      of <span className="font-medium">{eventsData.pagination.total}</span> results
                    </div>
                    <div className="flex items-center space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={eventsData.pagination.page <= 1}
                        onClick={() => {
                          if (eventsData.pagination.page > 1) {
                            setPage(eventsData.pagination.page - 1);
                          }
                        }}
                      >
                        Previous
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={eventsData.pagination.page >= eventsData.pagination.pages}
                        onClick={() => {
                          if (eventsData.pagination.page < eventsData.pagination.pages) {
                            setPage(eventsData.pagination.page + 1);
                          }
                        }}
                      >
                        Next
                      </Button>
                    </div>
                  </div>
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
      </main>
    </div>
  );
}

// Event Card Component
function EventCard({ event, onClick }: { event: any; onClick: () => void }) {
  // Safe date formatting function
  const formatEventDate = (dateStr: string) => {
    try {
      if (!dateStr) return 'No date';
      const date = new Date(dateStr);
      return !isNaN(date.getTime()) 
        ? format(date, 'MMMM d, yyyy')
        : 'Invalid date';
    } catch (e) {
      return 'Invalid date';
    }
  };
  
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
          {formatEventDate(event.eventDate)}
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
  
  // Safe date formatting function
  const formatEventDate = (dateStr: string) => {
    try {
      if (!dateStr) return 'No date';
      const date = new Date(dateStr);
      return !isNaN(date.getTime()) 
        ? format(date, 'MMMM d, yyyy')
        : 'Invalid date';
    } catch (e) {
      return 'Invalid date';
    }
  };
  
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
              {formatEventDate(eventDetails.eventDate)}
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
                      {formatDate(fileDetails.uploadedAt)}
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
                      {formatDate(fileDetails.expiryDate)}
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
            
            {fileDetails.shareLinks && fileDetails.shareLinks.length > 0 ? (
              <div className="mt-4">
                <h4 className="text-sm font-medium mb-2">Share Links</h4>
                <div className="space-y-2">
                  {fileDetails.shareLinks.map((link: any) => (
                    <div key={link.id} className="flex items-center justify-between border rounded p-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-xs truncate">{`${window.location.origin}/shared/${link.token}`}</p>
                        <div className="flex items-center space-x-2 text-xs text-muted-foreground mt-1">
                          <span>Views: {link.views}/{link.maxViews || '∞'}</span>
                          {link.expiryDate && (
                            <span>Expires: {formatDate(link.expiryDate)}</span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center space-x-1 ml-2">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => {
                            navigator.clipboard.writeText(`${window.location.origin}/shared/${link.token}`);
                            toast({
                              title: "Link copied",
                              description: "Share link has been copied to clipboard"
                            });
                          }}
                        >
                          Copy
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : isAdminOrEditor && (
              <div className="mt-4 flex justify-end">
                <Button 
                  variant="outline" 
                  onClick={handleCreateShareLink}
                  disabled={shareLinkMutation.isPending}
                >
                  {shareLinkMutation.isPending && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  <ShareIcon className="mr-2 h-4 w-4" /> Generate Share Link
                </Button>
              </div>
            )}
            
            <DialogFooter className="gap-2">
              <Button 
                variant="outline" 
                onClick={() => {
                  window.open(fileDetails.url, '_blank');
                }}
              >
                <EyeIcon className="mr-2 h-4 w-4" /> View
              </Button>
              <Button 
                variant="outline" 
                onClick={() => {
                  window.open(`/api/media/files/${fileDetails.id}/download`, '_blank');
                }}
              >
                <DownloadIcon className="mr-2 h-4 w-4" /> Download
              </Button>
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
  onOpenChange,
}: { 
  open: boolean; 
  onOpenChange: (open: boolean) => void;
}) {
  const { user } = useAuth();
  
  const form = useForm<z.infer<typeof eventFormSchema>>({
    resolver: zodResolver(eventFormSchema),
    defaultValues: {
      name: "",
      description: "",
      isPublic: false,
    },
  });
  
  // Create event mutation
  const createEventMutation = useMutation({
    mutationFn: async (data: z.infer<typeof eventFormSchema>) => {
      const res = await apiRequest('POST', '/api/media/events', data);
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Event created",
        description: "The event has been created successfully."
      });
      form.reset();
      onOpenChange(false);
      // Refresh events list
      queryClient.invalidateQueries({ queryKey: ['/api/media/events'] });
    },
    onError: () => {
      toast({
        title: "Failed to create event",
        description: "An error occurred while creating the event.",
        variant: "destructive"
      });
    }
  });
  
  const onSubmit = (data: z.infer<typeof eventFormSchema>) => {
    createEventMutation.mutate(data);
  };
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Create New Event</DialogTitle>
          <DialogDescription>
            Add a new event to organize your media files.
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
                    <Input placeholder="Enter event name" {...field} />
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
                      placeholder="Enter event description" 
                      {...field} 
                      value={field.value || ''}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
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
                          variant="outline"
                          className={`w-full pl-3 text-left font-normal ${!field.value && "text-muted-foreground"}`}
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
                        disabled={(date) => date < new Date("1900-01-01")}
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
                  <FormLabel>Department (Optional)</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="Enter department name" 
                      {...field} 
                      value={field.value || ''}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="tags"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tags (Optional)</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="Enter tags, separated by commas" 
                      {...field} 
                      value={field.value || ''}
                    />
                  </FormControl>
                  <FormDescription>
                    Separate tags with commas (e.g., "training, workshop, team")
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
                    <FormLabel>Public Event</FormLabel>
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
                </FormItem>
              )}
            />
            
            <DialogFooter>
              <Button type="submit" disabled={createEventMutation.isPending}>
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
  selectedEvent,
}: { 
  open: boolean; 
  onOpenChange: (open: boolean) => void;
  selectedEvent: any;
}) {
  const { user } = useAuth();
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  
  // Fetch events for dropdown
  const { data: eventsData } = useQuery({ 
    queryKey: ['/api/media/events'],
  });
  
  const form = useForm<z.infer<typeof uploadFormSchema>>({
    resolver: zodResolver(uploadFormSchema),
    defaultValues: {
      visibility: "private",
      watermarkEnabled: false,
      eventId: selectedEvent?.id?.toString() || "no_event",
    },
  });
  
  // Set selected event when dialog opens or selected event changes
  React.useEffect(() => {
    if (selectedEvent) {
      form.setValue("eventId", selectedEvent.id.toString());
    }
  }, [selectedEvent, form, open]);
  
  // Upload files mutation
  const uploadFilesMutation = useMutation({
    mutationFn: async (data: FormData) => {
      setIsUploading(true);
      setUploadProgress(0);
      
      const xhr = new XMLHttpRequest();
      
      const response = await new Promise<any>((resolve, reject) => {
        xhr.upload.addEventListener("progress", (event) => {
          if (event.lengthComputable) {
            const progress = Math.round((event.loaded * 100) / event.total);
            setUploadProgress(progress);
          }
        });
        
        xhr.addEventListener("load", () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            try {
              const response = JSON.parse(xhr.responseText);
              resolve(response);
            } catch (error) {
              reject(new Error("Failed to parse response"));
            }
          } else {
            reject(new Error(`HTTP Error: ${xhr.status}`));
          }
        });
        
        xhr.addEventListener("error", () => {
          reject(new Error("Network error occurred"));
        });
        
        xhr.open("POST", "/api/media/files/upload");
        xhr.send(data);
      });
      
      setIsUploading(false);
      return response;
    },
    onSuccess: () => {
      toast({
        title: "Files uploaded",
        description: "Your files have been uploaded successfully."
      });
      form.reset();
      onOpenChange(false);
      // Refresh files and events
      queryClient.invalidateQueries({ queryKey: ['/api/media/events'] });
      if (selectedEvent) {
        queryClient.invalidateQueries({ queryKey: ['/api/media/events', selectedEvent.id] });
      }
    },
    onError: (error) => {
      setIsUploading(false);
      toast({
        title: "Upload failed",
        description: error.message || "An error occurred while uploading files.",
        variant: "destructive"
      });
    }
  });
  
  const onSubmit = (data: z.infer<typeof uploadFormSchema>) => {
    const formData = new FormData();
    
    // Append each file
    for (let i = 0; i < data.files.length; i++) {
      formData.append("file", data.files[i]);
    }
    
    // Append other form data
    if (data.eventId) {
      formData.append("eventId", data.eventId);
    }
    formData.append("visibility", data.visibility);
    formData.append("watermarkEnabled", data.watermarkEnabled.toString());
    
    if (data.password) {
      formData.append("password", data.password);
    }
    
    if (data.expiryDate) {
      formData.append("expiryDate", data.expiryDate.toISOString());
    }
    
    uploadFilesMutation.mutate(formData);
  };
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Upload Files</DialogTitle>
          <DialogDescription>
            Upload media files to your repository
          </DialogDescription>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="files"
              render={({ field: { onChange, value, ...rest } }) => (
                <FormItem>
                  <FormLabel>Files</FormLabel>
                  <FormControl>
                    <Input
                      type="file"
                      multiple
                      onChange={(e) => onChange(e.target.files)}
                      {...rest}
                    />
                  </FormControl>
                  <FormDescription>
                    Select one or more files to upload
                  </FormDescription>
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
                    value={field.value} 
                    onValueChange={field.onChange}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select an event" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="no_event">No event</SelectItem>
                      {eventsData?.events?.map((event: any) => (
                        <SelectItem key={event.id} value={event.id.toString()}>
                          {event.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    Associate these files with an event
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
                  <Select 
                    value={field.value} 
                    onValueChange={field.onChange}
                  >
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
                    Control who can access these files
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="watermarkEnabled"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                  <div className="space-y-0.5">
                    <FormLabel>Enable Watermark</FormLabel>
                    <FormDescription>
                      Add watermark to images
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
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
                      placeholder="Set a password" 
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
                          variant="outline"
                          className={`w-full pl-3 text-left font-normal ${!field.value && "text-muted-foreground"}`}
                        >
                          {field.value ? (
                            format(field.value, "PPP")
                          ) : (
                            <span>Set expiry date</span>
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
                        disabled={(date) => date < new Date()}
                        initialFocus
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
            
            {isUploading && (
              <div className="space-y-1">
                <p className="text-sm font-medium">Uploading... {uploadProgress}%</p>
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
function GalleryView({ onFileSelect }: { onFileSelect: (file: any) => void }) {
  const [filters, setFilters] = useState<any>({
    type: "all",
    dateRange: { from: undefined, to: undefined },
    search: "",
  });
  
  // Fetch all files
  const { 
    data: filesData,
    isLoading: filesLoading,
    error: filesError,
  } = useQuery({ 
    queryKey: ['/api/media/files'],
  });
  
  const filteredFiles = filesData?.files?.filter((file: any) => {
    // Filter by type
    if (filters.type !== "all") {
      if (filters.type === "image" && !file.mimeType?.startsWith("image/")) {
        return false;
      }
      if (filters.type === "video" && !file.mimeType?.startsWith("video/")) {
        return false;
      }
      if (filters.type === "document" && 
          !file.mimeType?.startsWith("application/") && 
          !file.mimeType?.startsWith("text/")) {
        return false;
      }
    }
    
    // Filter by date range
    if (filters.dateRange.from && new Date(file.uploadedAt) < filters.dateRange.from) {
      return false;
    }
    if (filters.dateRange.to) {
      const toDate = new Date(filters.dateRange.to);
      toDate.setHours(23, 59, 59, 999); // End of the day
      if (new Date(file.uploadedAt) > toDate) {
        return false;
      }
    }
    
    // Filter by search term
    if (filters.search) {
      const searchTerm = filters.search.toLowerCase();
      return (
        file.originalFilename?.toLowerCase().includes(searchTerm) ||
        file.event?.name?.toLowerCase().includes(searchTerm)
      );
    }
    
    return true;
  }) || [];
  
  return (
    <div className="space-y-4">
      <div className="flex flex-col md:flex-row gap-4">
        <div className="flex-1">
          <Input
            placeholder="Search files..."
            value={filters.search}
            onChange={(e) => setFilters({ ...filters, search: e.target.value })}
            className="max-w-sm"
          />
        </div>
        
        <div className="flex flex-wrap gap-2">
          <Select 
            value={filters.type} 
            onValueChange={(value) => setFilters({ ...filters, type: value })}
          >
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="File type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All types</SelectItem>
              <SelectItem value="image">Images</SelectItem>
              <SelectItem value="video">Videos</SelectItem>
              <SelectItem value="document">Documents</SelectItem>
            </SelectContent>
          </Select>
          
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="w-[250px] justify-start text-left font-normal">
                <CalendarIcon className="mr-2 h-4 w-4" />
                {filters.dateRange.from || filters.dateRange.to ? (
                  <>
                    {filters.dateRange.from && format(filters.dateRange.from, "PPP")} 
                    {filters.dateRange.from && filters.dateRange.to && " - "}
                    {filters.dateRange.to && format(filters.dateRange.to, "PPP")}
                  </>
                ) : (
                  <span>Pick a date range</span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="range"
                selected={filters.dateRange}
                onSelect={(range) => setFilters({ ...filters, dateRange: range })}
                initialFocus
              />
              <div className="p-3 border-t border-border">
                <Button
                  variant="ghost"
                  className="w-full"
                  onClick={() => setFilters({ 
                    ...filters, 
                    dateRange: { from: undefined, to: undefined } 
                  })}
                >
                  Clear dates
                </Button>
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </div>
      
      <div>
        {filesLoading ? (
          <div className="flex justify-center p-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : filesError ? (
          <div className="text-center p-12 border rounded-lg">
            <p className="text-destructive font-medium">Failed to load files</p>
            <p className="text-muted-foreground text-sm">Please try again later</p>
          </div>
        ) : filteredFiles.length === 0 ? (
          <div className="text-center p-12 border rounded-lg">
            <p className="text-muted-foreground">No files match your filters</p>
            <Button 
              variant="link" 
              onClick={() => setFilters({
                type: "all",
                dateRange: { from: undefined, to: undefined },
                search: "",
              })}
            >
              Clear filters
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {filteredFiles.map((file: any) => (
              <FileCard 
                key={file.id} 
                file={file} 
                onClick={() => onFileSelect(file)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// Management View Component
function ManagementView() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("dashboard");
  
  // Fetch statistics
  const { 
    data: statsData,
    isLoading: statsLoading,
  } = useQuery({ 
    queryKey: ['/api/media/dashboard/stats'],
  });
  
  return (
    <div className="space-y-6">
      <Tabs 
        defaultValue="dashboard" 
        onValueChange={setActiveTab}
        className="space-y-4"
      >
        <TabsList>
          <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
          <TabsTrigger value="users">Users</TabsTrigger>
          <TabsTrigger value="groups">Groups</TabsTrigger>
          <TabsTrigger value="activity">Activity Log</TabsTrigger>
        </TabsList>
        
        <TabsContent value="dashboard" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Total Events
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {statsLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                  ) : (
                    statsData?.totalEvents || 0
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  Media events in repository
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Total Files
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {statsLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                  ) : (
                    statsData?.totalFiles || 0
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  Media files uploaded
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  User Groups
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {statsLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                  ) : (
                    statsData?.totalGroups || 0
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  Permission groups
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Storage Used
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {statsLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                  ) : (
                    formatFileSize(statsData?.storageUsed || 0)
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  Total storage space used
                </p>
              </CardContent>
            </Card>
          </div>
          
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Top Events</CardTitle>
                <CardDescription>
                  Most active events by file count
                </CardDescription>
              </CardHeader>
              <CardContent>
                {statsLoading ? (
                  <div className="flex justify-center p-6">
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                  </div>
                ) : statsData?.topEvents?.length === 0 ? (
                  <p className="text-center text-muted-foreground py-6">No events yet</p>
                ) : (
                  <div className="space-y-4">
                    {statsData?.topEvents?.map((event: any, i: number) => (
                      <div key={event.id} className="flex items-center">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
                          {i + 1}
                        </div>
                        <div className="ml-4 space-y-1">
                          <p className="text-sm font-medium leading-none">{event.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {event.fileCount} files
                          </p>
                        </div>
                        <div className="ml-auto font-medium">
                          {new Date(event.eventDate).toLocaleDateString()}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Popular Files</CardTitle>
                <CardDescription>
                  Most viewed media files
                </CardDescription>
              </CardHeader>
              <CardContent>
                {statsLoading ? (
                  <div className="flex justify-center p-6">
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                  </div>
                ) : statsData?.topFiles?.length === 0 ? (
                  <p className="text-center text-muted-foreground py-6">No files yet</p>
                ) : (
                  <div className="space-y-4">
                    {statsData?.topFiles?.map((file: any, i: number) => (
                      <div key={file.id} className="flex items-center">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
                          {i + 1}
                        </div>
                        <div className="ml-4 space-y-1">
                          <p className="text-sm font-medium leading-none truncate max-w-[200px]">
                            {file.originalFilename}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {formatFileSize(file.size)}
                          </p>
                        </div>
                        <div className="ml-auto font-medium">
                          {file.views} views
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        
        <TabsContent value="users" className="space-y-4">
          <UsersManagement />
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

// User Management Component (Placeholder)
function UsersManagement() {
  return (
    <div className="text-center p-12 border rounded-lg">
      <Users className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
      <h3 className="text-lg font-medium mb-2">User Management</h3>
      <p className="text-muted-foreground mb-4">
        User management interface is under development.
      </p>
    </div>
  );
}

// Groups Management Component (Placeholder)
function GroupsManagement() {
  // Fetch groups
  const { 
    data: groupsData,
    isLoading: groupsLoading,
    error: groupsError,
  } = useQuery({ 
    queryKey: ['/api/media/groups'],
  });
  
  return (
    <div>
      {groupsLoading ? (
        <div className="flex justify-center p-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : groupsError ? (
        <div className="text-center p-12 border rounded-lg">
          <p className="text-destructive font-medium">Failed to load groups</p>
          <p className="text-muted-foreground text-sm">Please try again later</p>
        </div>
      ) : groupsData?.length === 0 ? (
        <div className="text-center p-12 border rounded-lg">
          <Users className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium mb-2">No Groups Yet</h3>
          <p className="text-muted-foreground mb-4">
            Create user groups to manage file permissions.
          </p>
          <Button>
            <PlusIcon className="mr-2 h-4 w-4" /> Create Group
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex justify-between">
            <h2 className="text-lg font-semibold">User Groups</h2>
            <Button>
              <PlusIcon className="mr-2 h-4 w-4" /> Create Group
            </Button>
          </div>
          
          <div className="space-y-4">
            {groupsData?.map((group: any) => (
              <Card key={group.id}>
                <CardHeader className="pb-2">
                  <CardTitle>{group.name}</CardTitle>
                  <CardDescription>{group.description}</CardDescription>
                </CardHeader>
                <CardContent className="pb-2">
                  <div className="flex items-center">
                    <Users className="h-4 w-4 mr-2" />
                    <span className="text-sm">{group.memberCount || 0} members</span>
                  </div>
                </CardContent>
                <CardFooter>
                  <Button variant="ghost" size="sm">Manage Members</Button>
                  <Button variant="ghost" size="sm">Edit</Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// Activity Log Component (Placeholder)
function ActivityLog() {
  return (
    <div className="text-center p-12 border rounded-lg">
      <FileIcon className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
      <h3 className="text-lg font-medium mb-2">Activity Log</h3>
      <p className="text-muted-foreground mb-4">
        Activity logging and audit trail is under development.
      </p>
    </div>
  );
}

// Helper function to format file size
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

// Safe date formatting function
function formatDate(dateString: string | Date | null | undefined, formatString: string = 'MMM d, yyyy'): string {
  if (!dateString) return 'N/A';
  
  try {
    const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
    return format(date, formatString);
  } catch (error) {
    console.error('Error formatting date:', error);
    return 'Invalid date';
  }
}