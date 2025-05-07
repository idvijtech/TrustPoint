import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
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
  Eye
} from "lucide-react";
import { formatDate } from "@/lib/utils";

export default function EventDetailsPage() {
  const { id } = useParams();
  const eventId = parseInt(id);
  const { user } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("all");
  const [location, setLocation] = useLocation();

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
                      console.log(`Navigating to /media?uploadEvent=${eventId}`);
                      // Store the event ID in localStorage
                      localStorage.setItem('uploadEventId', eventId.toString());
                      // Navigate to media page
                      setLocation('/media');
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
                              console.log(`Navigating to /media from no files section`);
                              // Store the event ID in localStorage
                              localStorage.setItem('uploadEventId', eventId.toString());
                              // Navigate to media page
                              setLocation('/media');
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