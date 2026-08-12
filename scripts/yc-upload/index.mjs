#!/usr/bin/env node
/**
 * Upload photos to Yandex Object Storage (CDN origin) with resume support.
 *
 * Usage:
 *   npm run upload:yc -- --dry-run
 *   npm run upload:yc -- --sync-remote
 *   npm run upload:yc -- --source "D:\\catalogarchivesgov\\belarus" --concurrency 12
 */

import { access, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadConfig } from "./config.mjs";
import { YandexObjectStorageClient } from "./storage-client.mjs";
import { UploadService } from "./upload-service.mjs";
import { UploadStateStore } from "./upload-state.mjs";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));

/**
 * Loads KEY=VALUE pairs into process.env without overriding existing vars.
 * @param {string} filePath
 * @returns {Promise<boolean>}
 */
async function loadEnvFile(filePath) {
  let raw;
  try {
    raw = await readFile(filePath, "utf8");
  } catch (error) {
    if (/** @type {NodeJS.ErrnoException} */ (error).code === "ENOENT") {
      return false;
    }
    throw error;
  }

  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    const eq = trimmed.indexOf("=");
    if (eq <= 0) continue;

    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    if (process.env[key] == null || process.env[key] === "") {
      process.env[key] = value;
    }
  }

  return true;
}

/**
 * @param {string[]} argv
 */
function parseArgs(argv) {
  /** @type {Record<string, string | boolean>} */
  const result = {};

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];

    if (arg === "--dry-run") {
      result.dryRun = true;
      continue;
    }
    if (arg === "--sync-remote") {
      result.syncRemote = true;
      continue;
    }
    if (arg === "--source" || arg === "--source-dir") {
      result.sourceDir = argv[++i];
      continue;
    }
    if (arg === "--state-file") {
      result.stateFile = argv[++i];
      continue;
    }
    if (arg === "--prefix") {
      result.prefix = argv[++i];
      continue;
    }
    if (arg === "--concurrency") {
      result.concurrency = argv[++i];
      continue;
    }
    if (arg === "--help" || arg === "-h") {
      result.help = true;
      continue;
    }

    throw new Error(`Unknown argument: ${arg}`);
  }

  return result;
}

function printHelp() {
  console.log(`Upload images to Yandex Object Storage (S3 API / CDN origin).

Required env:
  YC_ACCESS_KEY_ID
  YC_SECRET_ACCESS_KEY
  YC_BUCKET

Optional env:
  YC_ENDPOINT          default https://storage.yandexcloud.net
  YC_REGION            default ru-central1
  YC_PREFIX            default belarus/
  YC_SOURCE_DIR        default D:\\catalogarchivesgov\\belarus
  YC_STATE_FILE        default scripts/yc-upload/.upload-state.json
  YC_CONCURRENCY       default 8
  YC_MAX_RETRIES       default 5
  YC_PUBLIC_BASE_URL   e.g. https://<cdn-host> or https://storage.yandexcloud.net/<bucket>

Flags:
  --dry-run            scan and report only
  --sync-remote        import existing remote keys into local state, then upload missing
  --source <dir>
  --prefix <prefix>
  --concurrency <n>
  --state-file <path>
`);
}

/**
 * @param {import("./config.mjs").UploadConfig} config
 * @param {import("./upload-service.mjs").UploadStats} stats
 */
function printSummary(config, stats) {
  console.log("");
  console.log("── summary ──");
  console.log(`bucket:    ${config.bucket}`);
  console.log(`prefix:    ${config.prefix || "(root)"}`);
  console.log(`source:    ${config.sourceDir}`);
  console.log(`state:     ${config.stateFile}`);
  console.log(`total:     ${stats.total}`);
  console.log(`skipped:   ${stats.skipped}`);
  console.log(`uploaded:  ${stats.uploaded}`);
  console.log(`failed:    ${stats.failed}`);

  if (config.publicBaseUrl && stats.uploaded > 0) {
    console.log(`cdn base:  ${config.publicBaseUrl}/${config.prefix}`);
  }

  if (stats.failures.length > 0) {
    console.log("");
    console.log("Failed files (re-run the script to retry only these):");
    for (const failure of stats.failures.slice(0, 20)) {
      console.log(`  - ${failure.path}: ${failure.error}`);
    }
    if (stats.failures.length > 20) {
      console.log(`  … and ${stats.failures.length - 20} more`);
    }
  }
}

async function main() {
  const cli = parseArgs(process.argv.slice(2));

  if (cli.help) {
    printHelp();
    return;
  }

  const envPath = path.join(scriptDir, "env.local");
  const loaded = await loadEnvFile(envPath);
  if (loaded) {
    console.log(`Loaded env from ${envPath}`);
  }

  const config = loadConfig(cli);

  try {
    await access(config.sourceDir);
  } catch {
    throw new Error(`Source directory not found: ${config.sourceDir}`);
  }

  const storage = new YandexObjectStorageClient({
    endpoint: config.endpoint,
    region: config.region,
    bucket: config.bucket,
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    },
  });

  const state = new UploadStateStore(config.stateFile, {
    bucket: config.bucket,
    prefix: config.prefix,
    sourceDir: config.sourceDir,
  });

  try {
    await state.load();
    console.log(`State loaded: ${state.uploadedCount} recorded uploads`);

    const service = new UploadService(config, storage, state);

    if (config.syncRemote) {
      console.log("Syncing remote object list into local state…");
      const imported = await service.syncRemoteIntoState();
      console.log(`Remote sync done: ${imported} objects under prefix`);
    }

    const stats = await service.run();
    printSummary(config, stats);

    if (stats.failed > 0) {
      process.exitCode = 1;
    }
  } finally {
    storage.destroy();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
