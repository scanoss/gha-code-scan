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
import { isPullRequest } from './github.utils';

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

    const snippetMatches: { filePath: string; match: SnippetMatch }[] = [];
    const fileMatches: { filePath: string; match: FileMatch }[] = [];

    // Collect all matches
    for (const [filePath, matches] of Object.entries(results)) {
      if (!Array.isArray(matches)) continue;

      for (const match of matches) {
        if (match.status != null && match.status === 'pending'){
          if (match.id === 'snippet') {
            snippetMatches.push({ filePath, match: match as SnippetMatch });
          } else if (match.id === 'file') {
            fileMatches.push({ filePath, match: match as FileMatch });
          }
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

    // Log GitHub context for debugging
    core.info(`GitHub context: owner=${context.repo.owner}, repo=${context.repo.repo}, sha=${context.sha}`);

    // Create individual commit comments for each match
    for (const { filePath, match } of snippetMatches) {
      await createSnippetCommitComment(filePath, match);
    }

    for (const { filePath, match } of fileMatches) {
      await createFileCommitComment(filePath, match);
    }

    // Create main conversation comment if we have any matches
    if (snippetMatches.length > 0 || fileMatches.length > 0) {
      await createMainConversationComment(snippetMatches, fileMatches);
    }

    core.info(
      `Created summary annotations, ${snippetMatches.length + fileMatches.length} commit comments, and main conversation comment`
    );
  } catch (error) {
    core.error(`Failed to create snippet annotations from ${resultsPath}: ${error}`);
  }
}

/**
 * Creates a summary annotation for snippet matches (not bound to any file)
 */
function createSnippetSummaryAnnotation(snippetMatches: { filePath: string; match: SnippetMatch }[]): void {
  const commitUrl = `https://github.com/${context.repo.owner}/${context.repo.repo}/commit/${context.sha}`;

  let message = `Found ${snippetMatches.length} snippet matches\n`;
  message += `📍 [View detailed comments on commit](${commitUrl})\n\n`;
  message += `**Affected Files:**\n`;

  // Group matches by file and limit to avoid annotation length issues
  const fileGroups = snippetMatches.reduce(
    (groups, { filePath, match }) => {
      if (!groups[filePath]) groups[filePath] = [];
      groups[filePath].push(match);
      return groups;
    },
    {} as Record<string, SnippetMatch[]>
  );

  const fileEntries = Object.entries(fileGroups).slice(0, 10); // Limit to 10 files
  for (const [filePath, matches] of fileEntries) {
    const firstMatch = matches[0];
    const localLines = parseLineRange(firstMatch.lines);
    const fileUrl = localLines ? getFileUrlWithLineHighlight(filePath, localLines) : getFileUrl(filePath);
    message += `- [${filePath}](${fileUrl}) (${matches.length} match${matches.length > 1 ? 'es' : ''})\n`;
  }

  if (Object.keys(fileGroups).length > 10) {
    message += `- ... and ${Object.keys(fileGroups).length - 10} more files\n`;
  }

  core.warning(message, {
    title: 'Code Snippet Matches Summary'
  });

  core.info(`Created snippet summary annotation for ${snippetMatches.length} matches`);
}

/**
 * Creates a summary annotation for file matches (not bound to any file)
 */
function createFileMatchSummaryAnnotation(fileMatches: { filePath: string; match: FileMatch }[]): void {
  const commitUrl = `https://github.com/${context.repo.owner}/${context.repo.repo}/commit/${context.sha}`;

  let message = `Found ${fileMatches.length} full file matches\n`;
  message += `📍 [View detailed comments on commit](${commitUrl})\n\n`;
  message += `**Affected Files:**\n`;

  // Limit to avoid annotation length issues
  const limitedMatches = fileMatches.slice(0, 10);
  for (const { filePath, match } of limitedMatches) {
    const fileUrl = getFileUrl(filePath);
    const component = `${match.component}${match.version ? ` v${match.version}` : ''}`;
    message += `- [${filePath}](${fileUrl}) → ${component}\n`;
  }

  if (fileMatches.length > 10) {
    message += `- ... and ${fileMatches.length - 10} more files\n`;
  }

  core.warning(message, {
    title: 'Full File Matches Summary'
  });

  core.info(`Created file match summary annotation for ${fileMatches.length} matches`);
}

/**
 * Creates a main conversation comment with summary and commit link
 */
async function createMainConversationComment(
  snippetMatches: { filePath: string; match: SnippetMatch }[],
  fileMatches: { filePath: string; match: FileMatch }[]
): Promise<void> {
  if (!isPullRequest()) {
    core.info('Skipping main conversation comment - not in PR context');
    return;
  }

  const commitUrl = `https://github.com/${context.repo.owner}/${context.repo.repo}/commit/${context.sha}`;

  let message = `## 🔍 SCANOSS Code Similarity Detected\n\n`;

  if (snippetMatches.length > 0) {
    message += `📄 **${snippetMatches.length} snippet matches** found\n`;
  }

  if (fileMatches.length > 0) {
    message += `📋 **${fileMatches.length} full file matches** found\n`;
  }

  message += `\n🔗 **[View detailed findings on commit ${context.sha.substring(0, 7)}](${commitUrl})**\n\n`;

  // Quick overview of most affected files
  const allFiles = new Set([...snippetMatches.map(m => m.filePath), ...fileMatches.map(m => m.filePath)]);

  if (allFiles.size <= 5) {
    message += `**Files with similarities:**\n`;
    for (const filePath of Array.from(allFiles).slice(0, 5)) {
      message += `- \`${filePath}\`\n`;
    }
  } else {
    message += `**${allFiles.size} files** contain code similarities\n`;
  }

  message += `\n💡 Click the commit link above to see detailed annotations for each match.`;

  try {
    const octokit = getOctokit(inputs.GITHUB_TOKEN);

    await octokit.rest.issues.createComment({
      issue_number: context.issue.number,
      owner: context.repo.owner,
      repo: context.repo.repo,
      body: message
    });

    core.info('Successfully created main conversation comment');
  } catch (error) {
    core.error(`Failed to create main conversation comment: ${error}`);
  }
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

    const params = {
      owner: context.repo.owner,
      repo: context.repo.repo,
      commit_sha: context.sha,
      path: filePath,
      body: commentBody
      // Temporarily removed line parameter to test file-level comments
    };

    core.info(`Creating commit comment for snippet match at ${filePath}`);

    await octokit.rest.repos.createCommitComment(params);

    core.info(`Successfully created commit comment for snippet match at ${filePath}`);
  } catch (error) {
    core.error(`Failed to create commit comment for ${filePath}`);
    core.error(`Error details: ${JSON.stringify(error, null, 2)}`);
    if (error instanceof Error) {
      core.error(`Error message: ${error.message}`);
      core.error(`Error stack: ${error.stack}`);
    }
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

    const params = {
      owner: context.repo.owner,
      repo: context.repo.repo,
      commit_sha: context.sha,
      path: filePath,
      body: commentBody
    };

    core.info(`Creating file commit comment for ${filePath}`);

    await octokit.rest.repos.createCommitComment(params);

    core.info(`Successfully created commit comment for file match at ${filePath}`);
  } catch (error) {
    core.error(`Failed to create commit comment for ${filePath}`);
    core.error(`Error details: ${JSON.stringify(error, null, 2)}`);
    if (error instanceof Error) {
      core.error(`Error message: ${error.message}`);
      core.error(`Error stack: ${error.stack}`);
    }
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
