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

import * as core from '@actions/core';
import { context, getOctokit } from '@actions/github';
import * as inputs from '../app.input';
import { isPullRequest, resolveRepoAndSha } from './github.utils';
import { SnippetMatch, FileMatch, LineRange, SnippetMatchWithPath, FileMatchWithPath } from '../types/annotations';
import { parseLineRange } from './line-parsers';
import { requestDeduplicator } from './api-cache';

/**
 * Creates a GitHub URL for the file
 * @param filePath - The file path relative to repository root
 * @returns GitHub URL for the file
 */
function getFileUrl(filePath: string): string {
  const { owner, repo, sha } = resolveRepoAndSha();
  return `https://github.com/${owner}/${repo}/blob/${sha}/${filePath}`;
}

/**
 * Creates a GitHub URL with line highlighting for the file
 */
function getFileUrlWithLineHighlight(filePath: string, lineRange: LineRange): string {
  const { owner, repo, sha } = resolveRepoAndSha();
  const baseUrl = `https://github.com/${owner}/${repo}/blob/${sha}/${filePath}`;

  if (lineRange.start === lineRange.end) {
    return `${baseUrl}#L${lineRange.start}`;
  } else {
    return `${baseUrl}#L${lineRange.start}-L${lineRange.end}`;
  }
}

function formatSnippetAnnotationMessage(filePath: string, snippet: SnippetMatch, localLines: LineRange): string {
  let message = `Code snippet matches ${snippet.component}`;

  if (snippet.version) {
    message += ` v${snippet.version}`;
  }

  message += ` (${snippet.matched}% similarity)`;

  // Add license information
  if (snippet.licenses && snippet.licenses.length > 0) {
    const license = snippet.licenses[0];
    message += `\nLicense: ${license.name}`;
  }

  // Add source URL
  if (snippet.url) {
    message += `\nSource: ${snippet.url}`;
  }

  // Add OSS line range
  if (snippet.oss_lines) {
    message += `\nOSS Lines: ${snippet.oss_lines}`;
  }

  // Add view link
  const viewUrl = snippet.lines === 'all' ? getFileUrl(filePath) : getFileUrlWithLineHighlight(filePath, localLines);
  message += `\nView: ${viewUrl}`;

  return message;
}

/**
 * Formats the file match information into an annotation message
 * @param filePath - The file path
 * @param fileMatch - The file match data
 * @returns Formatted annotation message
 */
function formatFileAnnotationMessage(filePath: string, fileMatch: FileMatch): string {
  const fileUrl = getFileUrl(filePath);
  const component = `${fileMatch.component}${fileMatch.version ? ` v${fileMatch.version}` : ''}`;

  let message = `**Full file match detected in [${filePath}](${fileUrl})**\n\n`;
  message += `- **Component**: ${component}\n`;

  if (fileMatch.licenses && fileMatch.licenses.length > 0) {
    const license = fileMatch.licenses[0];
    message += `- **License**: ${license.name}\n`;
  }

  if (fileMatch.url) {
    message += `- **Source**: [${fileMatch.url}](${fileMatch.url})\n`;
  }

  return message;
}

/**
 * Creates a commit comment for a snippet match with detailed similarity information
 *
 * This function processes SCANOSS snippet match results and creates GitHub commit comments
 * that provide developers with actionable information about code similarities found in their commits.
 *
 * @param filePath - The file path relative to repository root where the match was found
 * @param snippetMatch - The snippet match data from SCANOSS containing similarity details
 *
 * @example
 * ```typescript
 * await createSnippetCommitComment('src/utils/parser.ts', {
 *   file: 'parser.ts',
 *   component: 'example-lib',
 *   version: '1.2.3',
 *   matched: '85',
 *   lines: '15-25',
 *   oss_lines: '10-20',
 *   licenses: [{ name: 'MIT' }]
 * });
 * ```
 *
 * @returns Promise<boolean> - true on success, false on failure or skip
 */
