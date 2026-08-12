import { HeadObjectCommand, ListObjectsV2Command, S3Client } from "@aws-sdk/client-s3";
import { Upload } from "@aws-sdk/lib-storage";
import { createReadStream } from "node:fs";
import { contentTypeFor } from "./utils.mjs";

/**
 * @typedef {object} StorageCredentials
 * @property {string} accessKeyId
 * @property {string} secretAccessKey
 */

/**
 * @typedef {object} StorageClientOptions
 * @property {string} endpoint
 * @property {string} region
 * @property {string} bucket
 * @property {StorageCredentials} credentials
 */

/**
 * Adapter over Yandex Object Storage (S3-compatible API).
 * Dependency Inversion: upload orchestration depends on this narrow interface.
 */
export class YandexObjectStorageClient {
  /**
   * @param {StorageClientOptions} options
   */
  constructor(options) {
    this.bucket = options.bucket;
    this.client = new S3Client({
      region: options.region,
      endpoint: options.endpoint,
      credentials: options.credentials,
      // Required for path-style requests used by Yandex Object Storage tools/docs.
      forcePathStyle: true,
    });
  }

  /**
   * @param {{ key: string, absolutePath: string, fileName: string }} input
   * @returns {Promise<{ etag?: string }>}
   */
  async uploadFile(input) {
    const upload = new Upload({
      client: this.client,
      params: {
        Bucket: this.bucket,
        Key: input.key,
        Body: createReadStream(input.absolutePath),
        ContentType: contentTypeFor(input.fileName),
        // Public-read is common for CDN origins; omit if bucket policy grants access.
        // ACL is optional and may be disabled on some buckets — leave unset by default.
      },
      // Photos are ~3–4MB; multipart kicks in for larger objects automatically.
      queueSize: 4,
      partSize: 8 * 1024 * 1024,
      leavePartsOnError: false,
    });

    const result = await upload.done();
    return { etag: result.ETag?.replaceAll('"', "") };
  }

  /**
   * @param {string} key
   * @returns {Promise<{ size: number, etag?: string } | null>}
   */
  async headObject(key) {
    try {
      const result = await this.client.send(
        new HeadObjectCommand({
          Bucket: this.bucket,
          Key: key,
        }),
      );

      return {
        size: Number(result.ContentLength ?? 0),
        etag: result.ETag?.replaceAll('"', ""),
      };
    } catch (error) {
      const status = /** @type {{ $metadata?: { httpStatusCode?: number }, name?: string }} */ (error)
        .$metadata?.httpStatusCode;
      const name = /** @type {{ name?: string }} */ (error).name;
      if (status === 404 || name === "NotFound" || name === "NoSuchKey") {
        return null;
      }
      throw error;
    }
  }

  /**
   * Lists object keys under prefix (paginated).
   * @param {string} prefix
   * @returns {AsyncGenerator<{ key: string, size: number, etag?: string }>}
   */
  async *listObjects(prefix) {
    let continuationToken;

    do {
      const page = await this.client.send(
        new ListObjectsV2Command({
          Bucket: this.bucket,
          Prefix: prefix,
          ContinuationToken: continuationToken,
        }),
      );

      for (const item of page.Contents ?? []) {
        if (!item.Key || item.Key.endsWith("/")) continue;
        yield {
          key: item.Key,
          size: Number(item.Size ?? 0),
          etag: item.ETag?.replaceAll('"', ""),
        };
      }

      continuationToken = page.IsTruncated ? page.NextContinuationToken : undefined;
    } while (continuationToken);
  }

  destroy() {
    this.client.destroy();
  }
}
