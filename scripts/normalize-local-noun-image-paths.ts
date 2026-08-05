import fs from "node:fs";
import path from "node:path";

const ROOT = "/Users/Sean/Desktop/nouns-backup/nouns";
const IMAGE_EXTENSION = /\.(png|jpe?g|webp)$/i;

type RenameOperation = {
  kind: "folder" | "file";
  source: string;
  destination: string;
};

function canonicalName(value: string) {
  return value
    .normalize("NFC")
    .trim()
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function canonicalFileName(fileName: string) {
  const extension = path.extname(fileName).toLowerCase();
  const stem = path.basename(fileName, path.extname(fileName));
  return `${canonicalName(stem)}${extension}`;
}

function nextVariantFileName(fileName: string, reserved: Set<string>) {
  const extension = path.extname(fileName).toLowerCase();
  const stem = path.basename(fileName, extension);
  const match = stem.match(/^(.*)_\d+$/);
  const base = match?.[1] ?? stem;
  let variant = 1;

  for (const name of reserved) {
    const candidateStem = path.basename(name, path.extname(name));
    const candidate = candidateStem.match(new RegExp(`^${base.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}_(\\d+)$`));
    if (candidate) variant = Math.max(variant, Number(candidate[1]) + 1);
  }

  let candidate = `${base}_${variant}${extension}`;
  while (reserved.has(candidate)) {
    variant += 1;
    candidate = `${base}_${variant}${extension}`;
  }
  return candidate;
}

function planFileRenames(directory: string) {
  const files = fs
    .readdirSync(directory, { withFileTypes: true })
    .filter((entry) => entry.isFile() && IMAGE_EXTENSION.test(entry.name))
    .map((entry) => entry.name);

  const operations: RenameOperation[] = [];
  const reserved = new Set(files.filter((file) => file === canonicalFileName(file)));

  for (const file of files.filter((item) => item !== canonicalFileName(item))) {
    let destinationName = canonicalFileName(file);
    if (reserved.has(destinationName)) {
      destinationName = nextVariantFileName(destinationName, reserved);
    }
    reserved.add(destinationName);
    operations.push({
      kind: "file",
      source: path.join(directory, file),
      destination: path.join(directory, destinationName),
    });
  }

  return operations;
}

function main() {
  const apply = process.argv.includes("--apply");
  const folderOperations: RenameOperation[] = [];
  const fileOperations: RenameOperation[] = [];

  const directories = fs
    .readdirSync(ROOT, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort((left, right) => left.localeCompare(right));

  for (const directoryName of directories) {
    const canonicalDirectory = canonicalName(directoryName);
    const source = path.join(ROOT, directoryName);
    fileOperations.push(...planFileRenames(source));

    if (!canonicalDirectory || canonicalDirectory === directoryName) continue;

    const destination = path.join(ROOT, canonicalDirectory);
    if (fs.existsSync(destination)) {
      throw new Error(`Refusing to merge local folders automatically: ${destination} exists.`);
    }

    folderOperations.push({ kind: "folder", source, destination });
  }

  console.log(
    JSON.stringify(
      {
        apply,
        root: ROOT,
        folderRenames: folderOperations.length,
        fileRenames: fileOperations.length,
        operations: [...folderOperations, ...fileOperations],
      },
      null,
      2
    )
  );

  if (!apply) return;

  for (const operation of fileOperations) {
    fs.renameSync(operation.source, operation.destination);
  }
  for (const operation of folderOperations) {
    fs.renameSync(operation.source, operation.destination);
  }
}

main();
