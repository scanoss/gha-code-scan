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

/**
 * License information from SCANOSS results
 */
export interface LicenseInfo {
  name: string;
  url?: string;
  copyleft?: string;
}

/**
 * Interface representing a snippet match from SCANOSS results
 */
export interface SnippetMatch {
  file: string;
  component: string;
  version?: string;
  matched: string;
  lines: string;
  oss_lines: string;
  url?: string;
  purl?: string[];
  licenses?: LicenseInfo[];
}

/**
 * Interface representing a full file match from SCANOSS results
 */
export interface FileMatch {
  file: string;
  component: string;
  version?: string;
  url?: string;
  purl?: string[];
  licenses?: LicenseInfo[];
}

/**
 * Interface for parsed line ranges
 */
export interface LineRange {
  start: number;
  end: number;
}

/**
 * Interface for repository and SHA information
 */
export interface RepoInfo {
  owner: string;
  repo: string;
  sha: string;
}

/**
 * Interface for match with file path context
 */
export interface MatchWithPath<T> {
  filePath: string;
  match: T;
}

/**
 * Type aliases for common match collections
 */
export type SnippetMatchWithPath = MatchWithPath<SnippetMatch>;
export type FileMatchWithPath = MatchWithPath<FileMatch>;
