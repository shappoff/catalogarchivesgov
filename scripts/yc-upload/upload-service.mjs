import { scanImageFiles } from "./file-scanner.mjs";
import { UploadStateStore } from "./upload-state.mjs";
import { buildObjectKey, formatError, mapPool, withRetry } from "./utils.mjs";

/**
 * @typedef {import("./config.mjs").UploadConfig} UploadConfig
 * @typedef {import("./storage-client.mjs").YandexObjectStorageClient} YandexObjectStorageClient
 * @typedef {import("./file-scanner.mjs").LocalFile} LocalFile
 */

/**
 * @typedef {object} UploadStats
 * @property {number} total
 * @property {number} skipped
 * @property {number} uploaded
 * @property {number} failed
 * @property {Array<{ path: string, error: string }>} failures
 */

/**
 * Orchestrates scan → filter → upload with resume and retries.
 * Open/Closed: new storage backends can replace YandexObjectStorageClient.
 */
export class UploadService {
  /**
   * @param {UploadConfig} config
   * @param {YandexObjectStorageClient} storage
   * @param {UploadStateStore} state
   */
  constructor(config, storage, state) {
    this.config = config;
    this.storage = storage;
    this.state = state;
  }

  /**
   * Optionally reconcile local state with remote bucket listing.
   * Useful when the state file was lost but objects already exist.
   * @returns {Promise<number>}
   */
  async syncRemoteIntoState() {
    let imported = 0;
    const prefix = this.config.prefix;

    for await (const object of this.storage.listObjects(prefix)) {
      if (!object.key.startsWith(prefix)) continue;
      const relativePath = object.key.slice(prefix.length);
      if (!relativePath) continue;

      this.state.markFromRemote(relativePath, {
        key: object.key,
        size: object.size,
        mtimeMs: 0,
        etag: object.etag,
        uploadedAt: new Date().toISOString(),
      });
      imported += 1;
    }

    await this.state.flush();
    return imported;
  }

  /**
   * @returns {Promise<UploadStats>}
   */
  async run() {
    const files = await scanImageFiles(this.config.sourceDir, this.config.imageExtensions);

    /** @type {LocalFile[]} */
    const pending = [];
    let skipped = 0;

    for (const file of files) {
      if (this.state.isUploaded(file.relativePath, file)) {
        skipped += 1;
        continue;
      }
      pending.push(file);
    }

    /** @type {UploadStats} */
    const stats = {
      total: files.length,
      skipped,
      uploaded: 0,
      failed: 0,
      failures: [],
    };

    console.log(
      `Found ${files.length} images | already uploaded: ${skipped} | to upload: ${pending.length}` +
        (this.config.dryRun ? " | dry-run" : ""),
    );

    if (pending.length === 0 || this.config.dryRun) {
      if (this.config.dryRun) {
        stats.uploaded = pending.length;
      }
      return stats;
    }

    let completed = 0;
    const startedAt = Date.now();

    await mapPool(pending, this.config.concurrency, async (file) => {
      const key = buildObjectKey(this.config.prefix, file.relativePath);

      try {
        const result = await withRetry(
          () =>
            this.storage.uploadFile({
              key,
              absolutePath: file.absolutePath,
              fileName: file.fileName,
            }),
          {
            maxRetries: this.config.maxRetries,
            label: file.relativePath,
            onRetry: (attempt, error, delayMs) => {
              console.warn(
                `retry ${attempt}/${this.config.maxRetries} ${file.relativePath} in ${delayMs}ms — ${formatError(error)}`,
              );
            },
          },
        );

        this.state.markUploaded(file.relativePath, {
          key,
          size: file.size,
          mtimeMs: file.mtimeMs,
          etag: result.etag,
          uploadedAt: new Date().toISOString(),
        });
        stats.uploaded += 1;

        // Persist progress often enough for safe resume without thrashing disk.
        if (stats.uploaded % 10 === 0) {
          await this.state.save();
        }
      } catch (error) {
        stats.failed += 1;
        stats.failures.push({
          path: file.relativePath,
          error: formatError(error),
        });
        console.error(`FAIL ${file.relativePath}: ${formatError(error)}`);
      } finally {
        completed += 1;
        if (completed % 25 === 0 || completed === pending.length) {
          const elapsedSec = Math.max(1, (Date.now() - startedAt) / 1000);
          const rate = (stats.uploaded / elapsedSec).toFixed(1);
          console.log(
            `progress ${completed}/${pending.length} | ok=${stats.uploaded} fail=${stats.failed} | ${rate} files/s`,
          );
        }
      }
    });

    await this.state.flush();
    return stats;
  }
}
