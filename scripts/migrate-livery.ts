import { uploadToFirebaseStorage } from "../server/firebase-admin";
import { storage } from "../server/storage";
import fs from "fs";
import path from "path";

async function migrate() {
  const items = await storage.getAllLivery();
  for (const item of items) {
    if (item.imageUrl && item.imageUrl.startsWith("/uploads/livery/")) {
      const localPath = path.resolve(process.cwd(), "client/public" + item.imageUrl);
      if (fs.existsSync(localPath)) {
        const buffer = fs.readFileSync(localPath);
        const ext = path.extname(localPath).toLowerCase();
        const mimeMap: Record<string, string> = { ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png", ".gif": "image/gif", ".webp": "image/webp" };
        const mimeType = mimeMap[ext] || "application/octet-stream";
        const storagePath = `livery/${item.imageKey}${ext}`;
        const firebaseUrl = await uploadToFirebaseStorage(storagePath, buffer, mimeType);
        await storage.updateLiveryImage(item.imageKey, firebaseUrl, item.mediaType || "image");
        console.log(`Migrated ${item.imageKey}: ${item.imageUrl} -> ${firebaseUrl}`);
      } else {
        console.log(`File not found: ${localPath}`);
      }
    }
  }
  console.log("Migration complete");
  process.exit(0);
}

migrate().catch(err => { console.error(err); process.exit(1); });
