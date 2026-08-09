import fs from 'fs';
import path from 'path';
import os from 'os';

/**
 * Sandboxed temporary directory manager for template generation E2E tests.
 */
export class TempWorkspace {
  public dirPath: string;

  constructor(prefix: string = 'dev-launcher-test-') {
    this.dirPath = fs.mkdtempSync(path.join(os.tmpdir(), prefix));
  }

  /**
   * Resolves a relative path within the temporary workspace.
   */
  public getSubPath(relative: string): string {
    return path.join(this.dirPath, relative);
  }

  /**
   * Checks if a file or directory exists within the workspace.
   */
  public exists(relative: string): boolean {
    return fs.existsSync(this.getSubPath(relative));
  }

  /**
   * Reads and parses a JSON file within the workspace.
   */
  public readJson<T = any>(relative: string): T {
    const filePath = this.getSubPath(relative);
    return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  }

  /**
   * Reads a text file within the workspace.
   */
  public readFile(relative: string): string {
    const filePath = this.getSubPath(relative);
    return fs.readFileSync(filePath, 'utf-8');
  }

  /**
   * Writes content to a file in the workspace, creating subdirectories if needed.
   */
  public writeFile(relative: string, content: string): void {
    const filePath = this.getSubPath(relative);
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(filePath, content, 'utf-8');
  }

  /**
   * Recursively cleans up the temporary workspace directory.
   */
  public cleanup(): void {
    if (fs.existsSync(this.dirPath)) {
      try {
        fs.rmSync(this.dirPath, { recursive: true, force: true });
      } catch (err) {
        // Safe catch for Windows file handle locks
      }
    }
  }
}
