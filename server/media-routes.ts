import { Router, Request, Response, NextFunction } from 'express';
import { db } from '@db';
import { 
  mediaEvents, 
  mediaFiles, 
  mediaGroups, 
  mediaGroupMembers, 
  mediaPermissions, 
  mediaShareLinks,
  mediaActivityLogs,
  mediaEventInsertSchema,
  mediaFileInsertSchema,
  mediaGroupInsertSchema,
  mediaShareLinkInsertSchema
} from '@shared/schema';
import { eq, and, like, desc, asc, or, isNull } from 'drizzle-orm';
import crypto from 'crypto';
import { promises as fs } from 'fs';
import path from 'path';
import { 
  uploadMiddleware, 
  storeFile, 
  deleteFile, 
  getFileUrl,
  isFileAccessibleByUser
} from './media-storage';

// Helper to check if a user is admin or editor
const isAdminOrEditor = (req: Request): boolean => {
  if (!req.isAuthenticated()) return false;
  return req.user.role === 'admin' || req.user.role === 'editor';
};

// Helper function to log media activity
const logMediaActivity = async (
  req: Request,
  action: string,
  details: any = {},
  fileId?: number,
  eventId?: number
) => {
  try {
    const userId = req.user?.id;
    const adminId = req.user?.role === 'admin' ? req.user?.id : null;
    
    await db.insert(mediaActivityLogs).values({
      userId: userId || null,
      adminId: adminId || null,
      fileId: fileId || null,
      eventId: eventId || null,
      action,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      details,
    });
  } catch (error) {
    console.error('Failed to log media activity:', error);
  }
};

// Create the router
export const mediaRouter = Router();

// Middleware to check if user is authenticated
const requireAuth = (req: Request, res: Response, next: NextFunction) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ message: 'Authentication required' });
  }
  next();
};

// Middleware to check if user is admin
const requireAdmin = (req: Request, res: Response, next: NextFunction) => {
  if (!req.isAuthenticated() || req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Admin access required' });
  }
  next();
};

// Middleware to check if user is admin or editor
const requireAdminOrEditor = (req: Request, res: Response, next: NextFunction) => {
  if (!req.isAuthenticated() || (req.user.role !== 'admin' && req.user.role !== 'editor')) {
    return res.status(403).json({ message: 'Admin or editor access required' });
  }
  next();
};

// === EVENTS API ===

// Get all events (with optional filtering)
mediaRouter.get('/events', async (req: Request, res: Response) => {
  try {
    const { 
      search, 
      department, 
      fromDate, 
      toDate, 
      tags,
      page = 1, 
      limit = 10 
    } = req.query;
    
    // Build query conditions
    let query = db.select().from(mediaEvents);
    
    if (search) {
      query = query.where(like(mediaEvents.name, `%${search}%`));
    }
    
    if (department) {
      query = query.where(eq(mediaEvents.department, department as string));
    }
    
    if (fromDate) {
      query = query.where(mediaEvents.eventDate >= new Date(fromDate as string));
    }
    
    if (toDate) {
      query = query.where(mediaEvents.eventDate <= new Date(toDate as string));
    }
    
    if (tags) {
      // Handle array of tags, checking if any tag matches
      const tagArray = Array.isArray(tags) 
        ? tags as string[] 
        : [tags as string];
      
      // Build a complex condition for array containment
      // This is simplified and might need adjustment based on your DB
      const tagConditions = tagArray.map(tag => 
        `${mediaEvents.tags.name}::text[] @> ARRAY['${tag}']::text[]`
      );
      
      // Apply tag conditions if any exist
      if (tagConditions.length > 0) {
        // This will need to be adapted to your SQL dialect
        // query = query.where(raw(tagConditions.join(' OR ')));
      }
    }
    
    // Check if user is admin/editor or apply public filter
    if (!isAdminOrEditor(req)) {
      query = query.where(eq(mediaEvents.isPublic, true));
    }
    
    // Get total count for pagination
    const countResult = await db
      .select({ count: db.fn.count() })
      .from(mediaEvents);
    
    const total = Number(countResult[0].count);
    
    // Apply pagination and ordering
    const offset = (Number(page) - 1) * Number(limit);
    const events = await query
      .orderBy(desc(mediaEvents.eventDate))
      .limit(Number(limit))
      .offset(offset);
    
    res.json({
      events,
      pagination: {
        total,
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil(total / Number(limit))
      }
    });
  } catch (error) {
    console.error('Error fetching events:', error);
    res.status(500).json({ message: 'Failed to fetch events' });
  }
});

