import { extname } from "node:path";

const MIME_BY_EXT = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".tif": "image/tiff",
  ".tiff": "image/tiff",
  ".bmp": "image/bmp",
  ".heic": "image/heic",
  ".heif": "image/heif",
};

/**
 * @param {string} fileName
 * @returns {string}
 */
export function contentTypeFor(fileName) {
  return MIME_BY_EXT[extname(fileName).toLowerCase()] ?? "application/octet-stream";
}

/**
 * @param {number} ms
 * @returns {Promise<void>}
 */
export function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * @param {unknown} error
 * @returns {boolean}
 */
export function isRetryableError(error) {
  if (!error || typeof error !== "object") return false;

  const err = /** @type {{ name?: string, Code?: string, code?: string, $metadata?: { httpStatusCode?: number }, message?: string }} */ (
    error
  );
  const status = err.$metadata?.httpStatusCode;
  const code = err.Code ?? err.code ?? err.name ?? "";

  if (status != null && (status === 408 || status === 429 || status >= 500)) {
    return true;
  }

  const retryableCodes = new Set([
    "TimeoutError",
    "RequestTimeout",
    "SlowDown",
    "ServiceUnavailable",
    "InternalError",
    "ECONNRESET",
    "ECONNREFUSED",
    "ETIMEDOUT",
    "EAI_AGAIN",
    "ENOTFOUND",
    "NetworkingError",
    "AbortError",
  ]);

  if (retryableCodes.has(code)) return true;
  if (typeof err.message === "string" && /socket hang up|network|timeout/i.test(err.message)) {
    return true;
  }

  return false;
}

/**
 * @template T
 * @param {() => Promise<T>} operation
 * @param {{ maxRetries: number, label: string, onRetry?: (attempt: number, error: unknown, delayMs: number) => void }} options
 * @returns {Promise<T>}
 */
export async function withRetry(operation, options) {
  let attempt = 0;

  for (;;) {
    try {
      return await operation();
    } catch (error) {
      attempt += 1;
      if (attempt > options.maxRetries || !isRetryableError(error)) {
        throw error;
      }

      const delayMs = Math.min(30_000, 500 * 2 ** (attempt - 1)) + Math.floor(Math.random() * 250);
      options.onRetry?.(attempt, error, delayMs);
      await sleep(delayMs);
    }
  }
}

/**
 * Simple concurrency pool (no extra dependency).
 * @template T
 * @param {T[]} items
 * @param {number} concurrency
 * @param {(item: T, index: number) => Promise<void>} worker
 * @returns {Promise<void>}
 */
export async function mapPool(items, concurrency, worker) {
  let nextIndex = 0;

  async function runWorker() {
    while (nextIndex < items.length) {
      const index = nextIndex;
      nextIndex += 1;
      await worker(items[index], index);
    }
  }

  const workers = Array.from({ length: Math.min(concurrency, items.length) }, () => runWorker());
  await Promise.all(workers);
}

/**
 * Builds object key for Object Storage / CDN origin.
 * @param {string} prefix
 * @param {string} relativePath
 * @returns {string}
 */
export function buildObjectKey(prefix, relativePath) {
  return `${prefix}${relativePath.replaceAll("\\", "/")}`;
}

/**
 * @param {unknown} error
 * @returns {string}
 */
export function formatError(error) {
  if (error instanceof Error) {
    const meta = /** @type {{ $metadata?: { httpStatusCode?: number }, Code?: string }} */ (error);
    const status = meta.$metadata?.httpStatusCode;
    const code = meta.Code;
    const parts = [error.message];
    if (code) parts.push(`code=${code}`);
    if (status) parts.push(`status=${status}`);
    return parts.join(" | ");
  }
  return String(error);
}
