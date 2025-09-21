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
import { context, getOctokit } from '@actions/github';
import * as inputs from '../app.input';
import { isPullRequest } from './github.utils';
import { SnippetMatch, FileMatch, LineRange, SnippetMatchWithPath, FileMatchWithPath } from '../types/annotations';
import { parseLineRange } from './line-parsers';
import { requestDeduplicator } from './api-cache';

/**
 * Creates a GitHub URL for the file
 * @param filePath - The file path relative to repository root
 * @returns GitHub URL for the file
 */
function getFileUrl(filePath: string): string {
  return `https://github.com/${context.repo.owner}/${context.repo.repo}/blob/${context.sha}/${filePath}`;
}

/**
 * Formats the snippet match information into an annotation message
 * @param filePath - The file path
 * @param snippet - The snippet match data
 * @param localLines - The parsed line range
 * @returns Formatted annotation message
 */
function formatSnippetAnnotationMessage(filePath: string, snippet: SnippetMatch, localLines: LineRange): string {
  const fileUrl = getFileUrl(filePath);
  const component = `${snippet.component}${snippet.version ? ` v${snippet.version}` : ''}`;

  let message = `**Similarity detected in [${filePath}](${fileUrl})**\n\n`;
  message += `- **Component**: ${component}\n`;
  message += `- **Lines**: ${localLines.start}`;
  if (localLines.start !== localLines.end) {
    message += `-${localLines.end}`;
  }
  message += ` (${snippet.matched}% match)\n`;

  if (snippet.licenses && snippet.licenses.length > 0) {
    const license = snippet.licenses[0];
    message += `- **License**: ${license.name}\n`;
  }

  if (snippet.url) {
    message += `- **Source**: [${snippet.url}](${snippet.url})\n`;
  }

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
 * @throws {Error} When GitHub API call fails or line range parsing fails
 */
export async function createSnippetCommitComment(filePath: string, snippetMatch: SnippetMatch): Promise<void> {
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

    // Use request deduplication to prevent duplicate comments for the same file
    const deduplicationKey = `snippet-comment:${context.sha}:${filePath}:${snippetMatch.component}`;
    await requestDeduplicator.deduplicate(deduplicationKey, async () => {
      return await octokit.rest.repos.createCommitComment(params);
    });

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
 * @param filePath - The file path
 * @param fileMatch - The file match data
 */
export async function createFileCommitComment(filePath: string, fileMatch: FileMatch): Promise<void> {
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

    // Use request deduplication to prevent duplicate comments for the same file
    const deduplicationKey = `file-comment:${context.sha}:${filePath}:${fileMatch.component}`;
    await requestDeduplicator.deduplicate(deduplicationKey, async () => {
      return await octokit.rest.repos.createCommitComment(params);
    });

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

    const prInfo = isPullRequest() ? ` (PR #${context.issue.number})` : '';
    core.info(`Successfully created main conversation comment${prInfo}`);
  } catch (error) {
    core.error(`Failed to create main conversation comment: ${error}`);
  }
}
