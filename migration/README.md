# Vocabulary storage transfer manifest

Generate the read-only transfer plan with:

```bash
node --import tsx scripts/generate-vocab-storage-transfer-manifest.ts
```

The command inventories the five local image folders and the live Supabase
`vocab-images` bucket. It does not upload, overwrite, or delete anything.

Outputs:

- `vocab-storage-transfer-manifest.json`: complete machine-readable audit,
  including unclaimed Supabase objects.
- `vocab-storage-transfer-manifest.csv`: one row per local image for review.

Actions:

- `skip_verified`: the local and remote objects are checksum-equivalent.
- `replace_placeholder`: the destination contains a known placeholder.
- `replace_different`: the destination contains different non-placeholder data.
- `upload_missing`: the destination does not exist.
- `needs_review`: the mapping is ambiguous or uses a suggested semantic alias.

Do not run a transfer while `transferSafe` is `false`. Resolve every
`needs_review` row first and regenerate the manifest.

When the manifest is safe, validate the upload without changing storage:

```bash
node --import tsx scripts/upload-vocab-storage-transfer.ts --dry-run
```

Run the manifest-driven upload:

```bash
node --import tsx scripts/upload-vocab-storage-transfer.ts
```

The uploader handles only `upload_missing` and `replace_placeholder`. It refuses
to run if the manifest has collisions, review rows, changed local files, or
different non-placeholder remote objects.
