# Upload photos to Yandex Object Storage (CDN origin)

Upload local images to a Yandex Cloud Object Storage bucket via the S3-compatible API. Yandex CDN usually uses the bucket as origin — after upload, objects are available through your CDN hostname.

## Features

- Concurrent uploads with bounded parallelism
- Automatic retries with exponential backoff for transient errors
- Resume: successful files are recorded in `.upload-state.json`; re-run uploads only missing/changed files
- Optional `--sync-remote` to rebuild local state from the bucket if the state file was lost
- Dry-run mode

## Setup

1. Create a bucket in [Object Storage](https://console.yandex.cloud/folders) and (optionally) attach a CDN resource to it.
2. Create a static access key for a service account with `storage.uploader` (or broader) permissions.
3. Copy env template:

```bash
copy scripts\yc-upload\env.example scripts\yc-upload\env.local
```

4. Fill `YC_ACCESS_KEY_ID`, `YC_SECRET_ACCESS_KEY`, `YC_BUCKET` in `env.local`.

Credentials can also be passed via process environment; existing env vars win over `env.local`.

## Run

```bash
# dry-run (scan only)
npm run upload:yc -- --dry-run

# upload (resume-safe)
npm run upload:yc

# if state file was lost but files already exist in the bucket
npm run upload:yc -- --sync-remote
```

Or:

```bash
node --env-file=scripts/yc-upload/env.local scripts/yc-upload/index.mjs
```

## Resume behavior

After each successful upload the script stores `{ relativePath → size, mtime, etag, key }` in `YC_STATE_FILE`. On the next run it skips files whose size and mtime still match. Failed files are not marked and will be retried automatically.

## Layout

| Module | Responsibility |
|--------|----------------|
| `config.mjs` | Load/validate configuration |
| `file-scanner.mjs` | Discover local images |
| `upload-state.mjs` | Persist resume state |
| `storage-client.mjs` | Yandex Object Storage S3 adapter |
| `upload-service.mjs` | Orchestrate upload pipeline |
| `utils.mjs` | Retry, concurrency, MIME helpers |
| `index.mjs` | CLI composition root |
