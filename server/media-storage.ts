import { promises as fs } from 'fs';
import path from 'path';
import crypto from 'crypto';
import { Request } from 'express';
import multer from 'multer';
import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { MediaFile } from '@shared/schema';
import { db } from '@db';
import { mediaFiles } from '@shared/schema';
import { eq } from 'drizzle-orm';

// Check if S3 configuration is provided
const isS3Configured = () => {
  return (
    process.env.STORAGE_TYPE === 's3' &&
    process.env.AWS_ACCESS_KEY_ID &&
    process.env.AWS_SECRET_ACCESS_KEY &&
    process.env.AWS_REGION &&
    process.env.AWS_BUCKET_NAME
  );
};

// Initialize S3 client if configured
const getS3Client = () => {
  if (!isS3Configured()) {
    return null;
  }

  return new S3Client({
    region: process.env.AWS_REGION as string,
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID as string,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY as string,
    },
  });
};

// Configure local storage path
const getLocalUploadPath = () => {
  const uploadDir = process.env.UPLOAD_DIR || 'uploads';
  const absolutePath = path.isAbsolute(uploadDir)
    ? uploadDir
    : path.join(process.cwd(), uploadDir);
  return absolutePath;
};

// Generate a random filename with the original extension
const generateSafeFilename = (originalname: string) => {
  const ext = path.extname(originalname);
  const randomName = crypto.randomBytes(16).toString('hex');
  return `${randomName}${ext}`;
};

// Ensure upload directory exists
const ensureUploadDirExists = async () => {
  const uploadDir = getLocalUploadPath();
  try {
    await fs.access(uploadDir);
  } catch (error) {
    // Directory doesn't exist, create it
    await fs.mkdir(uploadDir, { recursive: true });
  }
};

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    // If using S3, we'll still temporarily store files on disk
    await ensureUploadDirExists();
    cb(null, getLocalUploadPath());
  },
  filename: (req, file, cb) => {
    cb(null, generateSafeFilename(file.originalname));
  },
});

export const uploadMiddleware = multer({
  storage,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50 MB limit
  },
  fileFilter: (req, file, cb) => {
    // Only allow images and videos
    if (
      file.mimetype.startsWith('image/') ||
      file.mimetype.startsWith('video/')
    ) {
      cb(null, true);
    } else {
      cb(new Error('Only image and video files are allowed'));
    }
  },
});

// Store a file in the final storage location (S3 or local)
export const storeFile = async ({
  file,
  eventId,
  visibility,
  uploadedBy,
  metadata,
  password,
  expiryDate,
  watermarkEnabled,
}: {
  file: Express.Multer.File;
  eventId?: number;
  visibility?: string;
  uploadedBy: number;
  metadata?: any;
  password?: string;
  expiryDate?: Date;
  watermarkEnabled?: boolean;
}): Promise<MediaFile> => {
  const storageType = process.env.STORAGE_TYPE || 'local';

  if (storageType === 's3' && isS3Configured()) {
    // Upload to S3
    const s3Client = getS3Client();
    if (!s3Client) {
      throw new Error('S3 client could not be initialized');
    }

    const fileBuffer = await fs.readFile(file.path);
    const key = `media/${file.filename}`;

    await s3Client.send(
      new PutObjectCommand({
        Bucket: process.env.AWS_BUCKET_NAME,
        Key: key,
        Body: fileBuffer,
        ContentType: file.mimetype,
      })
    );

    // Remove the temporary local file
    await fs.unlink(file.path);

    // Store file record in database
    const [newFile] = await db
      .insert(mediaFiles)
      .values({
        filename: file.filename,
        originalFilename: file.originalname,
        mimeType: file.mimetype,
        size: file.size,
        path: key,
        storageType: 's3',
        eventId: eventId || null,
        visibility: visibility || 'private',
        password: password || null,
        expiryDate: expiryDate || null,
        metadata: metadata || null,
        watermarkEnabled: watermarkEnabled || false,
        uploadedBy,
      })
      .returning();

    return newFile;
  } else {
    // Use local storage
    // The file is already stored by multer, just create a record
    const filePath = path.relative(process.cwd(), file.path);

    const [newFile] = await db
      .insert(mediaFiles)
      .values({
        filename: file.filename,
        originalFilename: file.originalname,
        mimeType: file.mimetype,
        size: file.size,
        path: filePath,
        storageType: 'local',
        eventId: eventId || null,
        visibility: visibility || 'private',
        password: password || null,
        expiryDate: expiryDate || null,
        metadata: metadata || null,
        watermarkEnabled: watermarkEnabled || false,
        uploadedBy,
      })
      .returning();

    return newFile;
  }
};

// Delete a file from storage and database
export const deleteFile = async (fileId: number): Promise<boolean> => {
  // Get file details from database
  const file = await db.query.mediaFiles.findFirst({
    where: eq(mediaFiles.id, fileId),
  });

  if (!file) {
    return false;
  }

  try {
    if (file.storageType === 's3') {
      // Delete from S3
      const s3Client = getS3Client();
      if (!s3Client) {
        throw new Error('S3 client could not be initialized');
      }

      await s3Client.send(
        new DeleteObjectCommand({
          Bucket: process.env.AWS_BUCKET_NAME as string,
          Key: file.path,
        })
      );
    } else {
      // Delete from local filesystem
      const filePath = path.join(process.cwd(), file.path);
      await fs.unlink(filePath);
    }

    // Remove from database
    await db.delete(mediaFiles).where(eq(mediaFiles.id, fileId));
    return true;
  } catch (error) {
    console.error('Error deleting file:', error);
    return false;
  }
};

// Get the URL for accessing a file
export const getFileUrl = (file: MediaFile): string => {
  if (file.storageType === 's3') {
    // Generate S3 URL
    return `https://${process.env.AWS_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${file.path}`;
  } else {
    // Generate local URL
    return `/api/media/files/${file.id}/content`;
  }
};

// Check if a file is accessible by a user
export const isFileAccessibleByUser = async (
  fileId: number,
  userId?: number
): Promise<boolean> => {
  const file = await db.query.mediaFiles.findFirst({
    where: eq(mediaFiles.id, fileId),
  });

  if (!file) {
    return false;
  }

  // Public files are accessible by everyone
  if (file.visibility === 'public') {
    return true;
  }

  // If not public and no user is specified, deny access
  if (!userId) {
    return false;
  }

  // Check if user has explicit permission
  const permission = await db.query.mediaPermissions.findFirst({
    where: (permissions) => {
      return eq(permissions.fileId, fileId) && eq(permissions.userId, userId);
    },
  });

  if (permission && permission.canView) {
    return true;
  }

  // Check if user is in a group with access
  const groupPermissions = await db
    .select()
    .from(mediaPermissions)
    .innerJoin('mediaGroupMembers', 'mediaPermissions.groupId = mediaGroupMembers.groupId')
    .where((permissions) => {
      return (
        eq(permissions.mediaPermissions.fileId, fileId) &&
        eq(permissions.mediaGroupMembers.userId, userId)
      );
    });

  return groupPermissions.some((gp) => gp.mediaPermissions.canView);
};