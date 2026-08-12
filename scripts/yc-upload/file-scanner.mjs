import { createReadStream } from "node:fs";
import { readdir, stat } from "node:fs/promises";
import path from "node:path";

/**
 * @typedef {object} LocalFile
 * @property {string} absolutePath
 * @property {string} relativePath
 * @property {string} fileName
 * @property {number} size
 * @property {number} mtimeMs
 */

/**
 * @param {string} fileName
 * @param {ReadonlySet<string>} extensions
 * @returns {boolean}
 */
export function isImageFile(fileName, extensions) {
  return extensions.has(path.extname(fileName).toLowerCase());
}

/**
 * Recursively collects image files under sourceDir.
 * @param {string} sourceDir
 * @param {ReadonlySet<string>} extensions
 * @returns {Promise<LocalFile[]>}
 */
export async function scanImageFiles(sourceDir, extensions) {
  /** @type {LocalFile[]} */
  const files = [];

  /**
   * @param {string} dir
   * @param {string} relativeDir
   */
  async function walk(dir, relativeDir) {
    const entries = await readdir(dir, { withFileTypes: true });

    for (const entry of entries) {
      const absolutePath = path.join(dir, entry.name);
      const relativePath = relativeDir
        ? path.posix.join(relativeDir, entry.name)
        : entry.name;

      if (entry.isDirectory()) {
        await walk(absolutePath, relativePath.replaceAll("\\", "/"));
        continue;
      }

      if (!entry.isFile() || !isImageFile(entry.name, extensions)) {
        continue;
      }

      const info = await stat(absolutePath);
      files.push({
        absolutePath,
        relativePath: relativePath.replaceAll("\\", "/"),
        fileName: entry.name,
        size: info.size,
        mtimeMs: info.mtimeMs,
      });
    }
  }

  await walk(sourceDir, "");
  files.sort((a, b) => a.relativePath.localeCompare(b.relativePath));
  return files;
}

/**
 * @param {string} absolutePath
 * @returns {import("node:fs").ReadStream}
 */
export function openReadStream(absolutePath) {
  return createReadStream(absolutePath);
}
