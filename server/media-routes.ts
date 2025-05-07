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
  admins
} from '@shared/schema';
import { and, eq, desc, or, sql, asc, like, gte, lte, isNull } from 'drizzle-orm';
import { randomBytes } from 'crypto';
import {
  uploadMiddleware,
  storeFile,
  deleteFile,
  getFileUrl,
  isFileAccessibleByUser,
  getFileStream,
  verifyPassword,
  formatFileSize
} from './media-storage';
import path from 'path';

const isAdminOrEditor = (req: Request): boolean => {
  if (!req.user) return false;
  return ['admin', 'editor'].includes((req.user as any).role);
};

export const mediaRouter = Router();

// Auth middleware
const requireAuth = (req: Request, res: Response, next: NextFunction) => {
  if (!req.user) {
    return res.status(401).json({ message: 'Authentication required' });
  }
  next();
};

const requireAdmin = (req: Request, res: Response, next: NextFunction) => {
  if (!req.user || (req.user as any).role !== 'admin') {
    return res.status(403).json({ message: 'Admin privileges required' });
  }
  next();
};

const requireAdminOrEditor = (req: Request, res: Response, next: NextFunction) => {
  if (!req.user || !['admin', 'editor'].includes((req.user as any).role)) {
    return res.status(403).json({ message: 'Admin or editor privileges required' });
  }
  next();
};

// Event endpoints
mediaRouter.get('/events', async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const offset = (page - 1) * limit;
    const search = req.query.search as string;
    const department = req.query.department as string;
    const startDate = req.query.startDate as string;
    const endDate = req.query.endDate as string;
    
    // Build query
    let query = db.select().from(mediaEvents);
    let countQuery = db.select({ count: sql`count(*)` }).from(mediaEvents);
    
    // Apply filters
    const filters = [];
    
    if (search) {
      filters.push(or(
        like(mediaEvents.name, `%${search}%`),
        like(mediaEvents.description || '', `%${search}%`)
      ));
    }
    
    if (department) {
      filters.push(eq(mediaEvents.department || '', department));
    }
    
    if (startDate) {
      filters.push(gte(mediaEvents.eventDate, new Date(startDate)));
    }
    
    if (endDate) {
      filters.push(lte(mediaEvents.eventDate, new Date(endDate)));
    }
    
    // Only show public events to non-admins/editors
    if (!isAdminOrEditor(req)) {
      filters.push(eq(mediaEvents.isPublic, true));
    }
    
    if (filters.length > 0) {
      const whereClause = filters.length === 1 ? filters[0] : and(...filters);
      query = query.where(whereClause);
      countQuery = countQuery.where(whereClause);
    }
    
    // Apply pagination and sorting
    query = query.orderBy(desc(mediaEvents.eventDate)).limit(limit).offset(offset);
    
    const [events, countResult] = await Promise.all([
      query,
      countQuery
    ]);
    
    const total = Number(countResult[0]?.count || '0');
    
    res.json({
      events,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching events:', error);
    res.status(500).json({ message: 'Failed to fetch events' });
  }
});

mediaRouter.get('/events/:id', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const event = await db.query.mediaEvents.findFirst({
      where: eq(mediaEvents.id, id),
      with: {
        createdByAdmin: true
      }
    });
    
    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }
    
    // Check access for non-public events
    if (!event.isPublic && !isAdminOrEditor(req)) {
      return res.status(403).json({ message: 'Access denied' });
    }
    
    // Get files for this event
    const files = await db.query.mediaFiles.findMany({
      where: eq(mediaFiles.eventId, id)
    });
    
    // For non-admins, filter out non-public files
    const accessibleFiles = isAdminOrEditor(req)
      ? files
      : files.filter(file => file.visibility === 'public');
    
    // Add URLs to files
    const filesWithUrls = accessibleFiles.map(file => ({
      ...file,
      url: getFileUrl(file)
    }));
    
    res.json({
      ...event,
      files: filesWithUrls
    });
  } catch (error) {
    console.error('Error fetching event:', error);
    res.status(500).json({ message: 'Failed to fetch event details' });
  }
});

mediaRouter.post('/events', requireAdminOrEditor, async (req: Request, res: Response) => {
  try {
    const adminId = (req.user as any).id;
    const eventData = {
      ...req.body,
      eventDate: new Date(req.body.eventDate),
      createdBy: adminId
    };
    
    const [newEvent] = await db.insert(mediaEvents).values(eventData).returning();
    
    // Log activity
    await db.insert(mediaActivityLogs).values({
      adminId,
      eventId: newEvent.id,
      action: 'create_event',
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      details: { eventName: newEvent.name }
    });
    
    res.status(201).json(newEvent);
  } catch (error) {
    console.error('Error creating event:', error);
    res.status(500).json({ message: 'Failed to create event' });
  }
});

