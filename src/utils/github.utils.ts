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

import { context, getOctokit } from '@actions/github';
import * as core from '@actions/core';
import * as inputs from '../app.input';
import type { Endpoints } from '@octokit/types';

const prEvents = ['pull_request', 'pull_request_review', 'pull_request_review_comment'];
const FIND_FIRST_RUN_EVENT = 'workflow_dispatch';

// Use the types from @octokit/types
type WorkflowRunsResponse = Endpoints['GET /repos/{owner}/{repo}/actions/runs']['response'];
type WorkflowRun = WorkflowRunsResponse['data']['workflow_runs'][number];

/**
 * Determines if the current GitHub workflow run was triggered by a pull request event.
 */
export function isPullRequest(): boolean {
  return prEvents.includes(context.eventName);
}

/**
 * Gets the SHA of the commit being processed in the current workflow run.
 */
export function getSHA(): string {
  let sha = context.sha;
  if (isPullRequest()) {
    const pull = context.payload.pull_request;
    if (pull?.head.sha) {
      sha = pull?.head.sha;
    }
  }

  return sha;
}

/**
 * Creates a comment on the current pull request with the provided message.
 */
export async function createCommentOnPR(message: string): Promise<void> {
  const octokit = getOctokit(inputs.GITHUB_TOKEN);

  core.debug('Creating comment on PR');
  await octokit.rest.issues.createComment({
    issue_number: context.issue.number,
    owner: context.repo.owner,
    repo: context.repo.repo,
    body: message
  });
}

/**
 * Interface for commit suggestions on specific files and lines
 */
export interface CommitSuggestion {
  path: string;
  line: number;
  body: string;
  suggestedFix?: string;
}

/**
 * Checks if a file is part of the current PR diff
 */
async function isFileInPRDiff(filePath: string): Promise<boolean> {
  const octokit = getOctokit(inputs.GITHUB_TOKEN);
  
  try {
    const { data: files } = await octokit.rest.pulls.listFiles({
      owner: context.repo.owner,
      repo: context.repo.repo,
      pull_number: context.issue.number
    });
    
    return files.some(file => file.filename === filePath);
  } catch (error) {
    core.warning(`Failed to check if file is in PR diff: ${error}`);
    return false;
  }
}

/**
 * Initializes a file with a newline then removes it to make it part of the PR diff
 */
async function initializeFileInDiff(filePath: string): Promise<void> {
  const octokit = getOctokit(inputs.GITHUB_TOKEN);
  const headBranch = context.payload.pull_request?.head?.ref;
  
  if (!headBranch) {
    throw new Error('Could not determine PR head branch');
  }

  try {
    core.info(`Initializing ${filePath} to be part of PR diff...`);
    
    // Get current file content
    const existingFile = await octokit.rest.repos.getContent({
      owner: context.payload.pull_request?.head?.repo?.owner?.login || context.repo.owner,
      repo: context.payload.pull_request?.head?.repo?.name || context.repo.repo,
      path: filePath,
      ref: headBranch
    });

    if ('content' in existingFile.data) {
      const currentContent = Buffer.from(existingFile.data.content, 'base64').toString();
      
      // Add newline
      await octokit.rest.repos.createOrUpdateFileContents({
        owner: context.payload.pull_request?.head?.repo?.owner?.login || context.repo.owner,
        repo: context.payload.pull_request?.head?.repo?.name || context.repo.repo,
        path: filePath,
        message: `Initialize ${filePath} for diff tracking`,
        content: Buffer.from(currentContent + '\n').toString('base64'),
        branch: headBranch,
        sha: existingFile.data.sha
      });

      // Wait a moment then remove newline
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const updatedFile = await octokit.rest.repos.getContent({
        owner: context.payload.pull_request?.head?.repo?.owner?.login || context.repo.owner,
        repo: context.payload.pull_request?.head?.repo?.name || context.repo.repo,
        path: filePath,
        ref: headBranch
      });

      if ('sha' in updatedFile.data) {
        await octokit.rest.repos.createOrUpdateFileContents({
          owner: context.payload.pull_request?.head?.repo?.owner?.login || context.repo.owner,
          repo: context.payload.pull_request?.head?.repo?.name || context.repo.repo,
          path: filePath,
          message: `Remove initialization newline from ${filePath}`,
          content: Buffer.from(currentContent).toString('base64'),
          branch: headBranch,
          sha: updatedFile.data.sha
        });
      }

      core.info(`Successfully initialized ${filePath} - should trigger action rerun`);
    }
  } catch (error) {
    core.error(`Failed to initialize file in diff: ${error}`);
    throw error;
  }
}

