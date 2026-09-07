#!/usr/bin/env node
/**
 * Upload ảnh sản phẩm từ SQLite store lên Cloudflare R2.
 * Tạo thumbnail WebP (200px + 100px) cho mỗi ảnh.
 * Cập nhật URL trong D1 database.
 *
 * Sử dụng:
 *   node upload_images.mjs              # Upload + update D1
 *   node upload_images.mjs --dry-run    # Chỉ in danh sách file sẽ upload
 *   node upload_images.mjs --force      # Upload lại tất cả (bỏ qua check exists)
 */

import { S3Client, PutObjectCommand, HeadObjectCommand } from "@aws-sdk/client-s3";
import sharp from "sharp";
import Database from "better-sqlite3";
import fs from "fs";
import path from "path";
import { execSync } from "child_process";

// ── Config ────────────────────────────────────────────────────────────
const SOURCE_DB = String.raw`C:\Users\Admin\Desktop\pos\pos\stores\default\pos.db`;
const SOURCE_UPLOADS = String.raw`C:\Users\Admin\Desktop\pos\pos\stores\default\uploads`;
const R2_ENDPOINT = "https://83a8ebb873824df8e60c93826d5c4513.r2.cloudflarestorage.com";
const R2_ACCESS_KEY = "517578ba4ff27593351ee4fe790cf392";
const R2_SECRET_KEY = "84eeaedfac10078eb4f7186f7a84418da879ead3c28a28da14e6a0d4620b6add";
const R2_BUCKET = "shop";
const R2_PUBLIC_BASE = "https://pub-8fa475d2a2b841ebbc3d46a6806eea33.r2.dev";
const D1_NAME = "pos-free";
const R2_PREFIX = "pos-uploads";

// Thumbnail sizes
const THUMB_SIZES = [
  { name: "200", width: 200 },
  { name: "100", width: 100 },
];

// ── Args ──────────────────────────────────────────────────────────────
const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const forceUpload = args.includes("--force");

// ── S3 Client ─────────────────────────────────────────────────────────
const s3 = new S3Client({
  region: "auto",
  endpoint: R2_ENDPOINT,
  credentials: {
    accessKeyId: R2_ACCESS_KEY,
    secretAccessKey: R2_SECRET_KEY,
  },
});

// ── Helpers ───────────────────────────────────────────────────────────
async function existsInR2(key) {
  try {
    await s3.send(new HeadObjectCommand({ Bucket: R2_BUCKET, Key: key }));
    return true;
  } catch {
    return false;
  }
}

async function uploadToR2(key, body, contentType) {
  await s3.send(
    new PutObjectCommand({
      Bucket: R2_BUCKET,
      Key: key,
      Body: body,
      ContentType: contentType,
      CacheControl: "public, max-age=31536000, immutable",
    })
  );
}

// ── Main ──────────────────────────────────────────────────────────────
console.log("🔄 Đang đọc danh sách ảnh từ database...");

const db = new Database(SOURCE_DB, { readonly: true });
const products = db
  .prepare(
    "SELECT id, name, image_url FROM product WHERE image_url IS NOT NULL AND image_url != '' AND is_topping = 0"
  )
  .all();
db.close();

// Lọc ảnh unique
const uniqueImages = new Map();
for (const p of products) {
  const url = p.image_url;
  if (!url) continue;
  const match = url.match(/\/uploads\/([^?]+)/);
  if (!match) continue;
  const filename = match[1];
  if (!uniqueImages.has(filename)) uniqueImages.set(filename, []);
  uniqueImages.get(filename).push({ id: p.id, name: p.name });
}

console.log(`📊 Tìm thấy ${uniqueImages.size} ảnh unique từ ${products.length} sản phẩm`);

if (dryRun) {
  // Show size comparison
  let totalOriginal = 0;
  let count = 0;
  for (const [filename] of uniqueImages) {
    const localPath = path.join(SOURCE_UPLOADS, filename);
    if (fs.existsSync(localPath)) {
      totalOriginal += fs.statSync(localPath).size;
      count++;
    }
  }
  console.log(`\n📋 Dry-run: ${count} ảnh, tổng ${(totalOriginal / 1024 / 1024).toFixed(1)}MB (gốc)`);
  console.log(`   Sẽ tạo: ${count * THUMB_SIZES.length} thumbnails WebP`);
  process.exit(0);
}

// ── Upload ────────────────────────────────────────────────────────────
let uploadCount = 0;
let thumbCount = 0;
let skipCount = 0;
let errorCount = 0;
const urlMappings = new Map(); // old_url -> new_thumb_url (default 200px)