mediaRouter.patch('/events/:id', requireAdminOrEditor, async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const adminId = (req.user as any).id;
    
    // Check if event exists
    const existingEvent = await db.query.mediaEvents.findFirst({
      where: eq(mediaEvents.id, id)
    });
    
    if (!existingEvent) {
      return res.status(404).json({ message: 'Event not found' });
    }
    
    // Prepare update data
    const updateData = { ...req.body };
    if (updateData.eventDate) {
      updateData.eventDate = new Date(updateData.eventDate);
    }
    
    // Update event
    const [updatedEvent] = await db.update(mediaEvents)
      .set(updateData)
      .where(eq(mediaEvents.id, id))
      .returning();
    
    // Log activity
    await db.insert(mediaActivityLogs).values({
      adminId,
      eventId: id,
      action: 'update_event',
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      details: { eventName: updatedEvent.name }
    });
    
    res.json(updatedEvent);
  } catch (error) {
    console.error('Error updating event:', error);
    res.status(500).json({ message: 'Failed to update event' });
  }
});

mediaRouter.delete('/events/:id', requireAdmin, async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const adminId = (req.user as any).id;
    
    // Check if event exists
    const existingEvent = await db.query.mediaEvents.findFirst({
      where: eq(mediaEvents.id, id)
    });
    
    if (!existingEvent) {
      return res.status(404).json({ message: 'Event not found' });
    }
    
    // Find all files associated with this event
    const files = await db.query.mediaFiles.findMany({
      where: eq(mediaFiles.eventId, id)
    });
    
    // Delete each file (including storage and permissions)
    for (const file of files) {
      await deleteFile(file.id);
    }
    
    // Log activity before deleting the event
    await db.insert(mediaActivityLogs).values({
      adminId,
      action: 'delete_event',
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      details: { eventName: existingEvent.name, eventId: id }
    });
    
    // Delete the event
    await db.delete(mediaEvents).where(eq(mediaEvents.id, id));
    
    res.json({ message: 'Event deleted successfully' });
  } catch (error) {
    console.error('Error deleting event:', error);
    res.status(500).json({ message: 'Failed to delete event' });
  }
});

// File endpoints
mediaRouter.post('/files/upload', requireAdminOrEditor, uploadMiddleware.single('file'), 
  async (req: Request, res: Response) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: 'No file uploaded' });
      }
      
      const adminId = (req.user as any).id;
      const { eventId, visibility, password, expiryDate, watermarkEnabled } = req.body;
      
      // Store file
      const newFile = await storeFile({
        file: req.file,
        eventId: eventId ? parseInt(eventId) : null,
        visibility: visibility || 'private',
        watermarkEnabled: watermarkEnabled === 'true',
        adminId,
        password,
        expiryDate: expiryDate ? new Date(expiryDate) : undefined
      });
      
      // Log activity
      await db.insert(mediaActivityLogs).values({
        adminId,
        fileId: newFile.id,
        eventId: newFile.eventId,
        action: 'upload_file',
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
        details: { 
          filename: newFile.originalFilename,
          size: formatFileSize(newFile.size) 
        }
      });
      
      res.status(201).json({
        ...newFile,
        url: getFileUrl(newFile)
      });
    } catch (error) {
      console.error('Error uploading file:', error);
      res.status(500).json({ message: 'Failed to upload file' });
    }
  }
);

mediaRouter.get('/files/:id', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const file = await db.query.mediaFiles.findFirst({
      where: eq(mediaFiles.id, id),
      with: {
        event: true,
        uploadedByAdmin: true
      }
    });
    
    if (!file) {
      return res.status(404).json({ message: 'File not found' });
    }
    
    // Check access for non-public files
    if (file.visibility !== 'public' && req.user) {
      const adminId = (req.user as any).id;
      const hasAccess = await isFileAccessibleByUser(id, adminId);
      
      if (!hasAccess) {
        return res.status(403).json({ message: 'Access denied' });
      }
    } else if (file.visibility !== 'public' && !req.user) {
      return res.status(401).json({ message: 'Authentication required' });
    }
    
    // Log access if authenticated
    if (req.user) {
      await db.insert(mediaActivityLogs).values({
        adminId: (req.user as any).id,
        fileId: id,
        eventId: file.eventId,
        action: 'view_file_details',
        ipAddress: req.ip,
        userAgent: req.headers['user-agent']
      });
    }
    
    res.json({
      ...file,
      url: getFileUrl(file),
      password: undefined // Don't return password hash
    });
  } catch (error) {
    console.error('Error fetching file:', error);
    res.status(500).json({ message: 'Failed to fetch file details' });
  }
});

