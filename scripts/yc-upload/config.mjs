import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDir, "../..");

const IMAGE_EXTENSIONS = new Set([
  ".jpg",
  ".jpeg",
  ".png",
  ".webp",
  ".gif",
  ".tif",
  ".tiff",
  ".bmp",
  ".heic",
  ".heif",
]);

/**
 * @typedef {object} UploadConfig
 * @property {string} accessKeyId
 * @property {string} secretAccessKey
 * @property {string} bucket
 * @property {string} endpoint
 * @property {string} region
 * @property {string} prefix
 * @property {string} sourceDir
 * @property {string} stateFile
 * @property {number} concurrency
 * @property {number} maxRetries
 * @property {boolean} dryRun
 * @property {boolean} syncRemote
 * @property {string | null} publicBaseUrl
 * @property {ReadonlySet<string>} imageExtensions
 */

/**
 * @param {string | undefined} value
 * @param {string} name
 * @returns {string}
 */
function requireEnv(value, name) {
  if (!value?.trim()) {
    throw new Error(`Missing required env: ${name}`);
  }
  return value.trim();
}

/**
 * @param {string | undefined} value
 * @param {number} fallback
 * @returns {number}
 */
function parsePositiveInt(value, fallback) {
  if (value == null || value === "") return fallback;
  const n = Number.parseInt(value, 10);
  if (!Number.isFinite(n) || n < 1) {
    throw new Error(`Expected positive integer, got: ${value}`);
  }
  return n;
}

/**
 * @param {string} prefix
 * @returns {string}
 */
function normalizePrefix(prefix) {
  const trimmed = prefix.trim().replace(/^\/+|\/+$/g, "");
  return trimmed ? `${trimmed}/` : "";
}

/**
 * @param {Record<string, string | boolean | undefined>} cli
 * @returns {UploadConfig}
 */
export function loadConfig(cli = {}) {
  const accessKeyId = requireEnv(
    process.env.YC_ACCESS_KEY_ID ?? process.env.AWS_ACCESS_KEY_ID,
    "YC_ACCESS_KEY_ID",
  );
  const secretAccessKey = requireEnv(
    process.env.YC_SECRET_ACCESS_KEY ?? process.env.AWS_SECRET_ACCESS_KEY,
    "YC_SECRET_ACCESS_KEY",
  );
  const bucket = requireEnv(process.env.YC_BUCKET, "YC_BUCKET");

  const sourceDir = path.resolve(
    String(cli.sourceDir ?? process.env.YC_SOURCE_DIR ?? "D:\\catalogarchivesgov\\belarus"),
  );
  const stateFile = path.resolve(
    String(
      cli.stateFile ??
        process.env.YC_STATE_FILE ??
        path.join(projectRoot, "scripts", "yc-upload", ".upload-state.json"),
    ),
  );

  return {
    accessKeyId,
    secretAccessKey,
    bucket,
    endpoint: (process.env.YC_ENDPOINT ?? "https://storage.yandexcloud.net").replace(/\/$/, ""),
    region: process.env.YC_REGION ?? "ru-central1",
    prefix: normalizePrefix(String(cli.prefix ?? process.env.YC_PREFIX ?? "belarus")),
    sourceDir,
    stateFile,
    concurrency: parsePositiveInt(
      cli.concurrency != null ? String(cli.concurrency) : process.env.YC_CONCURRENCY,
      8,
    ),
    maxRetries: parsePositiveInt(process.env.YC_MAX_RETRIES, 5),
    dryRun: Boolean(cli.dryRun),
    syncRemote: Boolean(cli.syncRemote),
    publicBaseUrl: process.env.YC_PUBLIC_BASE_URL?.replace(/\/$/, "") || null,
    imageExtensions: IMAGE_EXTENSIONS,
  };
}

export { projectRoot, IMAGE_EXTENSIONS };
