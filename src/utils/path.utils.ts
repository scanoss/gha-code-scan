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
  const githubPath = path.isAbsolute(settingsPath)
    ? path.relative(repoDir, settingsPath)
    : path.join(scanPath, settingsPath);

  return { fullPath, githubPath };
}