/**
 * Creates a single PR review with multiple commit suggestions.
 * Uses GitHub's native commit suggestion feature with ```suggestion markdown blocks.
 * Creates one review with multiple comments to give users distinct options in the same thread.
 */
export async function createReviewWithSuggestions(suggestions: CommitSuggestion[]): Promise<void> {
  if (suggestions.length === 0) {
    core.debug('No suggestions provided, skipping review creation');
    return;
  }

  const octokit = getOctokit(inputs.GITHUB_TOKEN);
  core.info(`Creating single PR review with ${suggestions.length} commit suggestions`);

  const headBranch = context.payload.pull_request?.head?.ref;
  if (!headBranch) {
    core.warning('Could not determine PR head branch');
    return;
  }

  // Check if scanoss.json exists and is part of the diff
  const scanossJsonPath = suggestions[0]?.path || 'scanoss.json';
  const fs = await import('fs');
  
  if (fs.existsSync(scanossJsonPath)) {
    const isInDiff = await isFileInPRDiff(scanossJsonPath);
    
    if (!isInDiff) {
      core.info(`${scanossJsonPath} exists but is not part of PR diff. Initializing to trigger rerun...`);
      await initializeFileInDiff(scanossJsonPath);
      core.info('File initialized. Action should rerun automatically.');
      return;
    }
    
    core.info(`${scanossJsonPath} is part of PR diff. Proceeding with commit suggestions.`);
  }

  // Prepare comments array for the single review
  const reviewComments = [];

  for (let i = 0; i < suggestions.length; i++) {
    const suggestion = suggestions[i];
    core.debug(`Preparing comment ${i + 1}: ${suggestion.path}, line: ${suggestion.line}`);

    reviewComments.push({
      path: suggestion.path,
      body: `${suggestion.body}

\`\`\`suggestion
${suggestion.suggestedFix || '{}'}
\`\`\``,
      line: suggestion.line,
      side: 'RIGHT'
    });
  }

  // Try to create single PR review with multiple comments
  try {
    core.info('Attempting to create single PR review with multiple commit suggestions...');
    core.debug(`PR number: ${context.issue.number}`);
    core.debug(`Owner: ${context.repo.owner}, Repo: ${context.repo.repo}`);
    core.debug(`Creating review with ${reviewComments.length} comments`);

    const result = await octokit.rest.pulls.createReview({
      owner: context.repo.owner,
      repo: context.repo.repo,
      pull_number: context.issue.number,
      event: 'COMMENT',
      comments: reviewComments
    });

    core.info(
      `Successfully created PR review with ${reviewComments.length} commit suggestions. Review ID: ${result.data.id}`
    );
  } catch (error) {
    core.error(`Failed to create PR review with multiple suggestions: ${error}`);
    core.debug(`Error details: ${JSON.stringify(error, null, 2)}`);

    // Fallback: try file creation approach then create review
    try {
      core.info('Trying file creation fallback...');

      // Only need to create file once (use first suggestion)
      const firstSuggestion = suggestions[0];

      // Check if file exists to determine if we need to get SHA for updates
      let sha: string | undefined;
      try {
        const existingFile = await octokit.rest.repos.getContent({
          owner: context.payload.pull_request?.head?.repo?.owner?.login || context.repo.owner,
          repo: context.payload.pull_request?.head?.repo?.name || context.repo.repo,
          path: firstSuggestion.path,
          ref: headBranch
        });

        if ('sha' in existingFile.data) {
          sha = existingFile.data.sha;
        }
      } catch (getError) {
        core.debug(`File doesn't exist yet, will create new: ${getError}`);
      }

      // Create or update the file with first suggestion content
      await octokit.rest.repos.createOrUpdateFileContents({
        owner: context.payload.pull_request?.head?.repo?.owner?.login || context.repo.owner,
        repo: context.payload.pull_request?.head?.repo?.name || context.repo.repo,
        path: firstSuggestion.path,
        message: `Add undeclared components to ${firstSuggestion.path}`,
        content: Buffer.from(firstSuggestion.suggestedFix || '{}').toString('base64'),
        branch: headBranch,
        ...(sha && { sha })
      });

      // Update all comments to use line 1 after file creation
      const updatedComments = reviewComments.map(comment => ({
        ...comment,
        line: 1
      }));

      // Now try to create PR review again
      const result = await octokit.rest.pulls.createReview({
        owner: context.repo.owner,
        repo: context.repo.repo,
        pull_number: context.issue.number,
        event: 'COMMENT',
        comments: updatedComments
      });

      core.info(`Successfully created PR review after file creation. Review ID: ${result.data.id}`);
    } catch (fallbackError) {
      core.error(`File creation fallback also failed: ${fallbackError}`);

      // Final fallback: create regular issue comment with both options
      try {
        const fallbackBody = `## 📦 Undeclared Components Policy Violation

Choose how to handle these undeclared components:

${suggestions
  .map(
    suggestion => `### ${suggestion.body}

**Suggested content:**

\`\`\`json
${suggestion.suggestedFix || '{}'}
\`\`\`

`
  )
  .join('\n')}

*Note: These suggestions couldn't be made as commit suggestion buttons. Please apply manually to your \`${suggestions[0]?.path || 'scanoss.json'}\` file.*`;

        await createCommentOnPR(fallbackBody);
        core.info('Created comprehensive fallback comment with all suggestions');
      } catch (commentError) {
        core.error(`All approaches failed: ${commentError}`);
      }
    }
  }
}

