import fs from 'fs';
import { expect } from 'vitest';

/**
 * Asserts that a file exists on disk.
 */
export function assertFileExists(filePath: string, message?: string): void {
  const exists = fs.existsSync(filePath) && fs.statSync(filePath).isFile();
  expect(exists, message || `Expected file to exist: ${filePath}`).toBe(true);
}

/**
 * Asserts that a directory exists on disk.
 */
export function assertDirectoryExists(dirPath: string, message?: string): void {
  const exists = fs.existsSync(dirPath) && fs.statSync(dirPath).isDirectory();
  expect(exists, message || `Expected directory to exist: ${dirPath}`).toBe(true);
}

/**
 * Asserts that a file does not exist on disk.
 */
export function assertFileDoesNotExist(filePath: string, message?: string): void {
  const exists = fs.existsSync(filePath);
  expect(exists, message || `Expected file NOT to exist: ${filePath}`).toBe(false);
}

/**
 * Asserts that a JSON file exists and contains the expected subset object.
 */
export function assertJsonFileContains(filePath: string, expectedSubset: Record<string, any>): void {
  assertFileExists(filePath);
  const content = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  expect(content).toMatchObject(expectedSubset);
}

/**
 * Asserts that a text file exists and contains the expected string snippet.
 */
export function assertFileContains(filePath: string, expectedText: string): void {
  assertFileExists(filePath);
  const content = fs.readFileSync(filePath, 'utf-8');
  expect(content).toContain(expectedText);
}
