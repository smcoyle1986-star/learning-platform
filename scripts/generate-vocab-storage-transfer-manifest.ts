import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";

import { createClient } from "@supabase/supabase-js";

const BUCKET = "vocab-images";
const OUTPUT_DIRECTORY = path.join(process.cwd(), "migration");
const JSON_OUTPUT = path.join(OUTPUT_DIRECTORY, "vocab-storage-transfer-manifest.json");
const CSV_OUTPUT = path.join(OUTPUT_DIRECTORY, "vocab-storage-transfer-manifest.csv");

type Category = "verbs" | "nouns" | "adjectives" | "prepositions" | "phonics";
type Action =
  | "skip_verified"
  | "replace_placeholder"
  | "replace_different"
  | "upload_missing"
  | "needs_review";

type StorageEntry = {
  name: string;
  id?: string | null;
  metadata?: {
    eTag?: string;
    size?: number;
    mimetype?: string;
  } | null;
};

type RemoteObject = {
  path: string;
  size: number;
  etag: string;
  contentType: string;
};

type LocalCandidate = {
  category: Category;
  sourcePath: string;
  sourceRelativePath: string;
  localFolder: string;
  destinationFolder: string;
  destinationPath: string;
  mappingRule: string;
  reviewReason: string | null;
  size: number;
  sha256: string;
};

type ManifestEntry = LocalCandidate & {
  action: Action;
  databaseReferenced: boolean;
  remoteExists: boolean;
  remoteSize: number | null;
  remoteEtag: string | null;
  remoteContentType: string | null;
};

type CategorySpec = {
  category: Category;
  localRoot: string;
  layout: "preserve" | "flatten";
};

const CATEGORY_SPECS: CategorySpec[] = [
  {
    category: "verbs",
    localRoot: "/Users/Sean/Desktop/verbs-backup/verbs",
    layout: "preserve",
  },
  {
    category: "nouns",
    localRoot: "/Users/Sean/Desktop/nouns-backup/nouns",
    layout: "preserve",
  },
  {
    category: "adjectives",
    localRoot: "/Users/Sean/Desktop/adjectives",
    layout: "flatten",
  },
  {
    category: "prepositions",
    localRoot: "/Users/Sean/Desktop/prepositions",
    layout: "flatten",
  },
  {
    category: "phonics",
    localRoot: "/Users/Sean/Desktop/phonics",
    layout: "flatten",
  },
];

const REVIEW_ALIASES: Partial<Record<Category, Record<string, string>>> = {
  nouns: {
    airplane_toy: "toy_plane",
    cold: "cold_weather",
    field_hockey: "hockey",
    ice_hockey: "hockey",
    lake: "lake_place",
    rainy: "raining",
    river: "river_place",
    swimming_class: "swimming",
    toilet: "toilet_rooms",
  },
  adjectives: {
    embarrased: "embarrassed",
    fruastrated: "frustrated",
    pruple: "purple",
  },
};

const IMAGE_EXTENSION = /\.(png|jpe?g|webp)$/i;
const IGNORED_LOCAL_FILES = new Set([".DS_Store"]);
const IGNORED_REMOTE_NAMES = new Set([
  ".emptyFolderPlaceholder",
  ".keep",
]);
const KNOWN_PLACEHOLDER_ETAGS = new Set([
  "18ba1e98e677edf2347cd523f1ec5794",
]);