// Get event by ID
mediaRouter.get('/events/:id', async (req: Request, res: Response) => {
  try {
    const eventId = parseInt(req.params.id);
    const event = await db.query.mediaEvents.findFirst({
      where: eq(mediaEvents.id, eventId),
    });
    
    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }
    
    // Check if user can access non-public event
    if (!event.isPublic && !isAdminOrEditor(req)) {
      return res.status(403).json({ message: 'Access denied' });
    }
    
    // Get files for this event
    const files = await db.query.mediaFiles.findMany({
      where: eq(mediaFiles.eventId, eventId),
      orderBy: desc(mediaFiles.uploadedAt),
    });
    
    // Filter files based on visibility and user permissions
    const accessibleFiles = files.filter(file => {
      if (file.visibility === 'public') return true;
      if (isAdminOrEditor(req)) return true;
      
      // For non-public files, would need to check permissions
      // This is simplified; would need a more complex query in production
      return false;
    });
    
    // Add URLs to files
    const filesWithUrls = accessibleFiles.map(file => ({
      ...file,
      url: getFileUrl(file)
    }));
    
    res.json({
      ...event,
      files: filesWithUrls
    });
    
    // Log the view
    await logMediaActivity(req, 'view_event', {}, null, event.id);
  } catch (error) {
    console.error('Error fetching event:', error);
    res.status(500).json({ message: 'Failed to fetch event details' });
  }
});

// Create new event (admin/editor only)
mediaRouter.post('/events', requireAdminOrEditor, async (req: Request, res: Response) => {
  try {
    const eventData = mediaEventInsertSchema.parse({
      ...req.body,
      createdBy: req.user.id
    });
    
    const [newEvent] = await db
      .insert(mediaEvents)
      .values(eventData)
      .returning();
    
    res.status(201).json(newEvent);
    
    // Log the creation
    await logMediaActivity(req, 'create_event', { eventData }, null, newEvent.id);
  } catch (error) {
    console.error('Error creating event:', error);
    res.status(400).json({ 
      message: 'Failed to create event',
      error: error.message 
    });
  }
});

// Update event (admin/editor only)
mediaRouter.patch('/events/:id', requireAdminOrEditor, async (req: Request, res: Response) => {
  try {
    const eventId = parseInt(req.params.id);
    
    // Check if event exists
    const existingEvent = await db.query.mediaEvents.findFirst({
      where: eq(mediaEvents.id, eventId),
    });
    
    if (!existingEvent) {
      return res.status(404).json({ message: 'Event not found' });
    }
    
    // Parse and validate update data
    const updateData = mediaEventInsertSchema.partial().parse(req.body);
    
    // Update the event
    const [updatedEvent] = await db
      .update(mediaEvents)
      .set(updateData)
      .where(eq(mediaEvents.id, eventId))
      .returning();
    
    res.json(updatedEvent);
    
    // Log the update
    await logMediaActivity(req, 'update_event', { updateData }, null, eventId);
  } catch (error) {
    console.error('Error updating event:', error);
    res.status(400).json({ 
      message: 'Failed to update event',
      error: error.message 
    });
  }
});

// Delete event (admin only)
mediaRouter.delete('/events/:id', requireAdmin, async (req: Request, res: Response) => {
  try {
    const eventId = parseInt(req.params.id);
    
    // Get event details for logging
    const event = await db.query.mediaEvents.findFirst({
      where: eq(mediaEvents.id, eventId),
    });
    
    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }
    
    // Find all files associated with this event
    const eventFiles = await db.query.mediaFiles.findMany({
      where: eq(mediaFiles.eventId, eventId),
    });
    
    // Delete all files first
    for (const file of eventFiles) {
      await deleteFile(file.id);
    }
    
    // Delete the event
    await db.delete(mediaEvents).where(eq(mediaEvents.id, eventId));
    
    res.json({ message: 'Event and associated files deleted successfully' });
    
    // Log the deletion
    await logMediaActivity(req, 'delete_event', { eventName: event.name });
  } catch (error) {
    console.error('Error deleting event:', error);
    res.status(500).json({ message: 'Failed to delete event' });
  }
});

// === FILES API ===

