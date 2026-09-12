import { existsSync, mkdirSync, readFileSync, writeFileSync, unlinkSync } from "node:fs";
import { dirname, join } from "node:path";
import { getEnv } from "@/core/config/env";

/**
 * Storage abstraction. Local filesystem implementation today; S3-ready
 * interface for future use. All paths are relative to STORAGE_PATH.
 */
export interface StorageProvider {
  write(relativePath: string, data: Buffer): Promise<string>;
  read(relativePath: string): Promise<Buffer>;
  delete(relativePath: string): Promise<void>;
  /** Returns an absolute URL or path for the given relative path. */
  getUrl(relativePath: string): string;
}

class LocalStorage implements StorageProvider {
  private basePath: string;

  constructor() {
    this.basePath = getEnv().STORAGE_PATH;
  }

  private resolve(relativePath: string): string {
    return join(this.basePath, relativePath);
  }

  async write(relativePath: string, data: Buffer): Promise<string> {
    const fullPath = this.resolve(relativePath);
    const dir = dirname(fullPath);
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
    writeFileSync(fullPath, data);
    return relativePath;
  }

  async read(relativePath: string): Promise<Buffer> {
    const fullPath = this.resolve(relativePath);
    if (!existsSync(fullPath)) {
      throw new Error(`Storage: file not found: ${relativePath}`);
    }
    return readFileSync(fullPath);
  }

  async delete(relativePath: string): Promise<void> {
    const fullPath = this.resolve(relativePath);
    if (existsSync(fullPath)) {
      unlinkSync(fullPath);
    }
  }

  getUrl(relativePath: string): string {
    return join(this.basePath, relativePath);
  }
}

// Singleton
let _instance: StorageProvider | null = null;

export function getStorage(): StorageProvider {
  if (!_instance) {
    _instance = new LocalStorage();
  }
  return _instance;
}

/** Override the storage provider (for testing or future S3 impl). */
export function setStorage(provider: StorageProvider): void {
  _instance = provider;
}
