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

import * as core from '@actions/core';
import * as fs from 'fs';
import { context } from '@actions/github';

/**
 * Interface representing a snippet match from SCANOSS results
 */
interface SnippetMatch {
  file: string;
  component: string;
  version?: string;
  matched: string;
  lines: string;
  oss_lines: string;
  url?: string;
  purl?: string[];
  licenses?: {
    name: string;
    url?: string;
    copyleft?: string;
  }[];
}

/**
 * Interface representing a full file match from SCANOSS results
 */
interface FileMatch {
  file: string;
  component: string;
  version?: string;
  url?: string;
  purl?: string[];
  licenses?: {
    name: string;
    url?: string;
    copyleft?: string;
  }[];
}

/**
 * Interface for parsed line ranges
 */
interface LineRange {
  start: number;
  end: number;
}

/**
 * Creates GitHub Actions annotations for snippet and file matches
 */
export function createSnippetAnnotations(resultsPath: string): void {
  if (!fs.existsSync(resultsPath)) {
    core.warning(`Results file not found: ${resultsPath}`);
    return;
  }

  try {
    const resultsContent = fs.readFileSync(resultsPath, 'utf8');
    const results = JSON.parse(resultsContent);

    let snippetCount = 0;
    let fileCount = 0;

    for (const [filePath, matches] of Object.entries(results)) {
      if (!Array.isArray(matches)) continue;

      for (const match of matches) {
        if (match.id === 'snippet') {
          createSnippetMatchAnnotation(filePath, match as SnippetMatch);
          snippetCount++;
        } else if (match.id === 'file') {
          createFileMatchAnnotation(filePath, match as FileMatch);
          fileCount++;
        }
      }
    }

    core.info(`Created ${snippetCount} snippet annotations and ${fileCount} file match annotations`);
  } catch (error) {
    core.error(`Failed to create snippet annotations from ${resultsPath}: ${error}`);
  }
}

/**
 * Creates an annotation for a snippet match
 */
function createSnippetMatchAnnotation(filePath: string, snippetMatch: SnippetMatch): void {
  const localLines = parseLineRange(snippetMatch.lines);
  
  if (!localLines) {
    core.warning(`Could not parse line range: ${snippetMatch.lines} for file: ${filePath}`);
    return;
  }

  const message = formatSnippetAnnotationMessage(filePath, snippetMatch, localLines);
  const title = 'Code Similarity Found';

  core.warning(message, {
    file: filePath,
    startLine: localLines.start,
    endLine: localLines.end,
    title
  });

  core.debug(`Created snippet annotation for ${filePath}:${localLines.start}-${localLines.end}`);
}

/**
 * Creates an annotation for a full file match
 */
function createFileMatchAnnotation(filePath: string, fileMatch: FileMatch): void {
  const message = formatFileAnnotationMessage(filePath, fileMatch);
  const title = 'Full File Match Found';

  core.warning(message, {
    file: filePath,
    title
  });

  core.debug(`Created file match annotation for ${filePath}`);
}

/**
 * Formats the snippet match information into an annotation message
 */
function formatSnippetAnnotationMessage(filePath: string, snippet: SnippetMatch, localLines: LineRange): string {
  let message = `Code snippet matches ${snippet.component}`;

  if (snippet.version) {
    message += ` v${snippet.version}`;
  }

  message += ` (${snippet.matched} similarity)`;

  // Add license information
  if (snippet.licenses && snippet.licenses.length > 0) {
    const licenseNames = snippet.licenses.map(license => license.name);
    message += ` - License(s): ${licenseNames.join(', ')}`;
  }

  // Add source URL
  if (snippet.url) {
    message += ` - Source: ${snippet.url}`;
  }

  // Add OSS line range
  if (snippet.oss_lines) {
    message += ` - OSS Lines: ${snippet.oss_lines}`;
  }

  // Add direct link to the file with line highlighting
  message += ` - View: ${getFileUrlWithLineHighlight(filePath, localLines)}`;

  return message;
}

/**
 * Formats the file match information into an annotation message
 */
function formatFileAnnotationMessage(filePath: string, fileMatch: FileMatch): string {
  let message = `Full file matches ${fileMatch.component}`;

  if (fileMatch.version) {
    message += ` v${fileMatch.version}`;
  }

  // Add license information
  if (fileMatch.licenses && fileMatch.licenses.length > 0) {
    const licenseNames = fileMatch.licenses.map(license => license.name);
    message += ` - License(s): ${licenseNames.join(', ')}`;
  }

  // Add source URL
  if (fileMatch.url) {
    message += ` - Source: ${fileMatch.url}`;
  }

  // Add direct link to the file
  message += ` - View: ${getFileUrl(filePath)}`;

  return message;
}

/**
 * Creates a GitHub URL with line highlighting for the file
 */
function getFileUrlWithLineHighlight(filePath: string, lineRange: LineRange): string {
  const baseUrl = `https://github.com/${context.repo.owner}/${context.repo.repo}/blob/${context.sha}/${filePath}`;

  if (lineRange.start === lineRange.end) {
    return `${baseUrl}#L${lineRange.start}`;
  } else {
    return `${baseUrl}#L${lineRange.start}-L${lineRange.end}`;
  }
}

/**
 * Creates a GitHub URL for the file
 */
function getFileUrl(filePath: string): string {
  return `https://github.com/${context.repo.owner}/${context.repo.repo}/blob/${context.sha}/${filePath}`;
}

/**
 * Parses line range strings like "4-142" or "all"
 */
function parseLineRange(lineRange: string): LineRange | null {
  if (lineRange === 'all') {
    return { start: 1, end: Number.MAX_SAFE_INTEGER };
  }

  const parts = lineRange.split('-');
  if (parts.length === 2) {
    const start = parseInt(parts[0], 10);
    const end = parseInt(parts[1], 10);
    
    if (!isNaN(start) && !isNaN(end)) {
      return { start, end };
    }
  }

  return null;
}