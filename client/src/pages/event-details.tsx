import React, { useState } from "react";
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
  const [fileSections, setFileSections] = useState<{id: number, files: FileList | null}[]>([{ id: 1, files: null }]);
  const [watermarkEnabled, setWatermarkEnabled] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [totalFiles, setTotalFiles] = useState(0);
  const [uploadedFiles, setUploadedFiles] = useState(0);
  
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
      setUploadedFiles(prev => prev + 1);
      
      if (uploadedFiles >= totalFiles - 1) {
        toast({
          title: 'All files uploaded successfully',
          description: `${totalFiles} files have been uploaded to the event.`,
          variant: 'default',
        });
        setFileSections([{ id: 1, files: null }]);
        setWatermarkEnabled(false);
        setUploadProgress(0);
        setTotalFiles(0);
        setUploadedFiles(0);
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
  
  // Add a new section for file uploads
  const addFileSection = () => {
    setFileSections(prev => [...prev, { id: Date.now(), files: null }]);
  };
  
  // Remove a section
  const removeFileSection = (id: number) => {
    if (fileSections.length > 1) {
      setFileSections(prev => prev.filter(section => section.id !== id));
    }
  };
  
  const handleFileChange = (sectionId: number, e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFileSections(prev => prev.map(section => 
        section.id === sectionId ? { ...section, files: e.target.files } : section
      ));
    }
  };
  
  // Update preview of selected images
  const getFilePreview = (file: File) => {
    if (file.type.startsWith('image/')) {
      return URL.createObjectURL(file);
    } else if (file.type.startsWith('video/')) {
      return '/icons/video-icon.png'; // You would need to add these icons to your public folder
    } else if (file.type.startsWith('audio/')) {
      return '/icons/audio-icon.png';
    } else {
      return '/icons/file-icon.png';
    }
  };

  // Count total files selected
  const getTotalSelectedFiles = () => {
    let count = 0;
    fileSections.forEach(section => {
      if (section.files) {
        count += section.files.length;
      }
    });
    return count;
  };

  // Check if any files are selected
  const hasSelectedFiles = () => {
    return fileSections.some(section => section.files && section.files.length > 0);
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!hasSelectedFiles()) {
      toast({
        title: "No files selected",
        description: "Please select at least one file to upload.",
        variant: "destructive",
      });
      return;
    }
    
    setUploading(true);
    setUploadProgress(0);
    
    const totalFilesCount = getTotalSelectedFiles();
    setTotalFiles(totalFilesCount);
    setUploadedFiles(0);
    
    try {
      // Upload each file separately to track progress better
      const uploadPromises = fileSections.flatMap(section => {
        if (!section.files || section.files.length === 0) return [];
        
        return Array.from(section.files).map(async (file) => {
          const formData = new FormData();
          formData.append('eventId', eventId.toString());
          formData.append('watermarkEnabled', watermarkEnabled.toString());
          formData.append('visibility', 'private'); // Default visibility
          formData.append('file', file);
          
          await uploadMutation.mutateAsync(formData);
        });
      });
      
      // Wait for all uploads to complete
      await Promise.all(uploadPromises);
      
    } catch (error) {
      console.error('Upload error:', error);
    } finally {
      setUploading(false);
    }
  };
  
  const totalFilesSelected = getTotalSelectedFiles();
  
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Upload Media Files</DialogTitle>
          <DialogDescription>
            Add files to "{eventName}"
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            {fileSections.map((section, index) => (
              <div key={section.id} className="p-4 border rounded-md relative">
                <div className="grid w-full items-center gap-1.5">
                  <div className="flex justify-between items-center mb-2">
                    <Label htmlFor={`files-${section.id}`}>Section {index + 1}</Label>
                    {fileSections.length > 1 && (
                      <Button 
                        type="button" 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => removeFileSection(section.id)}
                        className="h-8 w-8 p-0"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                  <Input
                    id={`files-${section.id}`}
                    type="file"
                    multiple
                    accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt"
                    onChange={(e) => handleFileChange(section.id, e)}
                    disabled={uploading}
                    className="mb-2"
                  />
                  
                  {section.files && section.files.length > 0 && (
                    <div className="mt-2 grid grid-cols-4 gap-2">
                      {Array.from(section.files).slice(0, 12).map((file, fileIndex) => (
                        <div key={fileIndex} className="relative aspect-square bg-gray-100 rounded-md overflow-hidden">
                          {file.type.startsWith('image/') ? (
                            <img 
                              src={URL.createObjectURL(file)} 
                              alt={`Preview ${fileIndex}`}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              {file.type.startsWith('video/') ? (
                                <Film className="h-8 w-8 text-gray-500" />
                              ) : file.type.startsWith('audio/') ? (
                                <Music className="h-8 w-8 text-gray-500" />
                              ) : (
                                <FileIcon className="h-8 w-8 text-gray-500" />
                              )}
                            </div>
                          )}
                          <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-50 text-white text-xs p-1 truncate">
                            {file.name.length > 15 ? `${file.name.substring(0, 12)}...` : file.name}
                          </div>
                        </div>
                      ))}
                      {section.files.length > 12 && (
                        <div className="aspect-square bg-gray-100 rounded-md flex items-center justify-center">
                          <span className="text-sm font-medium">+{section.files.length - 12} more</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
            
            <Button
              type="button"
              variant="outline"
              onClick={addFileSection}
              disabled={uploading}
              className="w-full"
            >
              <Plus className="mr-2 h-4 w-4" />
              Add Another Section
            </Button>
            
            <div className="flex items-center space-x-2 mt-4">
              <Switch
                id="watermark"
                checked={watermarkEnabled}
                onCheckedChange={setWatermarkEnabled}
                disabled={uploading}
              />
              <Label htmlFor="watermark">Apply watermark to images</Label>
            </div>
            
            {uploading && (
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Uploading files...</span>
                  <span>{uploadedFiles} of {totalFiles}</span>
                </div>
                <div className="w-full bg-secondary rounded-full h-2.5">
                  <div 
                    className="bg-primary h-2.5 rounded-full transition-all duration-300" 
                    style={{ width: `${(uploadedFiles / totalFiles) * 100}%` }}
                  ></div>
                </div>
              </div>
            )}
          </div>
          
          <DialogFooter>
            <div className="flex items-center space-x-2 w-full justify-between">
              <div className="text-sm text-muted-foreground">
                {totalFilesSelected > 0 ? `${totalFilesSelected} files selected` : 'No files selected'}
              </div>
              <div className="flex space-x-2">
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
                  disabled={!hasSelectedFiles() || uploading}
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
              </div>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default function EventDetailsPage() {
  const { id } = useParams();
  const eventId = parseInt(id || "0");
  const { user } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("all");
  const [location, setLocation] = useLocation();
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
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
                <CardContent className="p-4 flex items-center space-x-4">
                  <CalendarIcon className="h-8 w-8 text-primary" />
                  <div>
                    <p className="text-sm font-medium">Date</p>
                    <p className="text-sm text-muted-foreground">{formatDate(event.eventDate)}</p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4 flex items-center space-x-4">
                  <Users className="h-8 w-8 text-primary" />
                  <div>
                    <p className="text-sm font-medium">Department</p>
                    <p className="text-sm text-muted-foreground">{event.department || "General"}</p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4 flex items-center space-x-4">
                  <FileIcon className="h-8 w-8 text-primary" />
                  <div>
                    <p className="text-sm font-medium">Media Files</p>
                    <p className="text-sm text-muted-foreground">{files.length} files</p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4 flex items-center space-x-4">
                  <Tag className="h-8 w-8 text-primary" />
                  <div>
                    <p className="text-sm font-medium">Tags</p>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {event.tags && event.tags.length > 0 ? (
                        event.tags.map((tag: string, index: number) => (
                          <Badge key={index} variant="secondary" className="text-xs">
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
                <h2 className="text-2xl font-bold">Media Files</h2>
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