// Upload file(s) (admin/editor only)
mediaRouter.post(
  '/files/upload',
  requireAdminOrEditor,
  uploadMiddleware.array('files', 10),
  async (req: Request, res: Response) => {
    try {
      if (!req.files || !Array.isArray(req.files) || req.files.length === 0) {
        return res.status(400).json({ message: 'No files uploaded' });
      }
      
      const { 
        eventId, 
        visibility = 'private',
        password,
        watermarkEnabled,
        expiryDate,
        metadata 
      } = req.body;
      
      // Convert metadata from JSON string if provided
      let parsedMetadata = null;
      if (metadata) {
        try {
          parsedMetadata = typeof metadata === 'string' 
            ? JSON.parse(metadata)
            : metadata;
        } catch (e) {
          console.error('Invalid metadata JSON:', e);
        }
      }
      
      // Process each uploaded file
      const uploadedFiles = [];
      for (const file of req.files as Express.Multer.File[]) {
        const storedFile = await storeFile({
          file,
          eventId: eventId ? parseInt(eventId) : undefined,
          visibility,
          uploadedBy: req.user.id,
          password,
          expiryDate: expiryDate ? new Date(expiryDate) : undefined,
          watermarkEnabled: watermarkEnabled === 'true',
          metadata: parsedMetadata
        });
        
        uploadedFiles.push({
          ...storedFile,
          url: getFileUrl(storedFile)
        });
      }
      
      res.status(201).json({
        message: 'Files uploaded successfully',
        files: uploadedFiles
      });
      
      // Log the upload
      await logMediaActivity(req, 'upload_files', { 
        count: uploadedFiles.length,
        eventId: eventId ? parseInt(eventId) : null
      });
    } catch (error) {
      console.error('Error uploading files:', error);
      res.status(400).json({ 
        message: 'Failed to upload files',
        error: error.message 
      });
    }
  }
);

// Get file by ID
mediaRouter.get('/files/:id', async (req: Request, res: Response) => {
  try {
    const fileId = parseInt(req.params.id);
    const file = await db.query.mediaFiles.findFirst({
      where: eq(mediaFiles.id, fileId),
    });
    
    if (!file) {
      return res.status(404).json({ message: 'File not found' });
    }
    
    // Check access permissions
    const userId = req.user?.id;
    const isAdmin = req.user?.role === 'admin';
    const isEditor = req.user?.role === 'editor';
    
    if (file.visibility !== 'public' && !isAdmin && !isEditor) {
      const hasAccess = await isFileAccessibleByUser(fileId, userId);
      if (!hasAccess) {
        return res.status(403).json({ message: 'Access denied' });
      }
    }
    
    // Get associated event if any
    let event = null;
    if (file.eventId) {
      event = await db.query.mediaEvents.findFirst({
        where: eq(mediaEvents.id, file.eventId),
      });
    }
    
    // Return file with URL
    res.json({
      ...file,
      url: getFileUrl(file),
      event
    });
    
    // Log the view
    await logMediaActivity(req, 'view_file', {}, fileId);
    
    // Update view counter
    await db
      .update(mediaFiles)
      .set({ views: file.views + 1 })
      .where(eq(mediaFiles.id, fileId));
  } catch (error) {
    console.error('Error fetching file:', error);
    res.status(500).json({ message: 'Failed to fetch file details' });
  }
});

// Serve file content
mediaRouter.get('/files/:id/content', async (req: Request, res: Response) => {
  try {
    const fileId = parseInt(req.params.id);
    const file = await db.query.mediaFiles.findFirst({
      where: eq(mediaFiles.id, fileId),
    });
    
    if (!file) {
      return res.status(404).json({ message: 'File not found' });
    }
    
    // Check permissions for non-public files
    if (file.visibility !== 'public' && !isAdminOrEditor(req)) {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ message: 'Authentication required' });
      }
      
      const hasAccess = await isFileAccessibleByUser(fileId, userId);
      if (!hasAccess) {
        return res.status(403).json({ message: 'Access denied' });
      }
    }
    
    // Password protection check
    const { password } = req.query;
    if (file.password && file.password !== password) {
      return res.status(401).json({ message: 'Password required' });
    }
    
    // Expiry date check
    if (file.expiryDate && new Date() > new Date(file.expiryDate)) {
      return res.status(410).json({ message: 'File access has expired' });
    }
    
    // Handle file serving based on storage type
    if (file.storageType === 's3') {
      // For S3, redirect to the file URL
      return res.redirect(getFileUrl(file));
    } else {
      // For local storage, serve the file
      const filePath = path.join(process.cwd(), file.path);
      
      try {
        await fs.access(filePath);
      } catch (error) {
        return res.status(404).json({ message: 'File not found on disk' });
      }
      
      // Set content type and serve file
      res.setHeader('Content-Type', file.mimeType);
      res.setHeader('Content-Disposition', `inline; filename="${file.originalFilename}"`);
      
      // Stream the file
      const fileStream = fs.createReadStream(filePath);
      fileStream.pipe(res);
      
      // Log the download/view
      await logMediaActivity(req, 'access_file_content', {}, fileId);
      
      // Update views counter
      await db
        .update(mediaFiles)
        .set({ views: file.views + 1 })
        .where(eq(mediaFiles.id, fileId));
    }
  } catch (error) {
    console.error('Error serving file:', error);
    res.status(500).json({ message: 'Failed to serve file' });
  }
});

