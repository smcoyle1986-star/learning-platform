import fs from "node:fs";
import { open, readdir, stat } from "node:fs/promises";
import path from "node:path";

const env = {};
for (const line of fs.readFileSync(".env.local", "utf8").split(/\r?\n/)) {
  const separator = line.indexOf("=");
  if (separator > 0) env[line.slice(0, separator)] = line.slice(separator + 1);
}

const sourceDirectory = "public/free-resources";
const endpoint = "https://tsccyjrniiamnwgrtvpw.storage.supabase.co/storage/v1/upload/resumable";
const publicBaseUrl = "https://tsccyjrniiamnwgrtvpw.supabase.co/storage/v1/object/public/free-resources/12-card-packs";
const chunkSize = 6 * 1024 * 1024;
const token = env.SUPABASE_SERVICE_ROLE_KEY;

if (!token) throw new Error("SUPABASE_SERVICE_ROLE_KEY is missing from .env.local");

const encode = (value) => Buffer.from(value).toString("base64");

async function upload(fileName) {
  const filePath = path.join(sourceDirectory, fileName);
  const fileInfo = await stat(filePath);
  const objectName = "12-card-packs/" + fileName;
  const metadata = [
    "bucketName " + encode("free-resources"),
    "objectName " + encode(objectName),
    "contentType " + encode("application/pdf"),
    "cacheControl " + encode("3600"),
  ].join(",");
  const create = await fetch(endpoint, {
    method: "POST",
    headers: {
      authorization: "Bearer " + token,
      "tus-resumable": "1.0.0",
      "upload-length": String(fileInfo.size),
      "upload-metadata": metadata,
      "x-upsert": "true",
    },
  });

  if (!create.ok) throw new Error(fileName + ": create " + create.status + " " + (await create.text()));

  const location = new URL(create.headers.get("location"), endpoint).toString();
  const file = await open(filePath, "r");
  let offset = 0;

  try {
    while (offset < fileInfo.size) {
      const length = Math.min(chunkSize, fileInfo.size - offset);
      const buffer = Buffer.alloc(length);
      await file.read(buffer, 0, length, offset);
      const patch = await fetch(location, {
        method: "PATCH",
        headers: {
          authorization: "Bearer " + token,
          "tus-resumable": "1.0.0",
          "upload-offset": String(offset),
          "content-type": "application/offset+octet-stream",
          "x-upsert": "true",
        },
        body: buffer,
      });
      if (!patch.ok) throw new Error(fileName + ": patch " + patch.status + " " + (await patch.text()));
      offset = Number(patch.headers.get("upload-offset"));
    }
  } finally {
    await file.close();
  }

  console.log("Uploaded " + fileName + " — " + publicBaseUrl + "/" + fileName);
}

const allFiles = (await readdir(sourceDirectory))
  .filter((fileName) => fileName.endsWith("-12-card-lesson-pack-beginner-esl.pdf"))
  .sort();
const requestedFiles = process.argv.slice(2);
const files = requestedFiles.length ? allFiles.filter((fileName) => requestedFiles.includes(fileName)) : allFiles;

if (requestedFiles.length && files.length !== requestedFiles.length) {
  throw new Error("One or more requested PDF filenames were not found.");
}

const failures = [];
for (const fileName of files) {
  try {
    await upload(fileName);
  } catch (error) {
    failures.push(fileName + ": " + error.message);
    console.error("Skipped " + fileName + " — " + error.message);
  }
}

console.log("Finished " + (files.length - failures.length) + " of " + files.length + " full-quality PDFs.");
if (failures.length) {
  console.error("Files requiring a larger per-file limit:\n" + failures.join("\n"));
  process.exitCode = 2;
}