mediaRouter.get('/files/:id/content', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const file = await db.query.mediaFiles.findFirst({
      where: eq(mediaFiles.id, id)
    });
    
    if (!file) {
      return res.status(404).json({ message: 'File not found' });
    }
    
    // Check if password is required
    if (file.password && !req.query.token) {
      // Password required but not provided via token
      if (!req.query.password) {
        return res.status(401).json({ message: 'Password required' });
      }
      
      // Verify password
      const isPasswordValid = verifyPassword(
        req.query.password as string, 
        file.password
      );
      
      if (!isPasswordValid) {
        return res.status(401).json({ message: 'Invalid password' });
      }
    }
    
    // Check access for non-public files if no token and no valid password
    if (file.visibility !== 'public' && !req.query.token && req.user) {
      const adminId = (req.user as any).id;
      const hasAccess = await isFileAccessibleByUser(id, adminId);
      
      if (!hasAccess) {
        return res.status(403).json({ message: 'Access denied' });
      }
    } else if (file.visibility !== 'public' && !req.query.token && !req.user && !req.query.password) {
      return res.status(401).json({ message: 'Authentication required' });
    }
    
    // Check token if provided (for share links)
    if (req.query.token) {
      const shareLink = await db.query.mediaShareLinks.findFirst({
        where: and(
          eq(mediaShareLinks.fileId, id),
          eq(mediaShareLinks.token, req.query.token as string)
        )
      });
      
      if (!shareLink) {
        return res.status(401).json({ message: 'Invalid token' });
      }
      
      // Check if expired
      if (shareLink.expiryDate && new Date() > shareLink.expiryDate) {
        return res.status(401).json({ message: 'Token expired' });
      }
      
      // Check max views
      if (shareLink.maxViews && shareLink.views >= shareLink.maxViews) {
        return res.status(401).json({ message: 'Maximum views exceeded' });
      }
      
      // Increment view count
      await db.update(mediaShareLinks)
        .set({ views: shareLink.views + 1 })
        .where(eq(mediaShareLinks.id, shareLink.id));
    }
    
    // Get file stream
    const fileStream = await getFileStream(id);
    
    if (!fileStream) {
      return res.status(404).json({ message: 'File content not found' });
    }
    
    // Set headers
    res.setHeader('Content-Type', file.mimeType);
    res.setHeader('Content-Disposition', `inline; filename="${file.originalFilename}"`);
    
    // Increment view count
    await db.update(mediaFiles)
      .set({ views: file.views + 1 })
      .where(eq(mediaFiles.id, id));
    
    // Log access if authenticated
    if (req.user) {
      await db.insert(mediaActivityLogs).values({
        adminId: (req.user as any).id,
        fileId: id,
        eventId: file.eventId,
        action: 'view_file',
        ipAddress: req.ip,
        userAgent: req.headers['user-agent']
      });
    }
    
    // Stream file to response
    fileStream.pipe(res);
  } catch (error) {
    console.error('Error serving file:', error);
    res.status(500).json({ message: 'Failed to serve file' });
  }
});

mediaRouter.get('/files/:id/download', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const file = await db.query.mediaFiles.findFirst({
      where: eq(mediaFiles.id, id)
    });
    
    if (!file) {
      return res.status(404).json({ message: 'File not found' });
    }
    
    // Check if password is required
    if (file.password && !req.query.token) {
      // Password required but not provided via token
      if (!req.query.password) {
        return res.status(401).json({ message: 'Password required' });
      }
      
      // Verify password
      const isPasswordValid = verifyPassword(
        req.query.password as string, 
        file.password
      );
      
      if (!isPasswordValid) {
        return res.status(401).json({ message: 'Invalid password' });
      }
    }
    
    // Check access for non-public files if no token and no valid password
    if (file.visibility !== 'public' && !req.query.token && req.user) {
      const adminId = (req.user as any).id;
      const hasAccess = await isFileAccessibleByUser(id, adminId);
      
      if (!hasAccess) {
        return res.status(403).json({ message: 'Access denied' });
      }
      
      // Check download permission
      const permission = await db.query.mediaPermissions.findFirst({
        where: and(
          eq(mediaPermissions.fileId, id),
          eq(mediaPermissions.adminId, adminId)
        )
      });
      
      if (permission && !permission.canDownload) {
        return res.status(403).json({ message: 'Download not permitted' });
      }
    } else if (file.visibility !== 'public' && !req.query.token && !req.user && !req.query.password) {
      return res.status(401).json({ message: 'Authentication required' });
    }
    
    // Check token if provided (for share links)
    if (req.query.token) {
      const shareLink = await db.query.mediaShareLinks.findFirst({
        where: and(
          eq(mediaShareLinks.fileId, id),
          eq(mediaShareLinks.token, req.query.token as string)
        )
      });
      
      if (!shareLink) {
        return res.status(401).json({ message: 'Invalid token' });
      }
      
      // Check if expired
      if (shareLink.expiryDate && new Date() > shareLink.expiryDate) {
        return res.status(401).json({ message: 'Token expired' });
      }
      
      // Check max views
      if (shareLink.maxViews && shareLink.views >= shareLink.maxViews) {
        return res.status(401).json({ message: 'Maximum views exceeded' });
      }
      
      // Increment view count
      await db.update(mediaShareLinks)
        .set({ views: shareLink.views + 1 })
        .where(eq(mediaShareLinks.id, shareLink.id));
    }
    
    // Get file stream
    const fileStream = await getFileStream(id);
    
    if (!fileStream) {
      return res.status(404).json({ message: 'File content not found' });
    }
    
    // Set headers for download
    res.setHeader('Content-Type', file.mimeType);
    res.setHeader('Content-Disposition', `attachment; filename="${file.originalFilename}"`);
    
    // Increment download count
    await db.update(mediaFiles)
      .set({ downloads: file.downloads + 1 })
      .where(eq(mediaFiles.id, id));
    
    // Log download if authenticated
    if (req.user) {
      await db.insert(mediaActivityLogs).values({
        adminId: (req.user as any).id,
        fileId: id,
        eventId: file.eventId,
        action: 'download_file',
        ipAddress: req.ip,
        userAgent: req.headers['user-agent']
      });
    }
    
    // Stream file to response
    fileStream.pipe(res);
  } catch (error) {
    console.error('Error downloading file:', error);
    res.status(500).json({ message: 'Failed to download file' });
  }
});