// Download file
mediaRouter.get('/files/:id/download', async (req: Request, res: Response) => {
  try {
    const fileId = parseInt(req.params.id);
    const file = await db.query.mediaFiles.findFirst({
      where: eq(mediaFiles.id, fileId),
    });
    
    if (!file) {
      return res.status(404).json({ message: 'File not found' });
    }
    
    // Check permissions for non-public files
    if (file.visibility !== 'public' && !isAdminOrEditor(req)) {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ message: 'Authentication required' });
      }
      
      const hasAccess = await isFileAccessibleByUser(fileId, userId);
      if (!hasAccess) {
        return res.status(403).json({ message: 'Access denied' });
      }
    }
    
    // Password protection check
    const { password } = req.query;
    if (file.password && file.password !== password) {
      return res.status(401).json({ message: 'Password required' });
    }
    
    // Expiry date check
    if (file.expiryDate && new Date() > new Date(file.expiryDate)) {
      return res.status(410).json({ message: 'File access has expired' });
    }
    
    // Handle file serving based on storage type
    if (file.storageType === 's3') {
      // For S3, redirect to the file URL
      return res.redirect(getFileUrl(file));
    } else {
      // For local storage, serve the file
      const filePath = path.join(process.cwd(), file.path);
      
      try {
        await fs.access(filePath);
      } catch (error) {
        return res.status(404).json({ message: 'File not found on disk' });
      }
      
      // Set content type and disposition for download
      res.setHeader('Content-Type', file.mimeType);
      res.setHeader('Content-Disposition', `attachment; filename="${file.originalFilename}"`);
      
      // Stream the file
      const fileStream = fs.createReadStream(filePath);
      fileStream.pipe(res);
      
      // Log the download
      await logMediaActivity(req, 'download_file', {}, fileId);
      
      // Update download counter
      await db
        .update(mediaFiles)
        .set({ downloads: file.downloads + 1 })
        .where(eq(mediaFiles.id, fileId));
    }
  } catch (error) {
    console.error('Error downloading file:', error);
    res.status(500).json({ message: 'Failed to download file' });
  }
});

// Update file metadata (admin/editor only)
mediaRouter.patch('/files/:id', requireAdminOrEditor, async (req: Request, res: Response) => {
  try {
    const fileId = parseInt(req.params.id);
    
    // Check if file exists
    const existingFile = await db.query.mediaFiles.findFirst({
      where: eq(mediaFiles.id, fileId),
    });
    
    if (!existingFile) {
      return res.status(404).json({ message: 'File not found' });
    }
    
    // Parse and validate update data
    const updateData = mediaFileInsertSchema.partial().parse(req.body);
    
    // Update the file
    const [updatedFile] = await db
      .update(mediaFiles)
      .set(updateData)
      .where(eq(mediaFiles.id, fileId))
      .returning();
    
    res.json({
      ...updatedFile,
      url: getFileUrl(updatedFile)
    });
    
    // Log the update
    await logMediaActivity(req, 'update_file', { updateData }, fileId);
  } catch (error) {
    console.error('Error updating file:', error);
    res.status(400).json({ 
      message: 'Failed to update file',
      error: error.message 
    });
  }
});

// Delete file (admin/editor only)
mediaRouter.delete('/files/:id', requireAdminOrEditor, async (req: Request, res: Response) => {
  try {
    const fileId = parseInt(req.params.id);
    
    // Get file details for logging
    const file = await db.query.mediaFiles.findFirst({
      where: eq(mediaFiles.id, fileId),
    });
    
    if (!file) {
      return res.status(404).json({ message: 'File not found' });
    }
    
    // Delete file from storage and database
    const success = await deleteFile(fileId);
    
    if (success) {
      res.json({ message: 'File deleted successfully' });
      
      // Log the deletion
      await logMediaActivity(req, 'delete_file', { 
        filename: file.originalFilename
      });
    } else {
      res.status(500).json({ message: 'Failed to delete file' });
    }
  } catch (error) {
    console.error('Error deleting file:', error);
    res.status(500).json({ message: 'Failed to delete file' });
  }
});

// === SHARE LINKS API ===