export async function createSnippetCommitComment(filePath: string, snippetMatch: SnippetMatch): Promise<boolean> {
  const localLines = parseLineRange(snippetMatch.lines);

  if (!localLines) {
    core.warning(`Could not parse line range: ${snippetMatch.lines} for file: ${filePath}`);
    return false;
  }

  const message = formatSnippetAnnotationMessage(filePath, snippetMatch, localLines);
  const commentBody = `🔍 **Code Similarity Found**\n\n${message}`;

  try {
    const octokit = getOctokit(inputs.GITHUB_TOKEN);
    const { owner, repo, sha } = resolveRepoAndSha();

    const params = {
      owner: owner,
      repo: repo,
      commit_sha: sha,
      path: filePath,
      line: localLines.start,
      body: commentBody
    };

    core.info(`Creating commit comment for snippet match at ${filePath}`);

    // Use request deduplication to prevent duplicate comments for the same file
    const deduplicationKey = `snippet-comment:${sha}:${filePath}:${snippetMatch.component}`;
    await requestDeduplicator.deduplicate(deduplicationKey, async () => {
      return await octokit.rest.repos.createCommitComment(params);
    });

    core.info(`Successfully created commit comment for snippet match at ${filePath}`);
    return true;
  } catch (error) {
    core.error(`Failed to create commit comment for ${filePath}`);
    if (error instanceof Error) {
      core.error(`Error: ${error.message}`);
      // Extra diagnostics (status, url) if present
      const status = (error as any)?.status;
      const url = (error as any)?.request?.url;
      if (status || url) core.error(`Context: status=${status ?? 'n/a'} url=${url ?? 'n/a'}`);
      core.debug(`Error details: ${JSON.stringify(error, null, 2)}`);
    }
    return false;
  }
}

/**
 * Creates a commit comment for a file match
 * @param filePath - The file path
 * @param fileMatch - The file match data
 * @returns Promise<boolean> - true on success, false on failure
 */
export async function createFileCommitComment(filePath: string, fileMatch: FileMatch): Promise<boolean> {
  const message = formatFileAnnotationMessage(filePath, fileMatch);
  const commentBody = `📄 **Full File Match Found**\n\n${message}`;

  try {
    const octokit = getOctokit(inputs.GITHUB_TOKEN);
    const { owner, repo, sha } = resolveRepoAndSha();

    const params = {
      owner: owner,
      repo: repo,
      commit_sha: sha,
      path: filePath,
      body: commentBody
    };

    core.info(`Creating file commit comment for ${filePath}`);

    // Use request deduplication to prevent duplicate comments for the same file
    const deduplicationKey = `file-comment:${sha}:${filePath}:${fileMatch.component}${fileMatch.version ? `:v${fileMatch.version}` : ''}`;
    await requestDeduplicator.deduplicate(deduplicationKey, async () => {
      return await octokit.rest.repos.createCommitComment(params);
    });

    core.info(`Successfully created commit comment for file match at ${filePath}`);
    return true;
  } catch (error) {
    core.error(`Failed to create commit comment for ${filePath}`);
    if (error instanceof Error) {
      core.error(`Error: ${error.message}`);
      // Extra diagnostics (status, url) if present
      const status = (error as any)?.status;
      const url = (error as any)?.request?.url;
      if (status || url) core.error(`Context: status=${status ?? 'n/a'} url=${url ?? 'n/a'}`);
      core.debug(`Error details: ${JSON.stringify(error, null, 2)}`);
    }
    return false;
  }
}

/**
 * Creates a main conversation comment with summary and commit link
 * @param snippetMatches - Array of snippet matches with file paths
 * @param fileMatches - Array of file matches with file paths
 */
export async function createMainConversationComment(
  snippetMatches: SnippetMatchWithPath[],
  fileMatches: FileMatchWithPath[]
): Promise<void> {
  if (!isPullRequest()) {
    core.info('Skipping main conversation comment - not in PR context');
    return;
  }

  const { owner, repo, sha } = resolveRepoAndSha();
  const commitUrl = `https://github.com/${owner}/${repo}/commit/${sha}`;

  let message = `## 🔍 SCANOSS Code Similarity Detected\n\n`;

  if (snippetMatches.length > 0) {
    message += `📄 **${snippetMatches.length} snippet matches** found\n`;
  }

  if (fileMatches.length > 0) {
    message += `📋 **${fileMatches.length} full file matches** found\n`;
  }

  message += `\n🔗 **[View detailed findings on commit ${sha.substring(0, 7)}](${commitUrl})**\n\n`;

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
      owner: owner,
      repo: repo,
      body: message
    });

    core.info(`Successfully created main conversation comment (PR #${context.issue.number})`);
  } catch (error) {
    core.error(`Failed to create main conversation comment: ${error}`);
  }
}