function loadEnvFile(filePath: string) {
  if (!fs.existsSync(filePath)) return;

  for (const line of fs.readFileSync(filePath, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const separator = trimmed.indexOf("=");
    if (separator < 1) continue;

    const key = trimmed.slice(0, separator).trim();
    let value = trimmed.slice(separator + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!(key in process.env)) process.env[key] = value;
  }
}

function canonicalName(value: string) {
  return value
    .normalize("NFC")
    .trim()
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function normalizeFileName(fileName: string, destinationFolder: string, category: Category) {
  const extension = path.extname(fileName).toLowerCase();
  const stem = path.basename(fileName, path.extname(fileName));

  if (category === "phonics" && /^([a-z])\1_\d+$/i.test(stem)) {
    const suffix = stem.slice(2);
    return `${destinationFolder}${suffix}${extension}`;
  }

  return `${canonicalName(stem)}${extension}`;
}

function stripEtag(value: string | undefined) {
  return String(value ?? "").replaceAll('"', "");
}

function localMatchesEtag(filePath: string, remoteEtag: string) {
  if (!remoteEtag) return false;
  const content = fs.readFileSync(filePath);
  const digest = createHash("md5").update(content).digest();

  if (remoteEtag.endsWith("-1")) {
    return `${createHash("md5").update(digest).digest("hex")}-1` === remoteEtag;
  }

  return digest.toString("hex") === remoteEtag;
}

function isKnownPlaceholder(remote: RemoteObject) {
  return (
    (remote.size === 70 && KNOWN_PLACEHOLDER_ETAGS.has(remote.etag)) ||
    IGNORED_REMOTE_NAMES.has(path.posix.basename(remote.path))
  );
}

function listLocalImages(root: string) {
  const files: string[] = [];
  let ignoredFileCount = 0;

  function walk(directory: string) {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      const fullPath = path.join(directory, entry.name);
      if (entry.isDirectory()) {
        walk(fullPath);
      } else if (entry.isFile()) {
        if (IGNORED_LOCAL_FILES.has(entry.name)) {
          ignoredFileCount += 1;
        } else if (IMAGE_EXTENSION.test(entry.name)) {
          files.push(fullPath);
        }
      }
    }
  }

  walk(root);
  files.sort((left, right) => left.localeCompare(right));
  return { files, ignoredFileCount };
}

function csvCell(value: unknown) {
  const text = value === null || value === undefined ? "" : String(value);
  return `"${text.replaceAll('"', '""')}"`;
}

async function main() {
  loadEnvFile(path.join(process.cwd(), ".env.local"));
  loadEnvFile(path.join(process.cwd(), ".env"));

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.");
  }

  for (const spec of CATEGORY_SPECS) {
    if (!fs.existsSync(spec.localRoot)) {
      throw new Error(`Local source folder does not exist: ${spec.localRoot}`);
    }
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const bucket = supabase.storage.from(BUCKET);

  async function listAll(folder: string) {
    const rows: StorageEntry[] = [];
    for (let offset = 0; ; offset += 1000) {
      const { data, error } = await bucket.list(folder, {
        limit: 1000,
        offset,
        sortBy: { column: "name", order: "asc" },
      });
      if (error) throw new Error(`${folder}: ${error.message}`);
      const batch = (data ?? []) as StorageEntry[];
      rows.push(...batch);
      if (batch.length < 1000) break;
    }
    return rows;
  }

  async function walkRemote(folder: string, objects: Map<string, RemoteObject>) {
    for (const entry of await listAll(folder)) {
      const objectPath = `${folder}/${entry.name}`;
      if (entry.id) {
        objects.set(objectPath, {
          path: objectPath,
          size: Number(entry.metadata?.size ?? -1),
          etag: stripEtag(entry.metadata?.eTag),
          contentType: String(entry.metadata?.mimetype ?? ""),
        });
      } else {
        await walkRemote(objectPath, objects);
      }
    }
  }

  const remoteObjects = new Map<string, RemoteObject>();
  const remoteFoldersByCategory = new Map<Category, string[]>();

  for (const spec of CATEGORY_SPECS) {
    const topLevelEntries = await listAll(spec.category);
    remoteFoldersByCategory.set(
      spec.category,
      topLevelEntries.filter((entry) => !entry.id).map((entry) => entry.name)
    );
    await walkRemote(spec.category, remoteObjects);
  }

  const { data: referenceRows, error: referenceError } = await supabase
    .from("vocab_images")
    .select("image_path");
  if (referenceError) throw referenceError;
  const databaseReferences = new Set(
    (referenceRows ?? []).map((row) => String(row.image_path ?? "")).filter(Boolean)
  );

  const localCandidates: LocalCandidate[] = [];
  const ignoredLocalFiles: Record<Category, number> = {
    verbs: 0,
    nouns: 0,
    adjectives: 0,
    prepositions: 0,
    phonics: 0,
  };

  for (const spec of CATEGORY_SPECS) {
    const { files, ignoredFileCount } = listLocalImages(spec.localRoot);
    ignoredLocalFiles[spec.category] = ignoredFileCount;

    const remoteFolders = remoteFoldersByCategory.get(spec.category) ?? [];
    const remoteFolderSet = new Set(remoteFolders);
    const remoteFoldersByCanonical = new Map<string, string[]>();
    for (const folder of remoteFolders) {
      const key = canonicalName(folder);
      const matches = remoteFoldersByCanonical.get(key) ?? [];
      matches.push(folder);
      remoteFoldersByCanonical.set(key, matches);
    }

    for (const sourcePath of files) {
      const sourceRelativePath = path.relative(spec.localRoot, sourcePath).split(path.sep).join("/");
      const localFolder = sourceRelativePath.split("/").at(-2) ?? "";
      let destinationFolder = localFolder;
      let mappingRule = spec.layout === "preserve" ? "preserve_relative_path" : "flatten_to_lemma";
      let reviewReason: string | null = null;

      const canonicalLocalFolder = canonicalName(localFolder);
      const aliasTarget = REVIEW_ALIASES[spec.category]?.[canonicalLocalFolder];

      if (aliasTarget) {
        destinationFolder = aliasTarget;
        mappingRule = "suggested_semantic_alias";
        reviewReason = `${localFolder} may be an alias of existing Supabase folder ${aliasTarget}`;
      } else if (spec.category === "phonics" && /^([a-z])\1$/i.test(localFolder)) {
        destinationFolder =
          localFolder.toLowerCase() === "ii" && remoteFolderSet.has("Ii")
            ? "Ii"
            : localFolder[0].toLowerCase();
        mappingRule = "phonics_letter_folder";
      } else if (remoteFolderSet.has(localFolder)) {
        destinationFolder = localFolder;
      } else if (spec.layout === "preserve") {
        destinationFolder = localFolder;
        mappingRule = "preserve_relative_path";
      } else {
        const canonicalMatches = remoteFoldersByCanonical.get(canonicalLocalFolder) ?? [];
        if (canonicalMatches.length === 1) {
          destinationFolder = canonicalMatches[0];
          mappingRule = "canonical_existing_folder";
        } else if (canonicalMatches.length > 1) {
          destinationFolder = canonicalLocalFolder;
          mappingRule = "ambiguous_existing_alias";
          reviewReason = `${localFolder} matches multiple Supabase folders: ${canonicalMatches.join(", ")}`;
        } else if (spec.layout === "flatten") {
          destinationFolder = canonicalLocalFolder;
          mappingRule = "new_canonical_folder";
        }
      }

      let destinationPath: string;
      if (spec.layout === "preserve" && mappingRule === "preserve_relative_path") {
        destinationPath = `${spec.category}/${sourceRelativePath}`;
      } else {
        destinationPath = `${spec.category}/${destinationFolder}/${normalizeFileName(
          path.basename(sourcePath),
          destinationFolder,
          spec.category
        )}`;
      }

      localCandidates.push({
        category: spec.category,
        sourcePath,
        sourceRelativePath,
        localFolder,
        destinationFolder,
        destinationPath,
        mappingRule,
        reviewReason,
        size: fs.statSync(sourcePath).size,
        sha256: createHash("sha256").update(fs.readFileSync(sourcePath)).digest("hex"),
      });
    }
  }

  const candidatesByDestination = new Map<string, LocalCandidate[]>();
  for (const candidate of localCandidates) {
    const matches = candidatesByDestination.get(candidate.destinationPath) ?? [];
    matches.push(candidate);
    candidatesByDestination.set(candidate.destinationPath, matches);
  }

  const entries: ManifestEntry[] = localCandidates.map((candidate) => {
    const collisions = candidatesByDestination.get(candidate.destinationPath) ?? [];
    const remote = remoteObjects.get(candidate.destinationPath);
    let action: Action;
    let reviewReason = candidate.reviewReason;

    if (collisions.length > 1) {
      action = "needs_review";
      reviewReason = `Multiple local files map to ${candidate.destinationPath}`;
    } else if (reviewReason) {
      action = "needs_review";
    } else if (!remote) {
      action = "upload_missing";
    } else if (isKnownPlaceholder(remote)) {
      action = "replace_placeholder";
    } else if (
      remote.size === candidate.size &&
      localMatchesEtag(candidate.sourcePath, remote.etag)
    ) {
      action = "skip_verified";
    } else {
      action = "replace_different";
    }

    return {
      ...candidate,
      reviewReason,
      action,
      databaseReferenced: databaseReferences.has(candidate.destinationPath),
      remoteExists: Boolean(remote),
      remoteSize: remote?.size ?? null,
      remoteEtag: remote?.etag ?? null,
      remoteContentType: remote?.contentType ?? null,
    };
  });

  entries.sort((left, right) => left.destinationPath.localeCompare(right.destinationPath));

  const actionCounts = entries.reduce<Record<Action, number>>(
    (counts, entry) => {
      counts[entry.action] += 1;
      return counts;
    },
    {
      skip_verified: 0,
      replace_placeholder: 0,
      replace_different: 0,
      upload_missing: 0,
      needs_review: 0,
    }
  );

  const categorySummaries = CATEGORY_SPECS.map((spec) => {
    const categoryEntries = entries.filter((entry) => entry.category === spec.category);
    return {
      category: spec.category,
      localRoot: spec.localRoot,
      localImages: categoryEntries.length,
      ignoredLocalFiles: ignoredLocalFiles[spec.category],
      remoteObjects: [...remoteObjects.keys()].filter((objectPath) =>
        objectPath.startsWith(`${spec.category}/`)
      ).length,
      actions: categoryEntries.reduce<Record<Action, number>>(
        (counts, entry) => {
          counts[entry.action] += 1;
          return counts;
        },
        {
          skip_verified: 0,
          replace_placeholder: 0,
          replace_different: 0,
          upload_missing: 0,
          needs_review: 0,
        }
      ),
    };
  });

  const unclaimedRemoteObjects = [...remoteObjects.values()]
    .filter((remote) => !candidatesByDestination.has(remote.path))
    .map((remote) => ({
      path: remote.path,
      size: remote.size,
      etag: remote.etag,
      ignoredPlaceholder: IGNORED_REMOTE_NAMES.has(path.posix.basename(remote.path)),
      databaseReferenced: databaseReferences.has(remote.path),
    }))
    .sort((left, right) => left.path.localeCompare(right.path));

  const manifest = {
    schemaVersion: 1,
    bucket: BUCKET,
    generatedAt: new Date().toISOString(),
    transferSafe: actionCounts.needs_review === 0,
    actionCounts,
    categorySummaries,
    collisionCount: [...candidatesByDestination.values()].filter((items) => items.length > 1)
      .length,
    databaseReferenceCount: databaseReferences.size,
    unclaimedRemoteObjectCount: unclaimedRemoteObjects.length,
    unclaimedRemoteObjects,
    entries,
  };

  fs.mkdirSync(OUTPUT_DIRECTORY, { recursive: true });
  fs.writeFileSync(JSON_OUTPUT, `${JSON.stringify(manifest, null, 2)}\n`);

  const csvFields: Array<keyof ManifestEntry> = [
    "category",
    "action",
    "sourcePath",
    "destinationPath",
    "mappingRule",
    "reviewReason",
    "size",
    "sha256",
    "remoteExists",
    "remoteSize",
    "remoteEtag",
    "remoteContentType",
    "databaseReferenced",
  ];
  const csv = [
    csvFields.map(csvCell).join(","),
    ...entries.map((entry) => csvFields.map((field) => csvCell(entry[field])).join(",")),
  ].join("\n");
  fs.writeFileSync(CSV_OUTPUT, `${csv}\n`);

  console.log(
    JSON.stringify(
      {
        jsonOutput: JSON_OUTPUT,
        csvOutput: CSV_OUTPUT,
        transferSafe: manifest.transferSafe,
        actionCounts,
        collisionCount: manifest.collisionCount,
        unclaimedRemoteObjectCount: manifest.unclaimedRemoteObjectCount,
        categorySummaries,
      },
      null,
      2
    )
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
