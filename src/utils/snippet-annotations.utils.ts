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
import { context, getOctokit } from '@actions/github';
import * as inputs from '../app.input';

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
 * Creates hybrid snippet annotations: summary annotations + commit comments
 */
export async function createSnippetAnnotations(resultsPath: string): Promise<void> {
  if (!fs.existsSync(resultsPath)) {
    core.warning(`Results file not found: ${resultsPath}`);
    return;
  }

  try {
    const resultsContent = fs.readFileSync(resultsPath, 'utf8');
    const results = JSON.parse(resultsContent);

    const snippetMatches: Array<{ filePath: string; match: SnippetMatch }> = [];
    const fileMatches: Array<{ filePath: string; match: FileMatch }> = [];

    // Collect all matches
    for (const [filePath, matches] of Object.entries(results)) {
      if (!Array.isArray(matches)) continue;

      for (const match of matches) {
        if (match.id === 'snippet') {
          snippetMatches.push({ filePath, match: match as SnippetMatch });
        } else if (match.id === 'file') {
          fileMatches.push({ filePath, match: match as FileMatch });
        }
      }
    }

    // Create summary annotations (not bound to files)
    if (snippetMatches.length > 0) {
      createSnippetSummaryAnnotation(snippetMatches);
    }

    if (fileMatches.length > 0) {
      createFileMatchSummaryAnnotation(fileMatches);
    }

    // Create individual commit comments for each match
    for (const { filePath, match } of snippetMatches) {
      await createSnippetCommitComment(filePath, match);
    }

    for (const { filePath, match } of fileMatches) {
      await createFileCommitComment(filePath, match);
    }

    core.info(`Created summary annotations and ${snippetMatches.length + fileMatches.length} commit comments`);
  } catch (error) {
    core.error(`Failed to create snippet annotations from ${resultsPath}: ${error}`);
  }
}

/**
 * Creates a summary annotation for snippet matches (not bound to any file)
 */
function createSnippetSummaryAnnotation(snippetMatches: Array<{ filePath: string; match: SnippetMatch }>): void {
  const componentList = snippetMatches
    .map(({ match }) => `${match.component}${match.version ? ` v${match.version}` : ''}`)
    .join(', ');

  const message = `Found ${snippetMatches.length} snippet matches: ${componentList}`;

  core.warning(message, {
    title: 'Code Snippet Matches Summary'
  });

  core.info(`Created snippet summary annotation for ${snippetMatches.length} matches`);
}

/**
 * Creates a summary annotation for file matches (not bound to any file)
 */
function createFileMatchSummaryAnnotation(fileMatches: Array<{ filePath: string; match: FileMatch }>): void {
  const componentList = fileMatches
    .map(({ match }) => `${match.component}${match.version ? ` v${match.version}` : ''}`)
    .join(', ');

  const message = `Found ${fileMatches.length} file matches: ${componentList}`;

  core.warning(message, {
    title: 'Full File Matches Summary'
  });

  core.info(`Created file match summary annotation for ${fileMatches.length} matches`);
}

/**
 * Creates a commit comment for a snippet match
 */
async function createSnippetCommitComment(filePath: string, snippetMatch: SnippetMatch): Promise<void> {
  const localLines = parseLineRange(snippetMatch.lines);
  
  if (!localLines) {
    core.warning(`Could not parse line range: ${snippetMatch.lines} for file: ${filePath}`);
    return;
  }

  const message = formatSnippetAnnotationMessage(filePath, snippetMatch, localLines);
  const commentBody = `🔍 **Code Similarity Found**\n\n${message}`;

  try {
    const octokit = getOctokit(inputs.GITHUB_TOKEN);
    
    await octokit.rest.repos.createCommitComment({
      owner: context.repo.owner,
      repo: context.repo.repo,
      commit_sha: context.sha,
      path: filePath,
      line: localLines.start,
      body: commentBody
    });

    core.debug(`Created commit comment for snippet match at ${filePath}:${localLines.start}`);
  } catch (error) {
    core.warning(`Failed to create commit comment for ${filePath}: ${error}`);
  }
}

/**
 * Creates a commit comment for a file match
 */
async function createFileCommitComment(filePath: string, fileMatch: FileMatch): Promise<void> {
  const message = formatFileAnnotationMessage(filePath, fileMatch);
  const commentBody = `📄 **Full File Match Found**\n\n${message}`;

  try {
    const octokit = getOctokit(inputs.GITHUB_TOKEN);
    
    await octokit.rest.repos.createCommitComment({
      owner: context.repo.owner,
      repo: context.repo.repo,
      commit_sha: context.sha,
      path: filePath,
      body: commentBody
    });

    core.debug(`Created commit comment for file match at ${filePath}`);
  } catch (error) {
    core.warning(`Failed to create commit comment for ${filePath}: ${error}`);
  }
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
 * Extracts first and last numbers from a string using regex
 */
function extractFirstAndLastNumbers(str: string): { first: string; last: string } | null {
  const match = str.match(/^(\d+).*?(\d+)(?!.*\d)/);
  if (match) {
    return {
      first: match[1],
      last: match[2]
    };
  }
  return null;
}

/**
 * Parses line range strings like "4-142", "7-9,47-81,99-158", or "all"
 */
function parseLineRange(lineRange: string): LineRange | null {
  if (lineRange === 'all') {
    return { start: 1, end: 1 };
  }

  // Handle complex ranges like "7-9,47-81,99-158" using regex to get first and last numbers
  const extracted = extractFirstAndLastNumbers(lineRange);
  if (extracted) {
    const start = parseInt(extracted.first, 10);
    const end = parseInt(extracted.last, 10);
    
    if (!isNaN(start) && !isNaN(end)) {
      return { start, end };
    }
  }

  // Fallback for single number
  const singleLine = parseInt(lineRange, 10);
  if (!isNaN(singleLine)) {
    return { start: singleLine, end: singleLine };
  }

  return null;
}