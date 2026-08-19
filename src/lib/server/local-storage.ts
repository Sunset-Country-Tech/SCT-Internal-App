import { randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const allowedImageTypes = new Map([
  ["image/png", ".png"],
  ["image/jpeg", ".jpg"],
  ["image/webp", ".webp"],
]);

export type StoredJobImage = {
  originalName: string;
  storedName: string;
  relativePath: string;
  mimeType: string;
  size: number;
};

export function localUploadRoot() {
  return path.resolve(process.env.LOCAL_UPLOAD_DIR || path.join(process.cwd(), "data", "uploads"));
}

function safeSegment(value: string) {
  return value.replace(/[^a-zA-Z0-9._-]/g, "-").replace(/-+/g, "-").slice(0, 96) || "upload";
}

function safeOriginalName(value: string) {
  return path.basename(value).replace(/[\r\n"]/g, "").slice(0, 180) || "job-photo";
}

export function localJobImagePath(relativePath: string) {
  const root = localUploadRoot();
  const resolved = path.resolve(root, relativePath);
  if (resolved !== root && !resolved.startsWith(`${root}${path.sep}`)) {
    throw new Error("Invalid attachment path.");
  }
  return resolved;
}

export async function storeLocalJobImage(file: File, jobNumber: string): Promise<StoredJobImage> {
  const extension = allowedImageTypes.get(file.type);
  if (!extension) {
    throw new Error("Unsupported image type.");
  }

  const root = localUploadRoot();
  const jobFolder = path.posix.join("jobs", safeSegment(jobNumber));
  const directory = path.join(root, jobFolder);
  await mkdir(directory, { recursive: true });

  const originalName = safeOriginalName(file.name || `job-photo${extension}`);
  const storedName = `${Date.now()}-${randomUUID()}${extension}`;
  const relativePath = path.posix.join(jobFolder, storedName);
  const bytes = Buffer.from(await file.arrayBuffer());
  await writeFile(path.join(root, relativePath), bytes, { flag: "wx" });

  return {
    originalName,
    storedName,
    relativePath,
    mimeType: file.type,
    size: bytes.byteLength,
  };
}

export async function readLocalJobImage(relativePath: string) {
  return readFile(localJobImagePath(relativePath));
}
