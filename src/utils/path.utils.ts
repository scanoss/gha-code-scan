// SPDX-License-Identifier: MIT
/*
   Copyright (c) 2025, SCANOSS

   Permission is hereby granted, free of charge, to any person obtaining a copy
   of this software and associated documentation files (the "Software"), to deal
   in the Software without restriction, including without limitation the rights
   to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
   copies of the Software, and to permit persons to whom the Software is
   furnished to do so, subject to the following conditions:

   The above copyright notice and this permission notice shall be included in
   all copies or substantial portions of the Software.

   THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
   IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
   FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
   AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
   LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
   OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
   THE SOFTWARE.
 */
import path from 'path';

/**
 * Resolves a settings file path to both its full filesystem path and GitHub-relative path.
 * Handles both absolute and relative paths, accounting for scan subdirectories.
 *
 * @param settingsPath - The settings file path (can be absolute or relative)
 * @param scanPath - The scan subdirectory path (e.g., 'subfolder/')
 * @param repoDir - The repository root directory
 * @returns An object containing the full filesystem path and GitHub-relative path
 */
export function resolveSettingsPath(
  settingsPath: string,
  scanPath: string,
  repoDir: string
): { fullPath: string; githubPath: string } {
  // Build full settings file path accounting for SCAN_PATH
  const fullPath = path.isAbsolute(settingsPath) ? settingsPath : path.join(repoDir, scanPath, settingsPath);

  // Build the relative path for GitHub URLs (relative to repo root)
  // Normalize to forward slashes for cross-platform compatibility and GitHub URLs
  const githubPath = path.isAbsolute(settingsPath)
    ? path.relative(repoDir, settingsPath).replace(/\\/g, '/') // TODO Is this necessary?
    : path.join(scanPath, settingsPath).replace(/\\/g, '/');

  return { fullPath, githubPath };
}

/**
 * Resolves a scan-relative file path to a repository-root-relative path.
 * When scanning a subfolder, scan results contain paths relative to that subfolder.
 * This function prepends the scan path to get the correct repository-relative path.
 *
 * @param scanRelativePath - Path relative to the scanned subfolder (e.g., 'file.c')
 * @param scanPath - The scan subdirectory path (e.g., 'src/folder1' or '.')
 * @returns Path relative to repository root (e.g., 'src/folder1/file.c' or 'file.c')
 *
 * @example
 * // Scanning root directory
 * resolveScanPath('file.c', '.') // Returns 'file.c'
 *
 * @example
 * // Scanning subfolder
 * resolveScanPath('file.c', 'src/folder1') // Returns 'src/folder1/file.c'
 */
export function resolveScanPath(scanRelativePath: string, scanPath: string): string {
  // If scanning root ('.'), return path as-is
  if (!scanPath || scanPath === '.') {
    return scanRelativePath;
  }

  // Join scan path with the file path, normalize separators
  return path.join(scanPath, scanRelativePath).replace(/\\/g, '/');
}

/**
 * Returns a formatted scan path suffix for display in titles/headings.
 * Used to make the scanned folder instantly visible in PR comments and status checks.
 *
 * @param scanPath - The scan subdirectory path (e.g., 'src/folder1' or '.')
 * @returns Formatted suffix like " (📁 `src/folder1`)" or empty string for root
 *
 * @example
 * getScanPathSuffix('.') // Returns ''
 * getScanPathSuffix('src/folder1') // Returns ' (📁 `src/folder1`)'
 */
export function getScanPathSuffix(scanPath: string): string {
  return scanPath && scanPath !== '.' ? ` (📁 \`${scanPath}\`)` : '';
}
