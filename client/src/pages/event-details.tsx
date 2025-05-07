import React, { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams, Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import Sidebar from "@/components/layout/sidebar";
import Header from "@/components/layout/header";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { 
  CalendarIcon, 
  Clock, 
  Download, 
  FileIcon, 
  FilePenLine,
  Upload,
  Film, 
  Image as ImageIcon, 
  Music, 
  Share, 
  Tag, 
  Users,
  ChevronLeft,
  Eye,
  X,
  Loader2,
  Plus
} from "lucide-react";
import { formatDate } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

// File Upload Dialog Component
interface UploadDialogProps {
  isOpen: boolean;
  onClose: () => void;
  eventId: number;
  eventName: string;
  onUploadSuccess: () => void;
}

function UploadFileDialog({ 
  isOpen, 
  onClose, 
  eventId, 
  eventName, 
  onUploadSuccess 
}: UploadDialogProps) {
  const { toast } = useToast();
  const [selectedFiles, setSelectedFiles] = useState<FileList | null>(null);
  const [watermarkEnabled, setWatermarkEnabled] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [completedUploads, setCompletedUploads] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Reset the state when the dialog is opened/closed
  useEffect(() => {
    if (!isOpen) {
      setSelectedFiles(null);
      setWatermarkEnabled(false);
      setUploadProgress(0);
      setCompletedUploads(0);
    }
  }, [isOpen]);
  
  const uploadMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      const response = await fetch('/api/media/files/upload', {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) {
        let errorMessage = 'Failed to upload file';
        try {
          const errorText = await response.text();
          // Try to parse as JSON first
          try {
            const errorJson = JSON.parse(errorText);
            errorMessage = errorJson.message || errorMessage;
          } catch (e) {
            // If not JSON, use as text if it exists
            if (errorText) errorMessage = errorText;
          }
        } catch (e) {
          console.error('Error parsing error response:', e);
        }
        throw new Error(errorMessage);
      }
      
      return await response.json();
    },
    onSuccess: () => {
      setCompletedUploads(prev => prev + 1);
      if (selectedFiles && completedUploads >= selectedFiles.length - 1) {
        toast({
          title: 'Upload complete',
          description: `${selectedFiles.length} files uploaded successfully`,
          variant: 'default',
        });
        setSelectedFiles(null);
        onClose();
        onUploadSuccess();
      }
    },
    onError: (error: Error) => {
      toast({
        title: 'Upload failed',
        description: error.message || 'Something went wrong while uploading your file.',
        variant: 'destructive',
      });
    },
  });
  
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setSelectedFiles(e.target.files);
    }
  };
  
  const openFileSelector = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedFiles || selectedFiles.length === 0) {
      toast({
        title: "No files selected",
        description: "Please select at least one file to upload.",
        variant: "destructive",
      });
      return;
    }
    
    setUploading(true);
    setUploadProgress(0);
    setCompletedUploads(0);
    
    try {
      // Create an array of promises to upload each file
      const uploadPromises = Array.from(selectedFiles).map(async (file) => {
        const formData = new FormData();
        formData.append('eventId', eventId.toString());
        formData.append('watermarkEnabled', watermarkEnabled.toString());
        formData.append('visibility', 'private');
        formData.append('file', file);
        
        await uploadMutation.mutateAsync(formData);
        
        // Update progress after each file is uploaded
        const newProgress = ((completedUploads + 1) / selectedFiles.length) * 100;
        setUploadProgress(newProgress);
      });
      
      // Wait for all uploads to complete
      await Promise.all(uploadPromises);
      
    } catch (error) {
      console.error('Upload error:', error);
    } finally {
      setUploading(false);
    }
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Upload Media Files</DialogTitle>
          <DialogDescription>
            Add files to "{eventName}"
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Hidden file input - actual input */}
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt"
            onChange={handleFileChange}
            className="hidden"
            disabled={uploading}
          />
          
          {/* File selection area */}
          <div 
            className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors
              ${selectedFiles ? 'border-primary bg-primary/5' : 'border-muted-foreground/20 hover:border-primary/50'}`}
            onClick={openFileSelector}
          >
            {selectedFiles && selectedFiles.length > 0 ? (
              <div className="space-y-2">
                <div className="flex flex-col items-center justify-center gap-2">
                  <div className="rounded-full bg-primary/10 p-2">
                    <FileIcon className="h-6 w-6 text-primary" />
                  </div>
                  <p className="text-sm font-medium">{selectedFiles.length} files selected</p>
                </div>
                
                {/* Preview of selected files */}
                <div className="mt-4 grid grid-cols-4 gap-2">
                  {Array.from(selectedFiles).slice(0, 8).map((file, index) => (
                    <div key={index} className="relative aspect-square bg-muted rounded-md overflow-hidden">
                      {file.type.startsWith('image/') ? (
                        <img 
                          src={URL.createObjectURL(file)} 
                          alt={`Preview ${index}`}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center">
                          {file.type.startsWith('video/') ? (
                            <Film className="h-6 w-6 text-primary" />
                          ) : file.type.startsWith('audio/') ? (
                            <Music className="h-6 w-6 text-primary" />
                          ) : (
                            <FileIcon className="h-6 w-6 text-primary" />
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                  {selectedFiles.length > 8 && (
                    <div className="flex aspect-square items-center justify-center bg-muted rounded-md">
                      <span className="text-sm font-medium">+{selectedFiles.length - 8} more</span>
                    </div>
                  )}
                </div>
                
                <p className="text-xs text-muted-foreground mt-2">Click to change selection</p>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center gap-1 py-4">
                <div className="rounded-full bg-primary/10 p-3">
                  <Upload className="h-6 w-6 text-primary" />
                </div>
                <p className="text-sm font-medium mt-2">Click to select files</p>
                <p className="text-xs text-muted-foreground">
                  or drag and drop files here
                </p>
                <p className="text-xs text-muted-foreground mt-2">
                  Supports images, videos, audio, and documents
                </p>
              </div>
            )}
          </div>
          
          {/* Options */}
          <div className="flex items-center space-x-2">
            <Switch
              id="watermark"
              checked={watermarkEnabled}
              onCheckedChange={setWatermarkEnabled}
              disabled={uploading}
            />
            <Label htmlFor="watermark">Apply watermark to images</Label>
          </div>
          
          {/* Upload progress */}
          {uploading && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Uploading files...</span>
                <span>{completedUploads} of {selectedFiles?.length || 0}</span>
              </div>
              <div className="w-full bg-secondary rounded-full h-2">
                <div 
                  className="bg-primary h-2 rounded-full transition-all duration-300" 
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          )}
          
          {/* Actions */}
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={uploading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={!selectedFiles || selectedFiles.length === 0 || uploading}
            >
              {uploading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="mr-2 h-4 w-4" />
                  Upload Files
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// Helper function to group files by date
function groupFilesByDate(files: any[]) {
  const groups: Record<string, any[]> = {};
  
  files.forEach(file => {
    // Format the date as YYYY-MM-DD to use as key
    const dateKey = format(new Date(file.uploadedAt), 'yyyy-MM-dd');
    if (!groups[dateKey]) {
      groups[dateKey] = [];
    }
    groups[dateKey].push(file);
  });
  
  // Sort the dates in reverse chronological order (newest first)
  return Object.entries(groups)
    .sort(([dateA], [dateB]) => new Date(dateB).getTime() - new Date(dateA).getTime())
    .map(([date, files]) => ({
      date,
      formattedDate: format(new Date(date), 'EEEE, MMMM d, yyyy'),
      files
    }));
}

export default function EventDetailsPage() {
  const { id } = useParams();
  const eventId = parseInt(id || "0");
  const { user } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("all");
  const [location, setLocation] = useLocation();
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [groupByDate, setGroupByDate] = useState(true);
  const queryClient = useQueryClient();

  // Fetch event details
  const { data: eventData, isLoading: eventLoading, error: eventError } = useQuery({
    queryKey: [`/api/media/events/${eventId}`],
    enabled: !!eventId && !isNaN(eventId),
  });

  // Fetch files associated with this event
  const { data: filesData, isLoading: filesLoading, error: filesError } = useQuery({
    queryKey: ['/api/media/files', { eventId, limit: 100 }],
    enabled: !!eventId && !isNaN(eventId),
  });

  // Function to refresh file list
  const refreshFiles = () => {
    queryClient.invalidateQueries({queryKey: ['/api/media/files', { eventId }]});
  };

  // Check if user is admin or editor
  const isAdminOrEditor = user?.role === 'admin' || user?.role === 'editor';

  // File type filters
  const fileTypes = {
    all: () => true,
    images: (file: any) => file.mimeType.startsWith('image/'),
    videos: (file: any) => file.mimeType.startsWith('video/'),
    audio: (file: any) => file.mimeType.startsWith('audio/'),
    documents: (file: any) => {
      const documentTypes = [
        'application/pdf', 
        'application/msword', 
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.ms-powerpoint',
        'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        'text/plain'
      ];
      return documentTypes.includes(file.mimeType);
    },
    other: (file: any) => {
      return !file.mimeType.startsWith('image/') && 
             !file.mimeType.startsWith('video/') && 
             !file.mimeType.startsWith('audio/') &&
             !['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
               'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
               'application/vnd.ms-powerpoint', 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
               'text/plain'].includes(file.mimeType);
    }
  };

  // Helper function to get file count by type
  const getFileCountByType = (type: keyof typeof fileTypes) => {
    if (!filesData?.files || filesData.files.length === 0) return 0;
    return filesData.files.filter(fileTypes[type]).length;
  };

  // Helper function to get file icon by mime type
  const getFileIcon = (mimeType: string) => {
    if (mimeType.startsWith('image/')) return <ImageIcon className="h-8 w-8 text-blue-500" />;
    if (mimeType.startsWith('video/')) return <Film className="h-8 w-8 text-red-500" />;
    if (mimeType.startsWith('audio/')) return <Music className="h-8 w-8 text-green-500" />;
    return <FileIcon className="h-8 w-8 text-gray-500" />;
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Render loading state
  if (eventLoading || filesLoading) {
    return (
      <div className="flex h-screen overflow-hidden bg-neutral-50">
        <Sidebar />
        <main className="flex-1 flex flex-col overflow-hidden">
          <Header />
          <div className="flex-1 overflow-auto p-6">
            <div className="flex items-center mb-6">
              <Link href="/media">
                <Button variant="ghost" size="sm">
                  <ChevronLeft className="mr-2 h-4 w-4" /> Back to Events
                </Button>
              </Link>
            </div>
            <div className="space-y-6">
              <div className="space-y-2">
                <Skeleton className="h-10 w-1/3" />
                <Skeleton className="h-4 w-1/2" />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Skeleton className="h-24 rounded-lg" />
                <Skeleton className="h-24 rounded-lg" />
                <Skeleton className="h-24 rounded-lg" />
                <Skeleton className="h-24 rounded-lg" />
              </div>
              <Skeleton className="h-64 rounded-lg" />
            </div>
          </div>
        </main>
      </div>
    );
  }

  // Render error state
  if (eventError || filesError) {
    return (
      <div className="flex h-screen overflow-hidden bg-neutral-50">
        <Sidebar />
        <main className="flex-1 flex flex-col overflow-hidden">
          <Header />
          <div className="flex-1 overflow-auto p-6">
            <div className="flex items-center mb-6">
              <Link href="/media">
                <Button variant="ghost" size="sm">
                  <ChevronLeft className="mr-2 h-4 w-4" /> Back to Events
                </Button>
              </Link>
            </div>
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <h2 className="text-2xl font-bold text-destructive mb-2">Error Loading Data</h2>
                <p className="text-muted-foreground mb-4">
                  {(eventError as Error)?.message || (filesError as Error)?.message || "Failed to load event details."}
                </p>
                <Button 
                  onClick={() => window.location.reload()}
                  variant="outline"
                >
                  Refresh Page
                </Button>
              </div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  // If event does not exist
  if (!eventData) {
    return (
      <div className="flex h-screen overflow-hidden bg-neutral-50">
        <Sidebar />
        <main className="flex-1 flex flex-col overflow-hidden">
          <Header />
          <div className="flex-1 overflow-auto p-6">
            <div className="flex items-center mb-6">
              <Link href="/media">
                <Button variant="ghost" size="sm">
                  <ChevronLeft className="mr-2 h-4 w-4" /> Back to Events
                </Button>
              </Link>
            </div>
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <h2 className="text-2xl font-bold mb-2">Event Not Found</h2>
                <p className="text-muted-foreground mb-4">
                  The event you are looking for does not exist or has been removed.
                </p>
                <Link href="/media">
                  <Button>
                    Return to Events
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  const event = eventData;
  const files = filesData?.files || [];
  const filteredFiles = files.filter(fileTypes[activeTab as keyof typeof fileTypes]);

  return (
    <div className="flex h-screen overflow-hidden bg-neutral-50">
      <Sidebar />
      <main className="flex-1 flex flex-col overflow-hidden">
        <Header />
        <div className="flex-1 overflow-auto p-6">
          {/* Upload Dialog */}
          <UploadFileDialog 
            isOpen={uploadDialogOpen} 
            onClose={() => setUploadDialogOpen(false)} 
            eventId={eventId}
            eventName={event.name}
            onUploadSuccess={refreshFiles}
          />
          
          {/* Back button and header */}
          <div className="flex items-center mb-6">
            <Link href="/media">
              <Button variant="ghost" size="sm">
                <ChevronLeft className="mr-2 h-4 w-4" /> Back to Events
              </Button>
            </Link>
          </div>

          {/* Event details */}
          <div className="space-y-6">
            <div>
              <h1 className="text-3xl font-bold">{event.name}</h1>
              <p className="text-muted-foreground mt-1">{event.description}</p>
            </div>

            {/* Event metadata */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card>
                <CardContent className="p-4 flex items-center space-x-4" title="Date of the event">
                  <div className="shrink-0 bg-primary/10 rounded-full p-2">
                    <CalendarIcon className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">Date</p>
                    <p className="text-sm text-muted-foreground">{formatDate(event.eventDate)}</p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4 flex items-center space-x-4" title="Department that organized this event">
                  <div className="shrink-0 bg-primary/10 rounded-full p-2">
                    <Users className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">Department</p>
                    <p className="text-sm text-muted-foreground">{event.department || "General"}</p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4 flex items-center space-x-4" title="Total number of files including images, videos, audio, and documents">
                  <div className="shrink-0 bg-primary/10 rounded-full p-2">
                    <FileIcon className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">Media Files</p>
                    <p className="text-sm text-muted-foreground">{files.length} files</p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4 flex items-center space-x-4" title="Tags associated with this event">
                  <div className="shrink-0 bg-primary/10 rounded-full p-2">
                    <Tag className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">Tags</p>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {event.tags && event.tags.length > 0 ? (
                        event.tags.map((tag: string, index: number) => (
                          <Badge 
                            key={index} 
                            variant="secondary" 
                            className="text-xs cursor-pointer hover:bg-primary/20 transition-colors"
                            onClick={() => {
                              // Add filter by tag functionality
                              toast({
                                title: `Filter by tag: ${tag}`,
                                description: "This feature will filter files by tag",
                                variant: "default"
                              });
                            }}
                          >
                            {tag}
                          </Badge>
                        ))
                      ) : (
                        <span className="text-sm text-muted-foreground">No tags</span>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Media files */}
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <h2 className="text-2xl font-bold">Media Files</h2>
                  <div className="flex items-center gap-2">
                    <div className="border rounded-md p-1 flex">
                      <Button 
                        variant={viewMode === "grid" ? "default" : "ghost"} 
                        size="sm" 
                        className="h-8 px-2" 
                        onClick={() => setViewMode("grid")}
                        title="Grid view"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-grid-2x2"><rect width="7" height="7" x="3" y="3" rx="1"/><rect width="7" height="7" x="14" y="3" rx="1"/><rect width="7" height="7" x="3" y="14" rx="1"/><rect width="7" height="7" x="14" y="14" rx="1"/></svg>
                      </Button>
                      <Button 
                        variant={viewMode === "list" ? "default" : "ghost"} 
                        size="sm" 
                        className="h-8 px-2" 
                        onClick={() => setViewMode("list")}
                        title="List view"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-list"><line x1="8" x2="21" y1="6" y2="6"/><line x1="8" x2="21" y1="12" y2="12"/><line x1="8" x2="21" y1="18" y2="18"/><line x1="3" x2="3.01" y1="6" y2="6"/><line x1="3" x2="3.01" y1="12" y2="12"/><line x1="3" x2="3.01" y1="18" y2="18"/></svg>
                      </Button>
                    </div>
                    <div className="flex items-center border rounded-md pl-2 pr-1 py-1 gap-2">
                      <span className="text-xs text-muted-foreground">Group by date</span>
                      <Switch
                        checked={groupByDate}
                        onCheckedChange={setGroupByDate}
                        size="sm"
                      />
                    </div>
                  </div>
                </div>
                {isAdminOrEditor && (
                  <Button
                    onClick={() => {
                      setUploadDialogOpen(true);
                    }}
                  >
                    <Upload className="mr-2 h-4 w-4" /> Upload Media
                  </Button>
                )}
              </div>

              {/* File type tabs */}
              <Tabs defaultValue="all" value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="grid grid-cols-6 mb-4">
                  <TabsTrigger value="all">
                    All ({files.length})
                  </TabsTrigger>
                  <TabsTrigger value="images">
                    Images ({getFileCountByType('images')})
                  </TabsTrigger>
                  <TabsTrigger value="videos">
                    Videos ({getFileCountByType('videos')})
                  </TabsTrigger>
                  <TabsTrigger value="audio">
                    Audio ({getFileCountByType('audio')})
                  </TabsTrigger>
                  <TabsTrigger value="documents">
                    Documents ({getFileCountByType('documents')})
                  </TabsTrigger>
                  <TabsTrigger value="other">
                    Other ({getFileCountByType('other')})
                  </TabsTrigger>
                </TabsList>

                {Object.keys(fileTypes).map((type) => (
                  <TabsContent key={type} value={type} className="m-0">
                    {filteredFiles.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-12 text-center">
                        <FileIcon className="h-12 w-12 text-muted-foreground mb-4" />
                        <h3 className="text-lg font-medium mb-2">No {type !== 'all' ? type : ''} Files Found</h3>
                        <p className="text-muted-foreground mb-6 max-w-md">
                          {`There are no ${type !== 'all' ? type : ''} files associated with this event yet.`}
                        </p>
                        {isAdminOrEditor && (
                          <Button
                            onClick={() => {
                              setUploadDialogOpen(true);
                            }}
                          >
                            <Upload className="mr-2 h-4 w-4" /> Upload Media
                          </Button>
                        )}
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                        {filteredFiles.map((file) => (
                          <Card key={file.id} className="overflow-hidden">
                            <div className="aspect-video bg-neutral-100 flex items-center justify-center">
                              {file.mimeType.startsWith('image/') ? (
                                <img 
                                  src={`/api/media/files/${file.id}/content`} 
                                  alt={file.originalFilename}
                                  className="object-cover w-full h-full"
                                  onError={(e) => {
                                    (e.target as HTMLImageElement).src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cGF0aCBkPSJNMTIgMjJDNi40NzcgMjIgMiAxNy41MjMgMiAxMkMyIDYuNDc3IDYuNDc3IDIgMTIgMkMxNy41MjMgMiAyMiA2LjQ3NyAyMiAxMkMyMiAxNy41MjMgMTcuNTIzIDIyIDEyIDIyWk0xMiAyMEMxNi40MTggMjAgMjAgMTYuNDE4IDIwIDEyQzIwIDcuNTgyIDE2LjQxOCA0IDEyIDRDNy41ODIgNCAxNi40MTggNyA0IDEyQzQgMTYuNDE4IDcuNTgyIDIwIDEyIDIwWk0xMSA3SDEzVjlIMTFWN1pNMTEgMTFIMTNWMTdIMTFWMTFaIiBmaWxsPSIjOTA5MDkwIi8+PC9zdmc+';
                                  }}
                                />
                              ) : file.mimeType.startsWith('video/') ? (
                                <div className="relative w-full h-full bg-black flex items-center justify-center">
                                  <div className="absolute inset-0 flex items-center justify-center">
                                    <Film className="h-12 w-12 text-white opacity-70" />
                                  </div>
                                </div>
                              ) : (
                                <div className="w-full h-full flex items-center justify-center">
                                  {getFileIcon(file.mimeType)}
                                </div>
                              )}
                            </div>
                            <CardContent className="p-4">
                              <h3 className="font-medium text-sm line-clamp-1" title={file.originalFilename}>
                                {file.originalFilename}
                              </h3>
                              <div className="flex justify-between items-center mt-2">
                                <span className="text-xs text-muted-foreground">
                                  {formatFileSize(file.size)}
                                </span>
                                <div className="text-xs text-muted-foreground">
                                  {formatDate(file.uploadedAt, 'MMM d, yyyy')}
                                </div>
                              </div>
                              <div className="flex items-center space-x-2 mt-4">
                                <Button 
                                  variant="outline" 
                                  size="sm" 
                                  className="w-full"
                                  onClick={() => {
                                    window.open(`/api/media/files/${file.id}/content`, '_blank');
                                  }}
                                >
                                  <Eye className="h-3 w-3 mr-1" /> View
                                </Button>
                                <Button 
                                  variant="outline" 
                                  size="sm" 
                                  className="w-full"
                                  onClick={() => {
                                    window.open(`/api/media/files/${file.id}/download`, '_blank');
                                  }}
                                >
                                  <Download className="h-3 w-3 mr-1" /> Download
                                </Button>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    )}
                  </TabsContent>
                ))}
              </Tabs>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}