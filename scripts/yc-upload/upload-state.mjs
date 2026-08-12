import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";

/**
 * @typedef {object} UploadedFileRecord
 * @property {string} key
 * @property {number} size
 * @property {number} mtimeMs
 * @property {string} [etag]
 * @property {string} uploadedAt
 */

/**
 * @typedef {object} UploadStateData
 * @property {1} version
 * @property {string} bucket
 * @property {string} prefix
 * @property {string} sourceDir
 * @property {string} updatedAt
 * @property {Record<string, UploadedFileRecord>} files
 */

/**
 * Persists successful uploads so interrupted runs can resume safely.
 * Single Responsibility: state I/O only.
 */
export class UploadStateStore {
  /**
   * @param {string} stateFile
   * @param {{ bucket: string, prefix: string, sourceDir: string }} meta
   */
  constructor(stateFile, meta) {
    this.stateFile = stateFile;
    this.meta = meta;
    /** @type {UploadStateData} */
    this.data = {
      version: 1,
      bucket: meta.bucket,
      prefix: meta.prefix,
      sourceDir: meta.sourceDir,
      updatedAt: new Date().toISOString(),
      files: {},
    };
    this.#dirty = false;
    this.#saveQueue = Promise.resolve();
  }

  /** @type {boolean} */
  #dirty;

  /** @type {Promise<void>} */
  #saveQueue;

  async load() {
    try {
      const raw = await readFile(this.stateFile, "utf8");
      /** @type {Partial<UploadStateData>} */
      const parsed = JSON.parse(raw);

      if (parsed.version !== 1 || typeof parsed.files !== "object" || !parsed.files) {
        throw new Error("Unsupported or corrupt upload state file");
      }

      this.data = {
        version: 1,
        bucket: this.meta.bucket,
        prefix: this.meta.prefix,
        sourceDir: this.meta.sourceDir,
        updatedAt: parsed.updatedAt ?? new Date().toISOString(),
        files: parsed.files,
      };
    } catch (error) {
      if (/** @type {NodeJS.ErrnoException} */ (error).code === "ENOENT") {
        return;
      }
      throw error;
    }
  }

  /**
   * @param {string} relativePath
   * @param {{ size: number, mtimeMs: number }} local
   * @returns {boolean}
   */
  isUploaded(relativePath, local) {
    const record = this.data.files[relativePath];
    if (!record) return false;
    if (record.size !== local.size) return false;
    // mtimeMs === 0 means the record was imported from remote listing (mtime unknown).
    if (record.mtimeMs === 0) return true;
    return record.mtimeMs === local.mtimeMs;
  }

  /**
   * @param {string} relativePath
   * @param {UploadedFileRecord} record
   */
  markUploaded(relativePath, record) {
    this.data.files[relativePath] = record;
    this.#dirty = true;
  }

  /**
   * @param {string} relativePath
   * @param {UploadedFileRecord} record
   */
  markFromRemote(relativePath, record) {
    const existing = this.data.files[relativePath];
    if (existing && existing.size === record.size) {
      return;
    }
    this.data.files[relativePath] = record;
    this.#dirty = true;
  }

  get uploadedCount() {
    return Object.keys(this.data.files).length;
  }

  /**
   * Queues atomic saves so concurrent uploads do not corrupt the state file.
   * @returns {Promise<void>}
   */
  save() {
    if (!this.#dirty) {
      return this.#saveQueue;
    }

    this.#saveQueue = this.#saveQueue.then(() => this.#flush());
    return this.#saveQueue;
  }

  /**
   * Forces a final flush even if another save is in progress.
   * @returns {Promise<void>}
   */
  async flush() {
    await this.#saveQueue;
    if (this.#dirty) {
      await this.#flush();
    }
  }

  async #flush() {
    this.data.updatedAt = new Date().toISOString();
    this.data.bucket = this.meta.bucket;
    this.data.prefix = this.meta.prefix;
    this.data.sourceDir = this.meta.sourceDir;

    await mkdir(path.dirname(this.stateFile), { recursive: true });

    const payload = `${JSON.stringify(this.data, null, 2)}\n`;
    const tempFile = `${this.stateFile}.${process.pid}.tmp`;

    await writeFile(tempFile, payload, "utf8");
    await rename(tempFile, this.stateFile);
    this.#dirty = false;
  }
}
