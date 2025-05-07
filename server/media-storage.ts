import { promises as fsPromises } from 'fs';
import fs from 'fs';
import path from 'path';
import multer from 'multer';
import crypto from 'crypto';
import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { mediaFiles, mediaGroupMembers, mediaPermissions, admins } from '@shared/schema';
import { db } from '@db';
import { and, eq, or } from 'drizzle-orm';

// Configuration
const UPLOAD_DIR = process.env.UPLOAD_DIR || 'uploads';
const STORAGE_TYPE = process.env.STORAGE_TYPE || 'local'; // 'local' or 's3'

// S3 client if using S3 storage
let s3Client: S3Client | null = null;
if (STORAGE_TYPE === 's3') {
  if (!process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY || !process.env.AWS_REGION) {
    console.warn('WARNING: S3 storage is selected but AWS credentials are not fully provided. Fallback to local storage.');
  } else {
    s3Client = new S3Client({
      region: process.env.AWS_REGION,
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      },
    });
    console.log('Initialized S3 client for media storage');
  }
}

// Ensure uploads directory exists
async function ensureUploadsDirectory() {
  const uploadPath = path.isAbsolute(UPLOAD_DIR) 
    ? UPLOAD_DIR 
    : path.join(process.cwd(), UPLOAD_DIR);
  
  try {
    await fsPromises.access(uploadPath);
  } catch (error) {
    // Directory doesn't exist, create it
    await fsPromises.mkdir(uploadPath, { recursive: true });
    console.log(`Created uploads directory at ${uploadPath}`);
  }
  
  return uploadPath;
}

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const uploadPath = await ensureUploadsDirectory();
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1E9)}`;
    const ext = path.extname(file.originalname);
    cb(null, `${file.fieldname}-${uniqueSuffix}${ext}`);
  },
});

export const uploadMiddleware = multer({
  storage,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit
  },
});

// Types
interface StoreFileOptions {
  file: Express.Multer.File;
  eventId?: number | null;
  visibility?: 'public' | 'private' | 'group';
  watermarkEnabled?: boolean;
  adminId: number;
  password?: string;
  expiryDate?: Date;
}

/**
 * Store a file in the configured storage system
 */
export const storeFile = async ({
  file,
  eventId = null,
  visibility = 'private',
  watermarkEnabled = false,
  adminId,
  password,
  expiryDate,
}: StoreFileOptions) => {
  const storageKey = file.filename;
  
  // Hash password if provided
  const hashedPassword = password ? hashPassword(password) : null;
  
  // Store file metadata in database
  const [newFile] = await db.insert(mediaFiles).values({
    storageKey,
    originalFilename: file.originalname,
    mimeType: file.mimetype,
    size: file.size,
    storageType: STORAGE_TYPE,
    eventId,
    visibility,
    watermarkEnabled,
    uploadedBy: adminId,
    password: hashedPassword,
    expiryDate: expiryDate || null,
    metadata: {},
  }).returning();
  
  // If S3 storage, upload file to S3 and delete local copy
  if (STORAGE_TYPE === 's3' && s3Client) {
    try {
      const fileContent = await fs.readFile(file.path);
      const bucketName = process.env.AWS_BUCKET_NAME;
      
      if (!bucketName) {
        throw new Error('AWS_BUCKET_NAME environment variable is not set');
      }
      
      await s3Client.send(new PutObjectCommand({
        Bucket: bucketName,
        Key: storageKey,
        Body: fileContent,
        ContentType: file.mimetype,
      }));
      
      // Delete local file after S3 upload
      await fs.unlink(file.path);
      
    } catch (error) {
      console.error('Error uploading to S3:', error);
      // Keep the local file as fallback
    }
  }
  
  return newFile;
};

/**
 * Delete a file from storage and database
 */
export const deleteFile = async (fileId: number): Promise<boolean> => {
  try {
    // Get file info
    const file = await db.query.mediaFiles.findFirst({
      where: eq(mediaFiles.id, fileId)
    });
    
    if (!file) {
      return false;
    }
    
    // Delete from storage
    if (file.storageType === 'local') {
      const filePath = path.isAbsolute(UPLOAD_DIR) 
        ? path.join(UPLOAD_DIR, file.storageKey) 
        : path.join(process.cwd(), UPLOAD_DIR, file.storageKey);
      
      try {
        await fs.access(filePath);
        await fs.unlink(filePath);
      } catch (error) {
        console.warn(`Could not delete file ${filePath}:`, error);
        // Continue with database deletion even if physical file deletion fails
      }
    } else if (file.storageType === 's3' && s3Client) {
      const bucketName = process.env.AWS_BUCKET_NAME;
      if (bucketName) {
        try {
          await s3Client.send(new DeleteObjectCommand({
            Bucket: bucketName,
            Key: file.storageKey,
          }));
        } catch (error) {
          console.warn(`Could not delete file from S3:`, error);
          // Continue with database deletion even if S3 deletion fails
        }
      }
    }
    
    // Delete permissions
    await db.delete(mediaPermissions).where(eq(mediaPermissions.fileId, fileId));
    
    // Delete from database
    await db.delete(mediaFiles).where(eq(mediaFiles.id, fileId));
    
    return true;
  } catch (error) {
    console.error('Error deleting file:', error);
    return false;
  }
};

/**
 * Get a URL for a file
 */
export const getFileUrl = (file: any): string => {
  if (file.storageType === 's3') {
    const bucketName = process.env.AWS_BUCKET_NAME;
    const region = process.env.AWS_REGION;
    
    if (bucketName && region) {
      return `https://${bucketName}.s3.${region}.amazonaws.com/${file.storageKey}`;
    } else {
      // Fallback to API endpoint
      return `/api/media/files/${file.id}/content`;
    }
  } else {
    // Local files are served via API
    return `/api/media/files/${file.id}/content`;
  }
};

