// Temp File Manager for Database Verification
// Handles creation and cleanup of temporary database files

import * as os from 'os';
import * as path from 'path';
import * as fs from 'fs';
import * as crypto from 'crypto';

export class TempFileManager {
  private tempFiles: Set<string> = new Set();
  private tempDir: string;
  private static instance: TempFileManager | null = null;

  constructor() {
    this.tempDir = path.join(os.tmpdir(), 'queryflow-verification');
    this.ensureTempDir();
  }

  /**
   * Get singleton instance
   */
  static getInstance(): TempFileManager {
    if (!TempFileManager.instance) {
      TempFileManager.instance = new TempFileManager();
    }
    return TempFileManager.instance;
  }

  /**
   * Ensure temp directory exists
   */
  private ensureTempDir(): void {
    try {
      if (!fs.existsSync(this.tempDir)) {
        fs.mkdirSync(this.tempDir, { recursive: true });
        console.log(`📁 Created temp directory: ${this.tempDir}`);
      }
    } catch (error) {
      console.error('❌ Failed to create temp directory:', error);
      // Fallback to OS temp directory
      this.tempDir = os.tmpdir();
    }
  }

  /**
   * Create temporary database file from ArrayBuffer
   */
  async createTempDatabase(buffer: ArrayBuffer, prefix: string = 'db'): Promise<string> {
    try {
      // Generate unique filename
      const timestamp = Date.now();
      const randomId = crypto.randomBytes(8).toString('hex');
      const filename = `${prefix}_${timestamp}_${randomId}.db`;
      const filePath = path.join(this.tempDir, filename);

      // Write buffer to file
      const nodeBuffer = Buffer.from(buffer);
      fs.writeFileSync(filePath, nodeBuffer);

      // Track file for cleanup
      this.tempFiles.add(filePath);

      console.log(`💾 Created temp database: ${filePath} (${nodeBuffer.length} bytes)`);
      return filePath;
    } catch (error) {
      console.error('❌ Failed to create temp database:', error);
      throw new Error(`Failed to create temp database: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Create temporary database file from existing file
   */
  async copyToTempDatabase(sourcePath: string, prefix: string = 'db'): Promise<string> {
    try {
      if (!fs.existsSync(sourcePath)) {
        throw new Error(`Source file not found: ${sourcePath}`);
      }

      // Generate unique filename
      const timestamp = Date.now();
      const randomId = crypto.randomBytes(8).toString('hex');
      const ext = path.extname(sourcePath) || '.db';
      const filename = `${prefix}_${timestamp}_${randomId}${ext}`;
      const destPath = path.join(this.tempDir, filename);

      // Copy file
      fs.copyFileSync(sourcePath, destPath);

      // Track file for cleanup
      this.tempFiles.add(destPath);

      console.log(`📋 Copied to temp database: ${destPath}`);
      return destPath;
    } catch (error) {
      console.error('❌ Failed to copy temp database:', error);
      throw new Error(`Failed to copy temp database: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Check if file exists
   */
  fileExists(filePath: string): boolean {
    try {
      return fs.existsSync(filePath);
    } catch {
      return false;
    }
  }

  /**
   * Get file size
   */
  getFileSize(filePath: string): number {
    try {
      const stats = fs.statSync(filePath);
      return stats.size;
    } catch {
      return 0;
    }
  }

  /**
   * Cleanup specific temp file
   */
  async cleanup(filePath?: string): Promise<void> {
    if (!filePath) {
      return;
    }

    try {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        this.tempFiles.delete(filePath);
        console.log(`🗑️  Cleaned up temp file: ${filePath}`);
      }
    } catch (error) {
      console.warn(`⚠️ Failed to cleanup temp file ${filePath}:`, error);
    }
  }

  /**
   * Cleanup all tracked temp files
   */
  async cleanupAll(): Promise<void> {
    console.log(`🗑️  Cleaning up ${this.tempFiles.size} temp files...`);

    const filesToCleanup = Array.from(this.tempFiles);
    for (const filePath of filesToCleanup) {
      await this.cleanup(filePath);
    }

    // Try to remove temp directory if empty
    try {
      const files = fs.readdirSync(this.tempDir);
      if (files.length === 0) {
        fs.rmdirSync(this.tempDir);
        console.log(`📁 Removed temp directory: ${this.tempDir}`);
      }
    } catch (error) {
      // Ignore errors when removing directory
    }

    this.tempFiles.clear();
  }

  /**
   * Cleanup old temp files (older than specified age in milliseconds)
   */
  async cleanupOldFiles(maxAge: number = 24 * 60 * 60 * 1000): Promise<void> {
    try {
      if (!fs.existsSync(this.tempDir)) {
        return;
      }

      const files = fs.readdirSync(this.tempDir);
      const now = Date.now();
      let cleanedCount = 0;

      for (const file of files) {
        const filePath = path.join(this.tempDir, file);
        try {
          const stats = fs.statSync(filePath);
          const age = now - stats.mtimeMs;

          if (age > maxAge) {
            fs.unlinkSync(filePath);
            this.tempFiles.delete(filePath);
            cleanedCount++;
          }
        } catch (error) {
          // Skip files that can't be accessed
        }
      }

      if (cleanedCount > 0) {
        console.log(`🗑️  Cleaned up ${cleanedCount} old temp files`);
      }
    } catch (error) {
      console.warn('⚠️ Failed to cleanup old files:', error);
    }
  }

  /**
   * Get temp directory path
   */
  getTempDir(): string {
    return this.tempDir;
  }

  /**
   * Get list of tracked temp files
   */
  getTrackedFiles(): string[] {
    return Array.from(this.tempFiles);
  }

  /**
   * Get total size of tracked temp files
   */
  getTotalSize(): number {
    let totalSize = 0;
    for (const filePath of this.tempFiles) {
      totalSize += this.getFileSize(filePath);
    }
    return totalSize;
  }
}

// Export singleton instance
export const tempFileManager = TempFileManager.getInstance();

