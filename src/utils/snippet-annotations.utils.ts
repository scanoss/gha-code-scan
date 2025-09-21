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
import { SnippetMatchWithPath, FileMatchWithPath, SnippetMatch, FileMatch } from '../types/annotations';
import { createSnippetSummaryAnnotation, createFileMatchSummaryAnnotation } from './annotation-creators';
import { createSnippetCommitComment, createFileCommitComment, createMainConversationComment } from './github-comment-api';


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

    const snippetMatches: SnippetMatchWithPath[] = [];
    const fileMatches: FileMatchWithPath[] = [];

    // Collect all matches
    for (const [filePath, matches] of Object.entries(results)) {
      if (!Array.isArray(matches)) continue;

      for (const match of matches) {
        if (match.status === 'pending') {
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

    // Create individual commit comments for each match (in parallel)
    const snippetPromises = snippetMatches.map(async ({ filePath, match }) =>
      createSnippetCommitComment(filePath, match)
    );
    const filePromises = fileMatches.map(async ({ filePath, match }) => createFileCommitComment(filePath, match));

    const promiseResults = await Promise.allSettled([...snippetPromises, ...filePromises]);
    const failedCount = promiseResults.filter(
      (result: PromiseSettledResult<void>) => result.status === 'rejected'
    ).length;
    const successCount = promiseResults.length - failedCount;

    if (failedCount > 0) {
      core.warning(`${failedCount} commit comments failed to create, ${successCount} succeeded`);
    }

    // Create main conversation comment if we have any matches
    if (snippetMatches.length > 0 || fileMatches.length > 0) {
      await createMainConversationComment(snippetMatches, fileMatches);
    }

    core.info(
      `Created summary annotations, attempted ${snippetMatches.length + fileMatches.length} commit comments, and main conversation comment`
    );
  } catch (error) {
    core.error(`Failed to create snippet annotations from ${resultsPath}: ${error}`);
  }
}