/**
 * Check if a file is accessible by a given admin
 */
export const isFileAccessibleByUser = async (
  fileId: number, 
  adminId: number
): Promise<boolean> => {
  try {
    // Get the file
    const file = await db.query.mediaFiles.findFirst({
      where: eq(mediaFiles.id, fileId),
    });
    
    if (!file) {
      return false;
    }
    
    // If public, it's accessible
    if (file.visibility === 'public') {
      return true;
    }
    
    // If user is the uploader, they can access
    if (file.uploadedBy === adminId) {
      return true;
    }
    
    // Get admin's role
    const admin = await db.query.admins.findFirst({
      where: eq(admins.id, adminId),
    });
    
    // Admin role can access everything
    if (admin?.role === 'admin') {
      return true;
    }
    
    // Check direct permissions
    const directPermission = await db.query.mediaPermissions.findFirst({
      where: and(
        eq(mediaPermissions.fileId, fileId),
        eq(mediaPermissions.adminId, adminId)
      ),
    });
    
    if (directPermission) {
      return true;
    }
    
    // Check group permissions
    if (file.visibility === 'group') {
      // Get all groups the user is a member of
      const memberGroups = await db.query.mediaGroupMembers.findMany({
        where: eq(mediaGroupMembers.adminId, adminId),
      });
      
      const groupIds = memberGroups.map(m => m.groupId);
      
      // If user is not in any groups, they can't access
      if (groupIds.length === 0) {
        return false;
      }
      
      // Check if any of the user's groups have permission to the file
      for (const groupId of groupIds) {
        const groupPermission = await db.query.mediaPermissions.findFirst({
          where: and(
            eq(mediaPermissions.fileId, fileId),
            eq(mediaPermissions.groupId, groupId)
          ),
        });
        
        if (groupPermission) {
          return true;
        }
      }
    }
    
    return false;
  } catch (error) {
    console.error('Error checking file accessibility:', error);
    return false;
  }
};

/**
 * Get file content stream
 */
export const getFileStream = async (fileId: number): Promise<NodeJS.ReadableStream | null> => {
  try {
    // Get file info
    const file = await db.query.mediaFiles.findFirst({
      where: eq(mediaFiles.id, fileId)
    });
    
    if (!file) {
      return null;
    }
    
    if (file.storageType === 'local') {
      const filePath = path.isAbsolute(UPLOAD_DIR) 
        ? path.join(UPLOAD_DIR, file.storageKey) 
        : path.join(process.cwd(), UPLOAD_DIR, file.storageKey);
      
      try {
        await fs.access(filePath);
        return fs.createReadStream(filePath);
      } catch (error) {
        console.error(`Could not access file ${filePath}:`, error);
        return null;
      }
    } else if (file.storageType === 's3' && s3Client) {
      const bucketName = process.env.AWS_BUCKET_NAME;
      if (bucketName) {
        try {
          const command = new GetObjectCommand({
            Bucket: bucketName,
            Key: file.storageKey,
          });
          
          const response = await s3Client.send(command);
          return response.Body as NodeJS.ReadableStream;
        } catch (error) {
          console.error(`Could not get file from S3:`, error);
          return null;
        }
      }
    }
    
    return null;
  } catch (error) {
    console.error('Error getting file stream:', error);
    return null;
  }
};

/**
 * Hash a password for file protection
 */
function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
  return `${hash}.${salt}`;
}

/**
 * Verify a password for file access
 */
export function verifyPassword(password: string, storedHash: string): boolean {
  const [hash, salt] = storedHash.split('.');
  const verifyHash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
  return hash === verifyHash;
}

/**
 * Helper function to format file size
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}