mediaRouter.patch('/files/:id', requireAdminOrEditor, async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const adminId = (req.user as any).id;
    
    // Check if file exists
    const existingFile = await db.query.mediaFiles.findFirst({
      where: eq(mediaFiles.id, id)
    });
    
    if (!existingFile) {
      return res.status(404).json({ message: 'File not found' });
    }
    
    // Prepare update data
    const updateData: any = {};
    
    ['visibility', 'watermarkEnabled', 'eventId'].forEach(field => {
      if (req.body[field] !== undefined) {
        updateData[field] = req.body[field];
      }
    });
    
    // Handle password updates
    if (req.body.password === null) {
      // Remove password
      updateData.password = null;
    } else if (req.body.password) {
      // Set new password
      updateData.password = hashPassword(req.body.password);
    }
    
    // Handle expiry date
    if (req.body.expiryDate === null) {
      updateData.expiryDate = null;
    } else if (req.body.expiryDate) {
      updateData.expiryDate = new Date(req.body.expiryDate);
    }
    
    // Update file
    const [updatedFile] = await db.update(mediaFiles)
      .set(updateData)
      .where(eq(mediaFiles.id, id))
      .returning();
    
    // Log activity
    await db.insert(mediaActivityLogs).values({
      adminId,
      fileId: id,
      eventId: updatedFile.eventId,
      action: 'update_file',
      ipAddress: req.ip,
      userAgent: req.headers['user-agent']
    });
    
    res.json({
      ...updatedFile,
      url: getFileUrl(updatedFile),
      password: undefined // Don't return password hash
    });
  } catch (error) {
    console.error('Error updating file:', error);
    res.status(500).json({ message: 'Failed to update file' });
  }
});

mediaRouter.delete('/files/:id', requireAdminOrEditor, async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const adminId = (req.user as any).id;
    
    // Check if file exists
    const existingFile = await db.query.mediaFiles.findFirst({
      where: eq(mediaFiles.id, id)
    });
    
    if (!existingFile) {
      return res.status(404).json({ message: 'File not found' });
    }
    
    // Only admin or the uploader can delete files
    if ((req.user as any).role !== 'admin' && existingFile.uploadedBy !== adminId) {
      return res.status(403).json({ message: 'You can only delete files you uploaded' });
    }
    
    // Log activity before deletion
    await db.insert(mediaActivityLogs).values({
      adminId,
      eventId: existingFile.eventId,
      action: 'delete_file',
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      details: { 
        filename: existingFile.originalFilename,
        fileId: id
      }
    });
    
    // Delete file (handles storage deletion and DB removal)
    const success = await deleteFile(id);
    
    if (!success) {
      return res.status(500).json({ message: 'Failed to delete file' });
    }
    
    res.json({ message: 'File deleted successfully' });
  } catch (error) {
    console.error('Error deleting file:', error);
    res.status(500).json({ message: 'Failed to delete file' });
  }
});

// Share links endpoints
mediaRouter.post('/share-links', requireAdminOrEditor, async (req: Request, res: Response) => {
  try {
    const adminId = (req.user as any).id;
    const { fileId, password, expiryDate, maxViews } = req.body;
    
    // Check if file exists
    const file = await db.query.mediaFiles.findFirst({
      where: eq(mediaFiles.id, parseInt(fileId))
    });
    
    if (!file) {
      return res.status(404).json({ message: 'File not found' });
    }
    
    // Check permission to share
    if ((req.user as any).role !== 'admin' && file.uploadedBy !== adminId) {
      const permission = await db.query.mediaPermissions.findFirst({
        where: and(
          eq(mediaPermissions.fileId, parseInt(fileId)),
          eq(mediaPermissions.adminId, adminId),
          eq(mediaPermissions.canShare, true)
        )
      });
      
      if (!permission) {
        return res.status(403).json({ message: 'You do not have permission to share this file' });
      }
    }
    
    // Generate token
    const token = randomBytes(16).toString('hex');
    
    // Create share link
    const [shareLink] = await db.insert(mediaShareLinks).values({
      fileId: parseInt(fileId),
      token,
      password: password || null,
      expiryDate: expiryDate ? new Date(expiryDate) : null,
      maxViews: maxViews ? parseInt(maxViews) : null,
      views: 0,
      createdBy: adminId
    }).returning();
    
    // Log activity
    await db.insert(mediaActivityLogs).values({
      adminId,
      fileId: parseInt(fileId),
      eventId: file.eventId,
      action: 'create_share_link',
      ipAddress: req.ip,
      userAgent: req.headers['user-agent']
    });
    
    // Generate full URL
    const baseUrl = `${req.protocol}://${req.get('host')}`;
    const shareUrl = `${baseUrl}/api/media/shared/${token}`;
    
    res.status(201).json({
      ...shareLink,
      shareUrl
    });
  } catch (error) {
    console.error('Error creating share link:', error);
    res.status(500).json({ message: 'Failed to create share link' });
  }
});