// Create a share link for a file (admin/editor only)
mediaRouter.post('/share-links', requireAdminOrEditor, async (req: Request, res: Response) => {
  try {
    const { fileId, password, expiryDate, maxViews } = req.body;
    
    // Check if file exists
    const file = await db.query.mediaFiles.findFirst({
      where: eq(mediaFiles.id, parseInt(fileId)),
    });
    
    if (!file) {
      return res.status(404).json({ message: 'File not found' });
    }
    
    // Generate a random token
    const token = crypto.randomBytes(32).toString('hex');
    
    // Create share link
    const [shareLink] = await db
      .insert(mediaShareLinks)
      .values({
        fileId: parseInt(fileId),
        token,
        password: password || null,
        expiryDate: expiryDate ? new Date(expiryDate) : null,
        maxViews: maxViews ? parseInt(maxViews) : null,
        createdBy: req.user.id
      })
      .returning();
    
    // Generate the full share URL
    const shareUrl = `${req.protocol}://${req.get('host')}/api/media/shared/${token}`;
    
    res.status(201).json({
      ...shareLink,
      shareUrl
    });
    
    // Log the creation
    await logMediaActivity(req, 'create_share_link', { fileId }, parseInt(fileId));
  } catch (error) {
    console.error('Error creating share link:', error);
    res.status(400).json({ 
      message: 'Failed to create share link',
      error: error.message 
    });
  }
});

// Access shared file via token
mediaRouter.get('/shared/:token', async (req: Request, res: Response) => {
  try {
    const { token } = req.params;
    const { password } = req.query;
    
    // Find the share link
    const shareLink = await db.query.mediaShareLinks.findFirst({
      where: eq(mediaShareLinks.token, token),
    });
    
    if (!shareLink) {
      return res.status(404).json({ message: 'Shared link not found or expired' });
    }
    
    // Check password if required
    if (shareLink.password && shareLink.password !== password) {
      return res.status(401).json({ 
        message: 'Password required',
        passwordRequired: true
      });
    }
    
    // Check expiry date
    if (shareLink.expiryDate && new Date() > new Date(shareLink.expiryDate)) {
      return res.status(410).json({ message: 'Shared link has expired' });
    }
    
    // Check max views
    if (shareLink.maxViews && shareLink.views >= shareLink.maxViews) {
      return res.status(410).json({ message: 'Shared link view limit reached' });
    }
    
    // Get the file
    const file = await db.query.mediaFiles.findFirst({
      where: eq(mediaFiles.id, shareLink.fileId),
    });
    
    if (!file) {
      return res.status(404).json({ message: 'File not found' });
    }
    
    // Increment view counter for the share link
    await db
      .update(mediaShareLinks)
      .set({ views: shareLink.views + 1 })
      .where(eq(mediaShareLinks.id, shareLink.id));
    
    // Return metadata about the file
    res.json({
      file: {
        ...file,
        url: `/api/media/shared/${token}/content${password ? `?password=${password}` : ''}`
      },
      shareLink: {
        ...shareLink,
        password: undefined // Don't expose password
      }
    });
    
    // Log the access
    await logMediaActivity(req, 'access_shared_link', { token }, file.id);
  } catch (error) {
    console.error('Error accessing shared file:', error);
    res.status(500).json({ message: 'Failed to access shared file' });
  }
});

// Serve shared file content
mediaRouter.get('/shared/:token/content', async (req: Request, res: Response) => {
  try {
    const { token } = req.params;
    const { password } = req.query;
    
    // Find the share link
    const shareLink = await db.query.mediaShareLinks.findFirst({
      where: eq(mediaShareLinks.token, token),
    });
    
    if (!shareLink) {
      return res.status(404).json({ message: 'Shared link not found or expired' });
    }
    
    // Check password if required
    if (shareLink.password && shareLink.password !== password) {
      return res.status(401).json({ message: 'Password required' });
    }
    
    // Check expiry date
    if (shareLink.expiryDate && new Date() > new Date(shareLink.expiryDate)) {
      return res.status(410).json({ message: 'Shared link has expired' });
    }
    
    // Check max views
    if (shareLink.maxViews && shareLink.views >= shareLink.maxViews) {
      return res.status(410).json({ message: 'Shared link view limit reached' });
    }
    
    // Get the file
    const file = await db.query.mediaFiles.findFirst({
      where: eq(mediaFiles.id, shareLink.fileId),
    });
    
    if (!file) {
      return res.status(404).json({ message: 'File not found' });
    }
    
    // Handle file serving based on storage type
    if (file.storageType === 's3') {
      // For S3, redirect to the file URL
      return res.redirect(getFileUrl(file));
    } else {
      // For local storage, serve the file
      const filePath = path.join(process.cwd(), file.path);
      
      try {
        await fs.access(filePath);
      } catch (error) {
        return res.status(404).json({ message: 'File not found on disk' });
      }
      
      // Set content type and serve file
      res.setHeader('Content-Type', file.mimeType);
      res.setHeader('Content-Disposition', `inline; filename="${file.originalFilename}"`);
      
      // Stream the file
      const fileStream = fs.createReadStream(filePath);
      fileStream.pipe(res);
      
      // Update view counters
      await db
        .update(mediaShareLinks)
        .set({ views: shareLink.views + 1 })
        .where(eq(mediaShareLinks.id, shareLink.id));
      
      await db
        .update(mediaFiles)
        .set({ views: file.views + 1 })
        .where(eq(mediaFiles.id, file.id));
      
      // Log the access
      await logMediaActivity(req, 'access_shared_content', { token }, file.id);
    }
  } catch (error) {
    console.error('Error serving shared file:', error);
    res.status(500).json({ message: 'Failed to serve shared file' });
  }
});

