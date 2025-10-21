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
 * Output constants for GitHub Actions outputs and artifact names.
 */

/**
 * Output key for the scan results file path.
 */
export const RESULT_FILEPATH = 'result-filepath';

/**
 * Output key for the scan command stdout.
 */
export const STDOUT_SCAN_COMMAND = 'stdout-scan-command';

/**
 * Default filename for CycloneDX format exports.
 */
export const CYCLONEDX_FILE_NAME = 'scanoss-cyclonedx.json';

/**
 * Default filename for SpDX format exports.
 */
export const SPDXLITE_FIlE_NAME = 'scanoss-spdxlite.json';

/**
 * Default filename for CSV format exports.
 */
export const CSV_FILE_NAME = 'scanoss-csv.json';
