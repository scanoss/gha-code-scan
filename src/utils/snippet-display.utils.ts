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
 * Interface for parsed line ranges
 */
interface LineRange {
  start: number;
  end: number;
}

/**
 * Interface for snippet display data
 */
interface SnippetDisplay {
  filePath: string;
  component: string;
  version?: string;
  matchPercentage: string;
  localLines: LineRange;
  ossLines: LineRange;
  codeSnippet: string[];
  url?: string;
  licenses?: string[];
}

/**
 * Parses SCANOSS results.json to extract snippet matches
 */
export function parseSnippetMatches(resultsPath: string): SnippetDisplay[] {
  const snippetDisplays: SnippetDisplay[] = [];

  try {
    core.debug(`Reading SCANOSS results from: ${resultsPath}`);
    if (!fs.existsSync(resultsPath)) {
      core.warning(`Results file not found: ${resultsPath}`);
      return [];
    }

    const resultsContent = fs.readFileSync(resultsPath, 'utf8');
    const results = JSON.parse(resultsContent);

    for (const [filePath, matches] of Object.entries(results)) {
      if (!Array.isArray(matches)) continue;

      for (const match of matches) {
        // Only process snippet matches
        if (match.id !== 'snippet') continue;

        const snippetMatch = match as SnippetMatch;
        core.debug(`Processing snippet match for file: ${filePath}`);

        const localLines = parseLineRange(snippetMatch.lines);
        const ossLines = parseLineRange(snippetMatch.oss_lines);

        if (!localLines) {
          core.warning(`Could not parse line range: ${snippetMatch.lines} for file: ${filePath}`);
          continue;
        }

        // Read the actual code snippet from the file
        const codeSnippet = readCodeSnippet(filePath, localLines);

        const licenses = snippetMatch.licenses?.map(license => license.name) || [];

        snippetDisplays.push({
          filePath,
          component: snippetMatch.component,
          version: snippetMatch.version,
          matchPercentage: snippetMatch.matched,
          localLines,
          ossLines: ossLines || { start: 1, end: 1 },
          codeSnippet,
          url: snippetMatch.url,
          licenses
        });
      }
    }

    core.info(`Found ${snippetDisplays.length} snippet matches in results`);
    return snippetDisplays;
  } catch (error) {
    core.error(`Failed to parse snippet matches from ${resultsPath}: ${error}`);
    return [];
  }
}

/**
 * Parses line range strings like "4-142" or "all"
 */
function parseLineRange(lineRange: string): LineRange | null {
  if (lineRange === 'all') {
    return { start: 1, end: Number.MAX_SAFE_INTEGER };
  }

  const match = lineRange.match(/^(\d+)-(\d+)$/);
  if (match) {
    return {
      start: parseInt(match[1], 10),
      end: parseInt(match[2], 10)
    };
  }

  // Single line number
  const singleLine = parseInt(lineRange, 10);
  if (!isNaN(singleLine)) {
    return { start: singleLine, end: singleLine };
  }

  return null;
}

/**
 * Reads code snippet from a file within the specified line range
 */
function readCodeSnippet(filePath: string, lineRange: LineRange): string[] {
  try {
    if (!fs.existsSync(filePath)) {
      core.debug(`File not found for snippet reading: ${filePath}`);
      return [`// File not found: ${filePath}`];
    }

    const fileContent = fs.readFileSync(filePath, 'utf8');
    const lines = fileContent.split('\n');

    const start = Math.max(0, lineRange.start - 1); // Convert to 0-based index
    const end = Math.min(lines.length, lineRange.end);

    return lines.slice(start, end);
  } catch (error) {
    core.debug(`Failed to read snippet from ${filePath}: ${error}`);
    return [`// Error reading file: ${error}`];
  }
}

/**
 * Formats snippet matches into a markdown comment
 */
export function formatSnippetMatchesComment(snippets: SnippetDisplay[]): string {
  if (snippets.length === 0) {
    return '';
  }

  let comment = '## 🔍 Code Snippet Matches Found\n\n';
  comment += `Found ${snippets.length} partial code matches in your files:\n\n`;

  for (let i = 0; i < snippets.length; i++) {
    const snippet = snippets[i];
    const fileUrl = getFileUrlWithLineHighlight(snippet.filePath, snippet.localLines);
    comment += `### ${i + 1}. [${snippet.filePath}](${fileUrl}) (${snippet.matchPercentage} match)\n\n`;

    comment += `**Matched Component:** ${snippet.component}`;
    if (snippet.version) {
      comment += ` v${snippet.version}`;
    }
    comment += '\n';

    if (snippet.url) {
      comment += `**Source:** ${snippet.url}\n`;
    }

    if (snippet.licenses && snippet.licenses.length > 0) {
      comment += `**License(s):** ${snippet.licenses.join(', ')}\n`;
    }

    comment += `**Local Lines:** [${snippet.localLines.start}-${snippet.localLines.end}](${fileUrl})\n`;
    comment += `**OSS Lines:** ${snippet.ossLines.start}-${snippet.ossLines.end}\n\n`;

    // Add code snippet with line numbers
    comment += '**Matched Code:**\n';
    comment += '```\n';

    const maxLines = 20; // Limit display to reasonable number of lines
    const linesToShow = snippet.codeSnippet.slice(0, maxLines);

    linesToShow.forEach((line, index) => {
      const lineNumber = snippet.localLines.start + index;
      comment += `${lineNumber.toString().padStart(4, ' ')} | ${line}\n`;
    });

    if (snippet.codeSnippet.length > maxLines) {
      comment += `... (${snippet.codeSnippet.length - maxLines} more lines)\n`;
    }

    comment += '```\n\n';
  }

  comment += '*These matches indicate potential code reuse. Review licensing and compliance requirements.*\n';

  return comment;
}

/**
 * Creates a GitHub URL with line highlighting for the file
 */
function getFileUrlWithLineHighlight(filePath: string, lineRange: { start: number; end: number }): string {
  const baseUrl = `https://github.com/${context.repo.owner}/${context.repo.repo}/blob/${context.sha}/${filePath}`;

  if (lineRange.start === lineRange.end) {
    // Single line
    return `${baseUrl}#L${lineRange.start}`;
  } else {
    // Line range
    return `${baseUrl}#L${lineRange.start}-L${lineRange.end}`;
  }
}

/**
 * Creates snippet matches comment for PR
 */
export function createSnippetMatchesComment(resultsPath: string): string {
  const snippets = parseSnippetMatches(resultsPath);
  return formatSnippetMatchesComment(snippets);
}