// Delete share link (admin/creator only)
mediaRouter.delete('/share-links/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    const linkId = parseInt(req.params.id);
    
    // Get link details for validation
    const shareLink = await db.query.mediaShareLinks.findFirst({
      where: eq(mediaShareLinks.id, linkId),
    });
    
    if (!shareLink) {
      return res.status(404).json({ message: 'Share link not found' });
    }
    
    // Only allow admin or the creator to delete
    if (req.user.role !== 'admin' && shareLink.createdBy !== req.user.id) {
      return res.status(403).json({ message: 'You do not have permission to delete this link' });
    }
    
    // Delete the share link
    await db.delete(mediaShareLinks).where(eq(mediaShareLinks.id, linkId));
    
    res.json({ message: 'Share link deleted successfully' });
    
    // Log the deletion
    await logMediaActivity(req, 'delete_share_link', { linkId });
  } catch (error) {
    console.error('Error deleting share link:', error);
    res.status(500).json({ message: 'Failed to delete share link' });
  }
});

// === GROUPS AND PERMISSIONS API ===

// Get all groups (admin/editor only)
mediaRouter.get('/groups', requireAdminOrEditor, async (req: Request, res: Response) => {
  try {
    const groups = await db.query.mediaGroups.findMany({
      orderBy: asc(mediaGroups.name),
    });
    
    res.json(groups);
  } catch (error) {
    console.error('Error fetching groups:', error);
    res.status(500).json({ message: 'Failed to fetch groups' });
  }
});

// Create a new group (admin only)
mediaRouter.post('/groups', requireAdmin, async (req: Request, res: Response) => {
  try {
    const groupData = mediaGroupInsertSchema.parse({
      ...req.body,
      createdBy: req.user.id
    });
    
    const [newGroup] = await db
      .insert(mediaGroups)
      .values(groupData)
      .returning();
    
    res.status(201).json(newGroup);
    
    // Log the creation
    await logMediaActivity(req, 'create_group', { groupName: newGroup.name });
  } catch (error) {
    console.error('Error creating group:', error);
    res.status(400).json({ 
      message: 'Failed to create group',
      error: error.message 
    });
  }
});

// Get group members (admin/editor only)
mediaRouter.get('/groups/:id/members', requireAdminOrEditor, async (req: Request, res: Response) => {
  try {
    const groupId = parseInt(req.params.id);
    
    // Check if group exists
    const group = await db.query.mediaGroups.findFirst({
      where: eq(mediaGroups.id, groupId),
    });
    
    if (!group) {
      return res.status(404).json({ message: 'Group not found' });
    }
    
    // Get all members with user details
    const members = await db
      .select()
      .from(mediaGroupMembers)
      .innerJoin('users', 'mediaGroupMembers.userId = users.id')
      .where(eq(mediaGroupMembers.groupId, groupId));
    
    res.json(members.map(m => ({
      id: m.mediaGroupMembers.id,
      userId: m.mediaGroupMembers.userId,
      groupId: m.mediaGroupMembers.groupId,
      role: m.mediaGroupMembers.role,
      addedAt: m.mediaGroupMembers.addedAt,
      user: {
        id: m.users.id,
        firstName: m.users.firstName,
        lastName: m.users.lastName,
        email: m.users.email,
        department: m.users.department,
      }
    })));
  } catch (error) {
    console.error('Error fetching group members:', error);
    res.status(500).json({ message: 'Failed to fetch group members' });
  }
});

// Add user to group (admin only)
mediaRouter.post('/groups/:id/members', requireAdmin, async (req: Request, res: Response) => {
  try {
    const groupId = parseInt(req.params.id);
    const { userId, role = 'member' } = req.body;
    
    // Check if group exists
    const group = await db.query.mediaGroups.findFirst({
      where: eq(mediaGroups.id, groupId),
    });
    
    if (!group) {
      return res.status(404).json({ message: 'Group not found' });
    }
    
    // Check if user exists
    const user = await db.query.users.findFirst({
      where: eq(users.id, parseInt(userId)),
    });
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Check if user is already in the group
    const existingMember = await db.query.mediaGroupMembers.findFirst({
      where: and(
        eq(mediaGroupMembers.groupId, groupId),
        eq(mediaGroupMembers.userId, parseInt(userId))
      ),
    });
    
    if (existingMember) {
      return res.status(400).json({ message: 'User is already a member of this group' });
    }
    
    // Add user to group
    const [newMember] = await db
      .insert(mediaGroupMembers)
      .values({
        groupId,
        userId: parseInt(userId),
        role,
        addedBy: req.user.id
      })
      .returning();
    
    res.status(201).json(newMember);
    
    // Log the addition
    await logMediaActivity(req, 'add_group_member', { 
      groupId,
      userId,
      role
    });
  } catch (error) {
    console.error('Error adding user to group:', error);
    res.status(400).json({ 
      message: 'Failed to add user to group',
      error: error.message 
    });
  }
});