mediaRouter.get('/shared/:token', async (req: Request, res: Response) => {
  try {
    const token = req.params.token;
    
    // Find share link
    const shareLink = await db.query.mediaShareLinks.findFirst({
      where: eq(mediaShareLinks.token, token),
      with: {
        file: true
      }
    });
    
    if (!shareLink) {
      return res.status(404).json({ message: 'Share link not found' });
    }
    
    // Check if expired
    if (shareLink.expiryDate && new Date() > shareLink.expiryDate) {
      return res.status(401).json({ message: 'Share link expired' });
    }
    
    // Check max views
    if (shareLink.maxViews && shareLink.views >= shareLink.maxViews) {
      return res.status(401).json({ message: 'Maximum views exceeded' });
    }
    
    // Check password if required
    if (shareLink.password && !req.query.password) {
      return res.json({
        requiresPassword: true,
        fileId: shareLink.fileId,
        fileName: shareLink.file.originalFilename
      });
    } else if (shareLink.password && req.query.password) {
      // Verify password
      const isPasswordValid = verifyPassword(
        req.query.password as string, 
        shareLink.password
      );
      
      if (!isPasswordValid) {
        return res.status(401).json({ message: 'Invalid password' });
      }
    }
    
    // Return file info
    res.json({
      file: {
        ...shareLink.file,
        url: `${req.protocol}://${req.get('host')}/api/media/shared/${token}/content`,
        password: undefined // Don't return password hash
      }
    });
  } catch (error) {
    console.error('Error getting shared file info:', error);
    res.status(500).json({ message: 'Failed to get shared file information' });
  }
});

mediaRouter.get('/shared/:token/content', async (req: Request, res: Response) => {
  try {
    const token = req.params.token;
    
    // Find share link
    const shareLink = await db.query.mediaShareLinks.findFirst({
      where: eq(mediaShareLinks.token, token),
      with: {
        file: true
      }
    });
    
    if (!shareLink) {
      return res.status(404).json({ message: 'Share link not found' });
    }
    
    // Check if expired
    if (shareLink.expiryDate && new Date() > shareLink.expiryDate) {
      return res.status(401).json({ message: 'Share link expired' });
    }
    
    // Check max views
    if (shareLink.maxViews && shareLink.views >= shareLink.maxViews) {
      return res.status(401).json({ message: 'Maximum views exceeded' });
    }
    
    // Check password if required
    if (shareLink.password && !req.query.password) {
      return res.status(401).json({ message: 'Password required' });
    } else if (shareLink.password && req.query.password) {
      // Verify password
      const isPasswordValid = verifyPassword(
        req.query.password as string, 
        shareLink.password
      );
      
      if (!isPasswordValid) {
        return res.status(401).json({ message: 'Invalid password' });
      }
    }
    
    // Increment view count on share link
    await db.update(mediaShareLinks)
      .set({ views: shareLink.views + 1 })
      .where(eq(mediaShareLinks.id, shareLink.id));
    
    // Increment view count on file
    await db.update(mediaFiles)
      .set({ views: shareLink.file.views + 1 })
      .where(eq(mediaFiles.id, shareLink.fileId));
    
    // Get file stream
    const fileStream = await getFileStream(shareLink.fileId);
    
    if (!fileStream) {
      return res.status(404).json({ message: 'File content not found' });
    }
    
    // Determine if it's a download request
    const isDownload = req.query.download === 'true';
    
    // Set headers
    res.setHeader('Content-Type', shareLink.file.mimeType);
    res.setHeader(
      'Content-Disposition', 
      `${isDownload ? 'attachment' : 'inline'}; filename="${shareLink.file.originalFilename}"`
    );
    
    // If download, increment download count
    if (isDownload) {
      await db.update(mediaFiles)
        .set({ downloads: shareLink.file.downloads + 1 })
        .where(eq(mediaFiles.id, shareLink.fileId));
    }
    
    // Log access if authenticated
    if (req.user) {
      await db.insert(mediaActivityLogs).values({
        adminId: (req.user as any).id,
        fileId: shareLink.fileId,
        eventId: shareLink.file.eventId,
        action: isDownload ? 'download_shared_file' : 'view_shared_file',
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
        details: { shareLink: token }
      });
    }
    
    // Stream file to response
    fileStream.pipe(res);
  } catch (error) {
    console.error('Error serving shared file:', error);
    res.status(500).json({ message: 'Failed to serve shared file' });
  }
});