for (const [filename, prods] of uniqueImages) {
  const localPath = path.join(SOURCE_UPLOADS, filename);
  if (!fs.existsSync(localPath)) {
    console.log(`  ⚠️  Missing: ${filename}`);
    errorCount++;
    continue;
  }

  const baseName = path.parse(filename).name;

  // Upload original (optimized)
  const origKey = `${R2_PREFIX}/${filename}`;
  if (!forceUpload && await existsInR2(origKey)) {
    skipCount++;
  } else {
    try {
      const input = fs.readFileSync(localPath);
      // Optimize: resize to max 800px if larger, keep format
      const optimized = await sharp(input)
        .resize(800, 800, { fit: "inside", withoutEnlargement: true })
        .toBuffer();
      await uploadToR2(origKey, optimized, "image/webp");
      uploadCount++;
    } catch (err) {
      console.error(`  ❌ Original failed: ${filename} - ${err.message}`);
      errorCount++;
      continue;
    }
  }

  // Upload thumbnails
  for (const size of THUMB_SIZES) {
    const thumbKey = `${R2_PREFIX}/${size.name}/${baseName}.webp`;
    if (!forceUpload && await existsInR2(thumbKey)) {
      skipCount++;
      continue;
    }
    try {
      const input = fs.readFileSync(localPath);
      const thumb = await sharp(input)
        .resize(size.width, size.width, { fit: "cover" })
        .webp({ quality: 80 })
        .toBuffer();
      await uploadToR2(thumbKey, thumb, "image/webp");
      thumbCount++;
    } catch (err) {
      console.error(`  ❌ Thumb ${size.name} failed: ${filename} - ${err.message}`);
    }
  }

  // Map old URLs → 200px WebP thumbnail (default display size)
  const thumb200Url = `${R2_PUBLIC_BASE}/${R2_PREFIX}/200/${baseName}.webp`;
  for (const p of prods) {
    urlMappings.set(`/uploads/${filename}`, thumb200Url);
    urlMappings.set(`/uploads/${filename}?v=2`, thumb200Url);
    urlMappings.set(`/uploads/${filename}?v=3`, thumb200Url);
  }

  if ((uploadCount + thumbCount) % 20 === 0 && uploadCount + thumbCount > 0) {
    console.log(`  ✅ Progress: ${uploadCount} originals + ${thumbCount} thumbs...`);
  }
}

console.log(`\n📊 Upload results:`);
console.log(`   Originals: ${uploadCount} uploaded`);
console.log(`   Thumbnails: ${thumbCount} uploaded`);
console.log(`   Skipped: ${skipCount} (already exists)`);
console.log(`   Errors: ${errorCount}`);

// ── Update D1 URLs ────────────────────────────────────────────────────
console.log("\n🔄 Đang cập nhật URL trong D1...");

const updateLines = [];
for (const [oldUrl, newUrl] of urlMappings) {
  const escapedOld = oldUrl.replace(/'/g, "''");
  const escapedNew = newUrl.replace(/'/g, "''");
  updateLines.push(
    `UPDATE products SET image_url = '${escapedNew}' WHERE image_url = '${escapedOld}';`
  );
}

const sqlContent = updateLines.join("\n");
const sqlFile = "_update_urls.sql";
fs.writeFileSync(sqlFile, sqlContent, "utf-8");

try {
  const output = execSync(
    `npx wrangler d1 execute ${D1_NAME} --remote --file="${sqlFile}"`,
    { encoding: "utf-8", stdio: "pipe" }
  );
  console.log(output);
  console.log("✅ Cập nhật URL thành công!");
} catch (e) {
  console.error("❌ Lỗi cập nhật D1:", e.stderr || e.message);
} finally {
  if (fs.existsSync(sqlFile)) fs.unlinkSync(sqlFile);
}

// ── Summary ───────────────────────────────────────────────────────────
console.log("\n📋 Cấu trúc ảnh trên R2:");
console.log(`   ${R2_PUBLIC_BASE}/${R2_PREFIX}/filename.ext      → Original (max 800px)`);
console.log(`   ${R2_PUBLIC_BASE}/${R2_PREFIX}/200/filename.webp  → 200px WebP (default)`);
console.log(`   ${R2_PUBLIC_BASE}/${R2_PREFIX}/100/filename.webp  → 100px WebP (mobile/thumb)`);
console.log("\n✅ Hoàn tất!");