// Remove user from group (admin only)
mediaRouter.delete('/groups/:groupId/members/:memberId', requireAdmin, async (req: Request, res: Response) => {
  try {
    const groupId = parseInt(req.params.groupId);
    const memberId = parseInt(req.params.memberId);
    
    // Check if member exists
    const member = await db.query.mediaGroupMembers.findFirst({
      where: and(
        eq(mediaGroupMembers.id, memberId),
        eq(mediaGroupMembers.groupId, groupId)
      ),
    });
    
    if (!member) {
      return res.status(404).json({ message: 'Group member not found' });
    }
    
    // Remove user from group
    await db
      .delete(mediaGroupMembers)
      .where(eq(mediaGroupMembers.id, memberId));
    
    res.json({ message: 'User removed from group successfully' });
    
    // Log the removal
    await logMediaActivity(req, 'remove_group_member', { 
      groupId,
      userId: member.userId
    });
  } catch (error) {
    console.error('Error removing user from group:', error);
    res.status(500).json({ message: 'Failed to remove user from group' });
  }
});

// Get file permissions (admin/editor only)
mediaRouter.get('/files/:id/permissions', requireAdminOrEditor, async (req: Request, res: Response) => {
  try {
    const fileId = parseInt(req.params.id);
    
    // Check if file exists
    const file = await db.query.mediaFiles.findFirst({
      where: eq(mediaFiles.id, fileId),
    });
    
    if (!file) {
      return res.status(404).json({ message: 'File not found' });
    }
    
    // Get all permissions
    const permissions = await db.query.mediaPermissions.findMany({
      where: eq(mediaPermissions.fileId, fileId),
    });
    
    // Organize permissions by type (user or group)
    const userPermissions = [];
    const groupPermissions = [];
    
    for (const perm of permissions) {
      if (perm.userId) {
        // Get user details
        const user = await db.query.users.findFirst({
          where: eq(users.id, perm.userId),
        });
        
        if (user) {
          userPermissions.push({
            ...perm,
            user: {
              id: user.id,
              firstName: user.firstName,
              lastName: user.lastName,
              email: user.email,
            }
          });
        }
      } else if (perm.groupId) {
        // Get group details
        const group = await db.query.mediaGroups.findFirst({
          where: eq(mediaGroups.id, perm.groupId),
        });
        
        if (group) {
          groupPermissions.push({
            ...perm,
            group
          });
        }
      }
    }
    
    res.json({
      fileId,
      userPermissions,
      groupPermissions
    });
  } catch (error) {
    console.error('Error fetching file permissions:', error);
    res.status(500).json({ message: 'Failed to fetch file permissions' });
  }
});

// Grant permissions for a file (admin/editor only)
mediaRouter.post('/files/:id/permissions', requireAdminOrEditor, async (req: Request, res: Response) => {
  try {
    const fileId = parseInt(req.params.id);
    const { userId, groupId, canView = true, canDownload = false, canShare = false } = req.body;
    
    // Check if file exists
    const file = await db.query.mediaFiles.findFirst({
      where: eq(mediaFiles.id, fileId),
    });
    
    if (!file) {
      return res.status(404).json({ message: 'File not found' });
    }
    
    // Check that either userId or groupId is provided, but not both
    if ((!userId && !groupId) || (userId && groupId)) {
      return res.status(400).json({ 
        message: 'Either a userId or groupId must be provided, but not both' 
      });
    }
    
    // Check if user exists
    if (userId) {
      const user = await db.query.users.findFirst({
        where: eq(users.id, parseInt(userId)),
      });
      
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }
    }
    
    // Check if group exists
    if (groupId) {
      const group = await db.query.mediaGroups.findFirst({
        where: eq(mediaGroups.id, parseInt(groupId)),
      });
      
      if (!group) {
        return res.status(404).json({ message: 'Group not found' });
      }
    }
    
    // Check if permission already exists
    const existingPermission = await db.query.mediaPermissions.findFirst({
      where: and(
        eq(mediaPermissions.fileId, fileId),
        userId ? eq(mediaPermissions.userId, parseInt(userId)) : isNull(mediaPermissions.userId),
        groupId ? eq(mediaPermissions.groupId, parseInt(groupId)) : isNull(mediaPermissions.groupId)
      ),
    });
    
    if (existingPermission) {
      // Update existing permission
      const [updatedPermission] = await db
        .update(mediaPermissions)
        .set({
          canView,
          canDownload,
          canShare
        })
        .where(eq(mediaPermissions.id, existingPermission.id))
        .returning();
      
      res.json(updatedPermission);
      
      // Log the update
      await logMediaActivity(req, 'update_permission', {
        fileId,
        userId: userId ? parseInt(userId) : null,
        groupId: groupId ? parseInt(groupId) : null,
        permissions: { canView, canDownload, canShare }
      }, fileId);
    } else {
      // Create new permission
      const [newPermission] = await db
        .insert(mediaPermissions)
        .values({
          fileId,
          userId: userId ? parseInt(userId) : null,
          groupId: groupId ? parseInt(groupId) : null,
          canView,
          canDownload,
          canShare,
          grantedBy: req.user.id
        })
        .returning();
      
      res.status(201).json(newPermission);
      
      // Log the creation
      await logMediaActivity(req, 'grant_permission', {
        fileId,
        userId: userId ? parseInt(userId) : null,
        groupId: groupId ? parseInt(groupId) : null,
        permissions: { canView, canDownload, canShare }
      }, fileId);
    }
  } catch (error) {
    console.error('Error granting file permissions:', error);
    res.status(400).json({ 
      message: 'Failed to grant file permissions',
      error: error.message 
    });
  }
});