mediaRouter.delete('/share-links/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const adminId = (req.user as any).id;
    
    // Check if share link exists
    const shareLink = await db.query.mediaShareLinks.findFirst({
      where: eq(mediaShareLinks.id, id)
    });
    
    if (!shareLink) {
      return res.status(404).json({ message: 'Share link not found' });
    }
    
    // Only admin or creator can delete share links
    if ((req.user as any).role !== 'admin' && shareLink.createdBy !== adminId) {
      return res.status(403).json({ message: 'You can only delete share links you created' });
    }
    
    // Delete share link
    await db.delete(mediaShareLinks).where(eq(mediaShareLinks.id, id));
    
    // Log activity
    await db.insert(mediaActivityLogs).values({
      adminId,
      fileId: shareLink.fileId,
      action: 'delete_share_link',
      ipAddress: req.ip,
      userAgent: req.headers['user-agent']
    });
    
    res.json({ message: 'Share link deleted successfully' });
  } catch (error) {
    console.error('Error deleting share link:', error);
    res.status(500).json({ message: 'Failed to delete share link' });
  }
});

// Group endpoints
mediaRouter.get('/groups', requireAdminOrEditor, async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const offset = (page - 1) * limit;
    
    const [groups, countResult] = await Promise.all([
      db.query.mediaGroups.findMany({
        limit,
        offset,
        orderBy: [asc(mediaGroups.name)],
        with: {
          createdByAdmin: true
        }
      }),
      db.select({ count: sql`count(*)` }).from(mediaGroups)
    ]);
    
    const total = Number(countResult[0]?.count || '0');
    
    // Get member counts for each group
    const groupsWithMemberCounts = await Promise.all(
      groups.map(async (group) => {
        const memberCount = await db.select({ count: sql`count(*)` })
          .from(mediaGroupMembers)
          .where(eq(mediaGroupMembers.groupId, group.id));
        
        return {
          ...group,
          memberCount: Number(memberCount[0]?.count || '0')
        };
      })
    );
    
    res.json({
      groups: groupsWithMemberCounts,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching groups:', error);
    res.status(500).json({ message: 'Failed to fetch groups' });
  }
});

mediaRouter.post('/groups', requireAdmin, async (req: Request, res: Response) => {
  try {
    const adminId = (req.user as any).id;
    const { name, description } = req.body;
    
    // Create group
    const [newGroup] = await db.insert(mediaGroups).values({
      name,
      description,
      createdBy: adminId
    }).returning();
    
    // Log activity
    await db.insert(mediaActivityLogs).values({
      adminId,
      action: 'create_group',
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      details: { groupName: name }
    });
    
    res.status(201).json(newGroup);
  } catch (error) {
    console.error('Error creating group:', error);
    res.status(500).json({ message: 'Failed to create group' });
  }
});

mediaRouter.get('/groups/:id/members', requireAdminOrEditor, async (req: Request, res: Response) => {
  try {
    const groupId = parseInt(req.params.id);
    
    // Check if group exists
    const group = await db.query.mediaGroups.findFirst({
      where: eq(mediaGroups.id, groupId)
    });
    
    if (!group) {
      return res.status(404).json({ message: 'Group not found' });
    }
    
    // Get members with admin details
    const members = await db.query.mediaGroupMembers.findMany({
      where: eq(mediaGroupMembers.groupId, groupId),
      with: {
        admin: true
      }
    });
    
    res.json(members);
  } catch (error) {
    console.error('Error fetching group members:', error);
    res.status(500).json({ message: 'Failed to fetch group members' });
  }
});

mediaRouter.post('/groups/:id/members', requireAdmin, async (req: Request, res: Response) => {
  try {
    const groupId = parseInt(req.params.id);
    const adminId = (req.user as any).id;
    const { memberId, role } = req.body;
    
    // Check if group exists
    const group = await db.query.mediaGroups.findFirst({
      where: eq(mediaGroups.id, groupId)
    });
    
    if (!group) {
      return res.status(404).json({ message: 'Group not found' });
    }
    
    // Check if admin exists
    const memberAdmin = await db.query.admins.findFirst({
      where: eq(admins.id, parseInt(memberId))
    });
    
    if (!memberAdmin) {
      return res.status(404).json({ message: 'Admin not found' });
    }
    
    // Check if already a member
    const existingMember = await db.query.mediaGroupMembers.findFirst({
      where: and(
        eq(mediaGroupMembers.groupId, groupId),
        eq(mediaGroupMembers.adminId, parseInt(memberId))
      )
    });
    
    if (existingMember) {
      return res.status(400).json({ message: 'Admin is already a member of this group' });
    }
    
    // Add member
    const [newMember] = await db.insert(mediaGroupMembers).values({
      groupId,
      adminId: parseInt(memberId),
      role: role || 'member',
      addedBy: adminId
    }).returning();
    
    // Log activity
    await db.insert(mediaActivityLogs).values({
      adminId,
      action: 'add_group_member',
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      details: { 
        groupId,
        groupName: group.name,
        memberId,
        memberName: memberAdmin.fullName
      }
    });
    
    // Get full member details
    const memberWithDetails = await db.query.mediaGroupMembers.findFirst({
      where: eq(mediaGroupMembers.id, newMember.id),
      with: {
        admin: true
      }
    });
    
    res.status(201).json(memberWithDetails);
  } catch (error) {
    console.error('Error adding group member:', error);
    res.status(500).json({ message: 'Failed to add group member' });
  }
});

