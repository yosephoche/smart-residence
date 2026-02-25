import path from "path";
import fs from "fs";
import sharp from "sharp";
import { MAX_FILE_SIZE } from "@/lib/constants";
import { v2 as cloudinary } from "cloudinary";

const UPLOAD_DIR = process.env.UPLOAD_DIR || "./public/uploads/payments";

// Magic bytes for file type verification
const JPEG_MAGIC = [0xff, 0xd8, 0xff];
const PNG_MAGIC = [0x89, 0x50, 0x4e, 0x47];

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
})

function checkMagicBytes(buffer: Buffer): "jpeg" | "png" | null {
  if (buffer[0] === JPEG_MAGIC[0] && buffer[1] === JPEG_MAGIC[1] && buffer[2] === JPEG_MAGIC[2]) {
    return "jpeg";
  }
  if (buffer[0] === PNG_MAGIC[0] && buffer[1] === PNG_MAGIC[1] && buffer[2] === PNG_MAGIC[2] && buffer[3] === PNG_MAGIC[3]) {
    return "png";
  }
  return null;
}

export async function validateUploadedFile(
  buffer: Buffer,
  mimeType: string
): Promise<{ valid: boolean; error?: string }> {
  // Size check
  if (buffer.byteLength > MAX_FILE_SIZE) {
    return { valid: false, error: "File size must not exceed 10MB" };
  }

  // MIME type check
  const allowedMimes = ["image/jpeg", "image/png", "image/jpg"];
  if (!allowedMimes.includes(mimeType)) {
    return { valid: false, error: "Only JPG and PNG files are allowed" };
  }

  // Magic bytes check
  const detectedType = checkMagicBytes(buffer);
  if (!detectedType) {
    return { valid: false, error: "File does not appear to be a valid image" };
  }

  // Sharp decodability check
  try {
    await sharp(buffer).metadata();
  } catch {
    return { valid: false, error: "File is not a valid image" };
  }

  return { valid: true };
}

export async function saveUploadedFile(
  buffer: Buffer,
  originalName: string,
  folder: string = "smartresidence/payments"
): Promise<string> {
  // Ensure upload directory exists
  // const resolvedDir = path.resolve(UPLOAD_DIR);
  // fs.mkdirSync(resolvedDir, { recursive: true });

  // // Generate unique filename
  // const timestamp = Date.now();
  // const randomStr = Math.random().toString(36).substring(2, 8);
  // const filename = `${timestamp}-${randomStr}.jpg`;

  // // Resize to max 1200px width and re-encode as JPEG quality 80
  // const processedBuffer = await sharp(buffer)
  //   .resize({ width: 1200, fit: "inside" })
  //   .jpeg({ quality: 80 })
  //   .toBuffer();

  // const filepath = path.join(resolvedDir, filename);
  // fs.writeFileSync(filepath, processedBuffer);

  // return `/uploads/payments/${filename}`;

  // Detect MIME type from buffer
  const detectedType = checkMagicBytes(buffer);
  if (!detectedType) {
    throw new Error("Invalid image file");
  }
  const mimeType = detectedType === "jpeg" ? "image/jpeg" : "image/png";

  // Convert Buffer to base64 data URI
  const base64 = buffer.toString("base64");
  const dataUri = `data:${mimeType};base64,${base64}`;

  // Upload ke Cloudinary; folder "payments" untuk pengelolaan mudah
  const result = await cloudinary.uploader.upload(dataUri, {
    folder: folder,
    // Gunakan sharp (jika masih dipakai) atau biarkan Cloudinary transformasi otomatis
  });

  return result.secure_url;
}
