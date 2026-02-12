import express, { Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = express.Router();

// Whitelist допустимых расширений изображений
const ALLOWED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
// Magic bytes для проверки реального типа файла (защита от подмены MIME)
const IMAGE_SIGNATURES: { sig: number[]; isWebP?: boolean }[] = [
  { sig: [0xff, 0xd8, 0xff] }, // JPEG
  { sig: [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a] }, // PNG
  { sig: [0x47, 0x49, 0x46, 0x38, 0x37, 0x61] }, // GIF87a
  { sig: [0x47, 0x49, 0x46, 0x38, 0x39, 0x61] }, // GIF89a
  { sig: [0x52, 0x49, 0x46, 0x46], isWebP: true }, // RIFF + WEBP
];

function isAllowedExtension(ext: string): boolean {
  return ALLOWED_EXTENSIONS.includes(ext.toLowerCase());
}

function isValidImageSignature(buffer: Buffer): boolean {
  if (buffer.length < 12) return false;
  for (const { sig, isWebP } of IMAGE_SIGNATURES) {
    if (!buffer.slice(0, sig.length).every((b, i) => b === sig[i])) continue;
    if (isWebP) {
      if (buffer.length >= 12 && buffer.slice(8, 12).toString() === 'WEBP') return true;
    } else {
      return true;
    }
  }
  return false;
}

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, '../../uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure multer for image uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    const safeExt = isAllowedExtension(ext) ? ext : '.bin';
    cb(null, `image-${uniqueSuffix}${safeExt}`);
  },
});

const fileFilter = (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const ext = path.extname(file.originalname);
  if (!isAllowedExtension(ext)) {
    return cb(new Error('Разрешены только изображения: jpg, jpeg, png, gif, webp'));
  }
  if (!file.mimetype.startsWith('image/')) {
    return cb(new Error('Некорректный тип файла'));
  }
  cb(null, true);
};

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: fileFilter,
});

function validateAndCleanFile(filePath: string): boolean {
  try {
    const buffer = fs.readFileSync(filePath).slice(0, 16);
    if (!isValidImageSignature(buffer)) {
      fs.unlinkSync(filePath);
      return false;
    }
    return true;
  } catch {
    try {
      fs.unlinkSync(filePath);
    } catch {}
    return false;
  }
}

// Upload single image
router.post(
  '/image',
  authenticate,
  upload.single('image'),
  (req: AuthRequest, res: Response) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
      }
      if (!validateAndCleanFile(req.file.path)) {
        return res.status(400).json({ error: 'Файл не является допустимым изображением' });
      }
      const imageUrl = `/uploads/${req.file.filename}`;
      res.json({ url: imageUrl });
    } catch (error) {
      console.error('Upload error:', error);
      res.status(500).json({ error: 'Upload failed' });
    }
  }
);

// Upload multiple images
router.post(
  '/images',
  authenticate,
  upload.array('images', 10), // Max 10 images
  (req: AuthRequest, res: Response) => {
    try {
      if (!req.files || (req.files as Express.Multer.File[]).length === 0) {
        return res.status(400).json({ error: 'No files uploaded' });
      }
      const files = req.files as Express.Multer.File[];
      const validUrls: string[] = [];
      let allValid = true;
      for (const file of files) {
        if (validateAndCleanFile(file.path)) {
          validUrls.push(`/uploads/${file.filename}`);
        } else {
          allValid = false;
          break;
        }
      }
      if (!allValid) {
        for (const f of files) {
          try {
            if (fs.existsSync(f.path)) fs.unlinkSync(f.path);
          } catch {}
        }
        return res.status(400).json({ error: 'Один или более файлов не являются допустимыми изображениями' });
      }
      res.json({ urls: validUrls });
    } catch (error) {
      console.error('Upload error:', error);
      res.status(500).json({ error: 'Upload failed' });
    }
  }
);

export default router;
