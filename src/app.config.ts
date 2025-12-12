// SPDX-License-Identifier: MIT
/*
   Copyright (c) 2024, SCANOSS

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

/**
 * Configuration constants for the SCANOSS action.
 */
export const CHECK_NAME = 'Policy Check';
export const STATUS_NAME = 'Status Check';

/**
 * Formats a check name with scan path context for GitHub status checks.
 * Appends the scan path to help identify which folder was scanned when running multiple parallel scans.
 *
 * @param baseName - The base check name (e.g., "Policy Check: Undeclared")
 * @param scanPath - The scan subdirectory path (e.g., 'src/folder1' or '.')
 * @returns Formatted check name like "Policy Check: Undeclared - src/folder1" or just the base name for root
 *
 * @example
 * formatCheckName('Policy Check: Copyleft', '.') // Returns 'Policy Check: Copyleft'
 * formatCheckName('Policy Check: Copyleft', 'src') // Returns 'Policy Check: Copyleft - src'
 */
export function formatCheckName(baseName: string, scanPath: string): string {
  return scanPath && scanPath !== '.' ? `${baseName} - ${scanPath}` : baseName;
}