// Revoke permissions for a file (admin/editor only)
mediaRouter.delete('/permissions/:id', requireAdminOrEditor, async (req: Request, res: Response) => {
  try {
    const permissionId = parseInt(req.params.id);
    
    // Check if permission exists
    const permission = await db.query.mediaPermissions.findFirst({
      where: eq(mediaPermissions.id, permissionId),
    });
    
    if (!permission) {
      return res.status(404).json({ message: 'Permission not found' });
    }
    
    // Delete the permission
    await db.delete(mediaPermissions).where(eq(mediaPermissions.id, permissionId));
    
    res.json({ message: 'Permission revoked successfully' });
    
    // Log the deletion
    await logMediaActivity(req, 'revoke_permission', {
      fileId: permission.fileId,
      userId: permission.userId,
      groupId: permission.groupId
    }, permission.fileId);
  } catch (error) {
    console.error('Error revoking permission:', error);
    res.status(500).json({ message: 'Failed to revoke permission' });
  }
});

// === STATS AND REPORTS API ===

// Get media dashboard stats (admin/editor only)
mediaRouter.get('/dashboard/stats', requireAdminOrEditor, async (req: Request, res: Response) => {
  try {
    // Get total counts
    const [eventsCount] = await db
      .select({ count: db.fn.count() })
      .from(mediaEvents);
    
    const [filesCount] = await db
      .select({ count: db.fn.count() })
      .from(mediaFiles);
    
    const [groupsCount] = await db
      .select({ count: db.fn.count() })
      .from(mediaGroups);
    
    // Get total size of all files
    const [sizeResult] = await db
      .select({ totalSize: db.fn.sum(mediaFiles.size) })
      .from(mediaFiles);
    
    // Get top events by file count
    const topEvents = await db
      .select({
        eventId: mediaFiles.eventId,
        eventName: mediaEvents.name,
        count: db.fn.count()
      })
      .from(mediaFiles)
      .innerJoin('mediaEvents', 'mediaFiles.eventId = mediaEvents.id')
      .groupBy(mediaFiles.eventId, mediaEvents.name)
      .orderBy(desc(db.fn.count()))
      .limit(5);
    
    // Get most viewed files
    const topFiles = await db
      .select()
      .from(mediaFiles)
      .orderBy(desc(mediaFiles.views))
      .limit(5);
    
    // Get recent activity
    const recentActivity = await db
      .select()
      .from(mediaActivityLogs)
      .orderBy(desc(mediaActivityLogs.timestamp))
      .limit(10);
    
    // Format storage size to human-readable format
    const totalSize = sizeResult.totalSize ? parseInt(sizeResult.totalSize) : 0;
    const formattedSize = formatFileSize(totalSize);
    
    res.json({
      totalEvents: eventsCount.count,
      totalFiles: filesCount.count,
      totalGroups: groupsCount.count,
      storageUsed: {
        bytes: totalSize,
        formatted: formattedSize
      },
      topEvents,
      topFiles: topFiles.map(file => ({
        ...file,
        url: getFileUrl(file)
      })),
      recentActivity
    });
  } catch (error) {
    console.error('Error fetching media stats:', error);
    res.status(500).json({ message: 'Failed to fetch media statistics' });
  }
});

// Helper function to format file size
function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}