import { Storage } from '@google-cloud/storage';
import * as multer from 'multer';
import { Request, Response, NextFunction } from 'express';

const storage = new Storage();
const bucket = storage.bucket(process.env.FIREBASE_STORAGE_BUCKET || 'interlink-storage');

interface FileUploadOptions {
  allowedMimeTypes?: string[];
  maxFileSize?: number;
  destination?: string;
}

const DEFAULT_RESUME_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];

const DEFAULT_IMAGE_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
];

const multerMemoryStorage = multer.memoryStorage();

const createMulterUpload = (options: FileUploadOptions) => {
  return multer({
    storage: multerMemoryStorage,
    limits: {
      fileSize: options.maxFileSize || 10 * 1024 * 1024,
    },
    fileFilter: (req, file, cb) => {
      if (options.allowedMimeTypes && !options.allowedMimeTypes.includes(file.mimetype)) {
        cb(new Error(`Invalid file type. Allowed types: ${options.allowedMimeTypes.join(', ')}`));
      } else {
        cb(null, true);
      }
    },
  });
};

export const uploadResume = createMulterUpload({
  allowedMimeTypes: DEFAULT_RESUME_TYPES,
  maxFileSize: 5 * 1024 * 1024,
}).single('resume');

export const uploadCompanyLogo = createMulterUpload({
  allowedMimeTypes: DEFAULT_IMAGE_TYPES,
  maxFileSize: 2 * 1024 * 1024,
}).single('logo');

export const uploadProfilePicture = createMulterUpload({
  allowedMimeTypes: DEFAULT_IMAGE_TYPES,
  maxFileSize: 2 * 1024 * 1024,
}).single('profilePicture');

export const uploadToStorage = async (
  file: Express.Multer.File,
  destination: string
): Promise<string> => {
  return new Promise((resolve, reject) => {
    if (!file) {
      reject(new Error('No file provided'));
      return;
    }

    const fileName = `${Date.now()}_${Math.random().toString(36).substring(2)}_${file.originalname}`;
    const filePath = `${destination}/${fileName}`;
    
    const blob = bucket.file(filePath);
    const blobStream = blob.createWriteStream({
      resumable: false,
      metadata: {
        contentType: file.mimetype,
      },
    });

    blobStream.on('error', (err) => {
      reject(err);
    });

    blobStream.on('finish', async () => {
      await blob.makePublic();
      const publicUrl = `https://storage.googleapis.com/${bucket.name}/${blob.name}`;
      resolve(publicUrl);
    });

    blobStream.end(file.buffer);
  });
};

export const deleteFromStorage = async (fileUrl: string): Promise<boolean> => {
  try {
    const baseUrl = `https://storage.googleapis.com/${bucket.name}/`;
    
    if (!fileUrl.startsWith(baseUrl)) {
      console.error('Invalid file URL');
      return false;
    }

    const filePath = fileUrl.replace(baseUrl, '');
    await bucket.file(filePath).delete();
    
    return true;
  } catch (error) {
    console.error('Error deleting file from storage:', error);
    return false;
  }
};

export const handleResumeUpload = async (
  req: Request & { file?: Express.Multer.File },
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.file) {
      res.status(400).json({ error: 'No file uploaded' });
      return;
    }

    const fileUrl = await uploadToStorage(req.file, 'resumes');
    
    (req as any).uploadedFileUrl = fileUrl;
    next();
  } catch (error) {
    console.error('Error uploading resume:', error);
    res.status(500).json({ error: 'Failed to upload resume' });
  }
};

export const handleLogoUpload = async (
  req: Request & { file?: Express.Multer.File },
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.file) {
      res.status(400).json({ error: 'No file uploaded' });
      return;
    }

    const fileUrl = await uploadToStorage(req.file, 'logos');
    
    (req as any).uploadedFileUrl = fileUrl;
    next();
  } catch (error) {
    console.error('Error uploading logo:', error);
    res.status(500).json({ error: 'Failed to upload logo' });
  }
};

export const handleProfilePictureUpload = async (
  req: Request & { file?: Express.Multer.File },
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.file) {
      res.status(400).json({ error: 'No file uploaded' });
      return;
    }

    const fileUrl = await uploadToStorage(req.file, 'profile-pictures');
    
    (req as any).uploadedFileUrl = fileUrl;
    next();
  } catch (error) {
    console.error('Error uploading profile picture:', error);
    res.status(500).json({ error: 'Failed to upload profile picture' });
  }
};

export const generateSignedUrl = async (
  filePath: string,
  expiresInMinutes: number = 60
): Promise<string> => {
  try {
    const [url] = await bucket.file(filePath).getSignedUrl({
      version: 'v4',
      action: 'read',
      expires: Date.now() + expiresInMinutes * 60 * 1000,
    });
    
    return url;
  } catch (error) {
    console.error('Error generating signed URL:', error);
    throw error;
  }
};

export const validateFileSize = (maxSizeMB: number) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const file = (req as any).file;
    
    if (file && file.size > maxSizeMB * 1024 * 1024) {
      res.status(400).json({ 
        error: `File size exceeds ${maxSizeMB}MB limit` 
      });
      return;
    }
    
    next();
  };
};

export const validateFileType = (allowedTypes: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const file = (req as any).file;
    
    if (file && !allowedTypes.includes(file.mimetype)) {
      res.status(400).json({ 
        error: `Invalid file type. Allowed types: ${allowedTypes.join(', ')}` 
      });
      return;
    }
    
    next();
  };
};