mediaRouter.delete('/groups/:groupId/members/:memberId', requireAdmin, async (req: Request, res: Response) => {
  try {
    const groupId = parseInt(req.params.groupId);
    const memberId = parseInt(req.params.memberId);
    const adminId = (req.user as any).id;
    
    // Check if membership exists
    const membership = await db.query.mediaGroupMembers.findFirst({
      where: and(
        eq(mediaGroupMembers.groupId, groupId),
        eq(mediaGroupMembers.id, memberId)
      ),
      with: {
        group: true,
        admin: true
      }
    });
    
    if (!membership) {
      return res.status(404).json({ message: 'Group membership not found' });
    }
    
    // Remove member
    await db.delete(mediaGroupMembers).where(eq(mediaGroupMembers.id, memberId));
    
    // Log activity
    await db.insert(mediaActivityLogs).values({
      adminId,
      action: 'remove_group_member',
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      details: { 
        groupId,
        groupName: membership.group.name,
        memberId: membership.adminId,
        memberName: membership.admin.fullName
      }
    });
    
    res.json({ message: 'Member removed from group successfully' });
  } catch (error) {
    console.error('Error removing group member:', error);
    res.status(500).json({ message: 'Failed to remove group member' });
  }
});

// Permission endpoints
mediaRouter.get('/files/:id/permissions', requireAdminOrEditor, async (req: Request, res: Response) => {
  try {
    const fileId = parseInt(req.params.id);
    
    // Check if file exists
    const file = await db.query.mediaFiles.findFirst({
      where: eq(mediaFiles.id, fileId)
    });
    
    if (!file) {
      return res.status(404).json({ message: 'File not found' });
    }
    
    // Get permissions
    const permissions = await db.query.mediaPermissions.findMany({
      where: eq(mediaPermissions.fileId, fileId),
      with: {
        admin: true,
        group: true,
        grantedByAdmin: true
      }
    });
    
    res.json(permissions);
  } catch (error) {
    console.error('Error fetching file permissions:', error);
    res.status(500).json({ message: 'Failed to fetch file permissions' });
  }
});

mediaRouter.post('/files/:id/permissions', requireAdminOrEditor, async (req: Request, res: Response) => {
  try {
    const fileId = parseInt(req.params.id);
    const adminId = (req.user as any).id;
    const { adminId: targetAdminId, groupId, canView, canDownload, canShare } = req.body;
    
    // Check if file exists
    const file = await db.query.mediaFiles.findFirst({
      where: eq(mediaFiles.id, fileId)
    });
    
    if (!file) {
      return res.status(404).json({ message: 'File not found' });
    }
    
    // Check if user has permission to set permissions
    if ((req.user as any).role !== 'admin' && file.uploadedBy !== adminId) {
      return res.status(403).json({ message: 'You can only set permissions for files you uploaded' });
    }
    
    // Validate either adminId or groupId is provided, but not both
    if ((!targetAdminId && !groupId) || (targetAdminId && groupId)) {
      return res.status(400).json({ message: 'Either adminId or groupId must be provided, but not both' });
    }
    
    // Check if admin or group exists
    if (targetAdminId) {
      const targetAdmin = await db.query.admins.findFirst({
        where: eq(admins.id, parseInt(targetAdminId))
      });
      
      if (!targetAdmin) {
        return res.status(404).json({ message: 'Admin not found' });
      }
    } else if (groupId) {
      const group = await db.query.mediaGroups.findFirst({
        where: eq(mediaGroups.id, parseInt(groupId))
      });
      
      if (!group) {
        return res.status(404).json({ message: 'Group not found' });
      }
    }
    
    // Check if permission already exists
    const existingPermission = await db.query.mediaPermissions.findFirst({
      where: targetAdminId 
        ? and(
            eq(mediaPermissions.fileId, fileId),
            eq(mediaPermissions.adminId, parseInt(targetAdminId))
          )
        : and(
            eq(mediaPermissions.fileId, fileId),
            eq(mediaPermissions.groupId, parseInt(groupId))
          )
    });
    
    if (existingPermission) {
      // Update existing permission
      const [updatedPermission] = await db.update(mediaPermissions)
        .set({
          canView: canView === undefined ? existingPermission.canView : canView,
          canDownload: canDownload === undefined ? existingPermission.canDownload : canDownload,
          canShare: canShare === undefined ? existingPermission.canShare : canShare
        })
        .where(eq(mediaPermissions.id, existingPermission.id))
        .returning();
      
      // Log activity
      await db.insert(mediaActivityLogs).values({
        adminId,
        fileId,
        action: 'update_permission',
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
        details: targetAdminId 
          ? { targetAdminId } 
          : { groupId }
      });
      
      // Get full permission details
      const permissionWithDetails = await db.query.mediaPermissions.findFirst({
        where: eq(mediaPermissions.id, updatedPermission.id),
        with: {
          admin: true,
          group: true,
          grantedByAdmin: true
        }
      });
      
      return res.json(permissionWithDetails);
    }
    
    // Create new permission
    const [newPermission] = await db.insert(mediaPermissions).values({
      fileId,
      adminId: targetAdminId ? parseInt(targetAdminId) : null,
      groupId: groupId ? parseInt(groupId) : null,
      canView: canView === undefined ? true : canView,
      canDownload: canDownload === undefined ? false : canDownload,
      canShare: canShare === undefined ? false : canShare,
      grantedBy: adminId
    }).returning();
    
    // Log activity
    await db.insert(mediaActivityLogs).values({
      adminId,
      fileId,
      action: 'create_permission',
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      details: targetAdminId 
        ? { targetAdminId } 
        : { groupId }
    });
    
    // Get full permission details
    const permissionWithDetails = await db.query.mediaPermissions.findFirst({
      where: eq(mediaPermissions.id, newPermission.id),
      with: {
        admin: true,
        group: true,
        grantedByAdmin: true
      }
    });
    
    res.status(201).json(permissionWithDetails);
  } catch (error) {
    console.error('Error setting file permission:', error);
    res.status(500).json({ message: 'Failed to set file permission' });
  }
});