/**
 * Gets the first workflow run ID for linking purposes.
 * For workflow_dispatch events, finds the original triggering run.
 */
export async function getFirstRunId(): Promise<number> {
  let firstRunId = context.runId;
  if (context.eventName === FIND_FIRST_RUN_EVENT) {
    const firstRun = await loadFirstRun(context.repo.owner, context.repo.repo);
    if (firstRun) {
      core.info(`First Run ID found: ${firstRun.id}`);
      firstRunId = firstRun.id;
    }
  }
  return firstRunId;
}

/**
 * Loads the first workflow run for the current SHA and workflow.
 */
async function loadFirstRun(owner: string, repo: string): Promise<WorkflowRun | null> {
  const octokit = getOctokit(inputs.GITHUB_TOKEN);
  const sha = getSHA();

  const workflowRun = await octokit.rest.actions.getWorkflowRun({
    owner,
    repo,
    run_id: context.runId
  });

  const runs = await octokit.rest.actions.listWorkflowRuns({
    owner,
    repo,
    head_sha: sha,
    workflow_id: workflowRun.data.workflow_id
  });

  // Filter by the given SHA
  const filteredRuns = runs.data.workflow_runs.filter(run => run.head_sha === sha);

  // Sort by creation date to find the first run
  const sortedRuns = filteredRuns.sort((a, b) =>
    a.created_at && b.created_at ? new Date(a.created_at).getTime() - new Date(b.created_at).getTime() : 0
  );

  return sortedRuns.length ? sortedRuns[0] : null;
}
