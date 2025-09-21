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
import { context } from '@actions/github';
import { getSHA } from './github.utils';
import { SnippetMatch, LineRange, SnippetMatchWithPath, FileMatchWithPath } from '../types/annotations';
import { parseLineRange } from './line-parsers';

/**
 * Resolves the appropriate repo and SHA for PR contexts
 * @returns Object containing owner, repo, and SHA information
 */
function resolveRepoAndSha(): { owner: string; repo: string; sha: string } {
  return {
    owner: context.repo.owner,
    repo: context.repo.repo,
    sha: getSHA()
  };
}

/**
 * Creates a GitHub URL for the file
 * @param filePath - The file path relative to repository root
 * @returns GitHub URL for the file
 */
function getFileUrl(filePath: string): string {
  return `https://github.com/${context.repo.owner}/${context.repo.repo}/blob/${context.sha}/${filePath}`;
}

/**
 * Creates a GitHub URL for the file with line highlighting
 * @param filePath - The file path relative to repository root
 * @param lineRange - The line range to highlight
 * @returns GitHub URL for the file with line anchors
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
 * Creates a summary annotation for snippet matches (not bound to any file)
 * @param snippetMatches - Array of snippet matches with file paths
 */
export function createSnippetSummaryAnnotation(snippetMatches: SnippetMatchWithPath[]): void {
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

  core.notice(message, {
    title: 'Code Snippet Matches Summary'
  });

  core.info(`Created snippet summary annotation for ${snippetMatches.length} matches`);
}

/**
 * Creates a summary annotation for file matches (not bound to any file)
 * @param fileMatches - Array of file matches with file paths
 */
export function createFileMatchSummaryAnnotation(fileMatches: FileMatchWithPath[]): void {
  const { owner, repo, sha } = resolveRepoAndSha();
  const commitUrl = `https://github.com/${owner}/${repo}/commit/${sha}`;

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

  core.notice(message, {
    title: 'Full File Matches Summary'
  });

  core.info(`Created file match summary annotation for ${fileMatches.length} matches`);
}