mediaRouter.delete('/permissions/:id', requireAdminOrEditor, async (req: Request, res: Response) => {
  try {
    const permissionId = parseInt(req.params.id);
    const adminId = (req.user as any).id;
    
    // Check if permission exists
    const permission = await db.query.mediaPermissions.findFirst({
      where: eq(mediaPermissions.id, permissionId),
      with: {
        file: true
      }
    });
    
    if (!permission) {
      return res.status(404).json({ message: 'Permission not found' });
    }
    
    // Check if user has permission to delete
    if ((req.user as any).role !== 'admin' && permission.file.uploadedBy !== adminId && permission.grantedBy !== adminId) {
      return res.status(403).json({ message: 'You can only delete permissions you granted or for files you uploaded' });
    }
    
    // Delete permission
    await db.delete(mediaPermissions).where(eq(mediaPermissions.id, permissionId));
    
    // Log activity
    await db.insert(mediaActivityLogs).values({
      adminId,
      fileId: permission.fileId,
      action: 'delete_permission',
      ipAddress: req.ip,
      userAgent: req.headers['user-agent']
    });
    
    res.json({ message: 'Permission deleted successfully' });
  } catch (error) {
    console.error('Error deleting permission:', error);
    res.status(500).json({ message: 'Failed to delete permission' });
  }
});

// Dashboard statistics
mediaRouter.get('/dashboard/stats', requireAdminOrEditor, async (req: Request, res: Response) => {
  try {
    // Get counts
    const [
      totalEventsResult,
      totalFilesResult,
      totalGroupsResult,
      storageUsedResult,
      topEventsResult,
      topFilesResult,
      recentActivitiesResult
    ] = await Promise.all([
      db.select({ count: sql`count(*)` }).from(mediaEvents),
      db.select({ count: sql`count(*)` }).from(mediaFiles),
      db.select({ count: sql`count(*)` }).from(mediaGroups),
      db.select({ total: sql`sum(size)` }).from(mediaFiles),
      
      // Top events by file count
      db.select({
        eventId: mediaEvents.id,
        eventName: mediaEvents.name,
        fileCount: sql`count(${mediaFiles.id})`
      })
      .from(mediaEvents)
      .leftJoin(mediaFiles, eq(mediaEvents.id, mediaFiles.eventId))
      .groupBy(mediaEvents.id, mediaEvents.name)
      .orderBy(desc(sql`count(${mediaFiles.id})`))
      .limit(5),
      
      // Top downloaded files
      db.select({
        id: mediaFiles.id,
        filename: mediaFiles.originalFilename,
        downloads: mediaFiles.downloads,
        views: mediaFiles.views,
        size: mediaFiles.size,
        eventId: mediaFiles.eventId,
        uploadedBy: mediaFiles.uploadedBy
      })
      .from(mediaFiles)
      .orderBy(desc(mediaFiles.downloads))
      .limit(5),
      
      // Recent activities
      db.query.mediaActivityLogs.findMany({
        orderBy: [desc(mediaActivityLogs.timestamp)],
        limit: 10,
        with: {
          admin: true,
          file: true,
          event: true
        }
      })
    ]);
    
    const totalEvents = Number(totalEventsResult[0]?.count || '0');
    const totalFiles = Number(totalFilesResult[0]?.count || '0');
    const totalGroups = Number(totalGroupsResult[0]?.count || '0');
    const storageUsed = Number(totalFilesResult[0]?.total || '0');
    
    // Format storage
    const formattedStorage = formatFileSize(storageUsed);
    
    // Get event names for top files
    const topFilesWithEvents = await Promise.all(
      topFilesResult.map(async (file) => {
        if (!file.eventId) return { ...file, eventName: null };
        
        const event = await db.query.mediaEvents.findFirst({
          where: eq(mediaEvents.id, file.eventId)
        });
        
        return {
          ...file,
          eventName: event?.name || null
        };
      })
    );
    
    res.json({
      totalEvents,
      totalFiles,
      totalGroups,
      storageUsed: formattedStorage,
      topEvents: topEventsResult,
      topFiles: topFilesWithEvents,
      recentActivities: recentActivitiesResult
    });
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    res.status(500).json({ message: 'Failed to fetch dashboard statistics' });
  }
});

function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
  return `${hash}.${salt}`;
}