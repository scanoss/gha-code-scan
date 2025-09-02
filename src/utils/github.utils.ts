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
import * as fs from 'fs';
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
 * Creates a PR review with commit suggestions for specific file changes.
 * Uses GitHub's native commit suggestion feature with ```suggestion markdown blocks.
 */
export async function createReviewWithSuggestions(suggestions: CommitSuggestion[]): Promise<void> {
  if (suggestions.length === 0) {
    core.debug('No suggestions provided, skipping review creation');
    return;
  }

  const octokit = getOctokit(inputs.GITHUB_TOKEN);

  core.info(`Creating PR review with ${suggestions.length} suggestions`);
  core.debug(`PR context: owner=${context.repo.owner}, repo=${context.repo.repo}, pull_number=${context.issue.number}`);

  const comments = suggestions.map(suggestion => ({
    path: suggestion.path,
    line: suggestion.line,
    body: suggestion.suggestedFix
      ? `${suggestion.body}\n\n\`\`\`suggestion\n${suggestion.suggestedFix}\n\`\`\``
      : suggestion.body
  }));

  core.debug(`Review comments: ${JSON.stringify(comments, null, 2)}`);

  try {
    // For files that don't exist, we need to create an empty file first, then suggest content
    if (comments.length === 1 && !fs.existsSync(suggestions[0].path)) {
      core.info('File does not exist, creating empty file then suggesting content for commit suggestion button');
      const suggestion = suggestions[0];
      
      try {
        // For PRs, use the head branch, not the base branch
        const headBranch = context.payload.pull_request?.head?.ref;
        if (!headBranch) {
          throw new Error('Could not determine PR head branch');
        }
        
        core.debug(`Working on PR head branch: ${headBranch}`);
        
        // Get the current commit SHA for the PR head branch
        const { data: ref } = await octokit.rest.git.getRef({
          owner: context.payload.pull_request?.head?.repo?.owner?.login || context.repo.owner,
          repo: context.payload.pull_request?.head?.repo?.name || context.repo.repo,
          ref: `heads/${headBranch}`
        });
        
        // Create an empty file first
        const emptyContent = '{}';
        
        // Create blob for empty file
        const { data: emptyBlob } = await octokit.rest.git.createBlob({
          owner: context.repo.owner,
          repo: context.repo.repo,
          content: Buffer.from(emptyContent).toString('base64'),
          encoding: 'base64'
        });
        
        // Get current tree
        const { data: currentCommit } = await octokit.rest.git.getCommit({
          owner: context.repo.owner,
          repo: context.repo.repo,
          commit_sha: ref.object.sha
        });
        
        // Create new tree with empty file
        const { data: newTree } = await octokit.rest.git.createTree({
          owner: context.repo.owner,
          repo: context.repo.repo,
          base_tree: currentCommit.tree.sha,
          tree: [{
            path: suggestion.path,
            mode: '100644',
            type: 'blob',
            sha: emptyBlob.sha
          }]
        });
        
        // Create commit with empty file
        const { data: newCommit } = await octokit.rest.git.createCommit({
          owner: context.repo.owner,
          repo: context.repo.repo,
          message: `Add empty ${suggestion.path} for component declarations`,
          tree: newTree.sha,
          parents: [ref.object.sha]
        });
        
        // Update branch to point to new commit
        await octokit.rest.git.updateRef({
          owner: context.repo.owner,
          repo: context.repo.repo,
          ref: `heads/${headBranch}`,
          sha: newCommit.sha
        });
        
        core.info(`Created empty ${suggestion.path} file in commit ${newCommit.sha}`);
        
        // Now create a PR review comment with suggestion to replace empty content
        const reviewBody = `${suggestion.body}

\`\`\`suggestion
${suggestion.suggestedFix || '{}'}
\`\`\``;
        
        // Create line-specific comment on the newly created file
        const result = await octokit.rest.pulls.createReview({
          owner: context.repo.owner,
          repo: context.repo.repo,
          pull_number: context.issue.number,
          event: 'COMMENT',
          comments: [{
            path: suggestion.path,
            line: 1,
            body: reviewBody
          }]
        });
        
        core.info(`Successfully created PR review with commit suggestion button. Review ID: ${result.data.id}`);
        return;
        
      } catch (apiError) {
        core.error(`Failed to create file and suggestion: ${apiError}`);
        // Fall through to existing file logic or error handling
      }
    }
    
    // For existing files, we need to ensure they're part of the PR diff to create suggestions
    if (comments.length === 1 && fs.existsSync(suggestions[0].path)) {
      core.info('File exists, creating commit suggestion for existing file');
      const suggestion = suggestions[0];
      
      try {
        // For PRs, use the head branch, not the base branch
        const headBranch = context.payload.pull_request?.head?.ref;
        if (!headBranch) {
          throw new Error('Could not determine PR head branch');
        }
        
        core.debug(`Working on PR head branch: ${headBranch}`);
        
        // Get the current commit SHA for the PR head branch
        const { data: ref } = await octokit.rest.git.getRef({
          owner: context.payload.pull_request?.head?.repo?.owner?.login || context.repo.owner,
          repo: context.payload.pull_request?.head?.repo?.name || context.repo.repo,
          ref: `heads/${headBranch}`
        });
        
        // Create blob for updated file content
        const { data: updatedBlob } = await octokit.rest.git.createBlob({
          owner: context.repo.owner,
          repo: context.repo.repo,
          content: Buffer.from(suggestion.suggestedFix || '{}').toString('base64'),
          encoding: 'base64'
        });
        
        // Get current tree
        const { data: currentCommit } = await octokit.rest.git.getCommit({
          owner: context.repo.owner,
          repo: context.repo.repo,
          commit_sha: ref.object.sha
        });
        
        // Create new tree with updated file
        const { data: newTree } = await octokit.rest.git.createTree({
          owner: context.repo.owner,
          repo: context.repo.repo,
          base_tree: currentCommit.tree.sha,
          tree: [{
            path: suggestion.path,
            mode: '100644',
            type: 'blob',
            sha: updatedBlob.sha
          }]
        });
        
        // Create commit with updated file
        const { data: newCommit } = await octokit.rest.git.createCommit({
          owner: context.repo.owner,
          repo: context.repo.repo,
          message: `Update ${suggestion.path} with undeclared components`,
          tree: newTree.sha,
          parents: [ref.object.sha]
        });
        
        // Update branch to point to new commit
        await octokit.rest.git.updateRef({
          owner: context.repo.owner,
          repo: context.repo.repo,
          ref: `heads/${headBranch}`,
          sha: newCommit.sha
        });
        
        core.info(`Updated existing ${suggestion.path} file in commit ${newCommit.sha}`);
        
        // Create a review comment explaining what was done
        const reviewBody = `## ✅ Updated ${suggestion.path}

I've automatically updated your \`${suggestion.path}\` file to include the undeclared components found in the scan.

The file now includes all required component declarations to resolve the policy violation. 🎉`;
        
        const result = await octokit.rest.pulls.createReview({
          owner: context.repo.owner,
          repo: context.repo.repo,
          pull_number: context.issue.number,
          event: 'COMMENT',
          body: reviewBody
        });
        
        core.info(`Successfully updated existing file and created review. Review ID: ${result.data.id}`);
        return;
        
      } catch (apiError) {
        core.error(`Failed to update existing file: ${apiError}`);
        // Fall through to fallback
      }
    }
    
    // Fallback: create line-specific comments (may not work without proper diff)
    const result = await octokit.rest.pulls.createReview({
      owner: context.repo.owner,
      repo: context.repo.repo,
      pull_number: context.issue.number,
      event: 'COMMENT',
      comments
    });
    core.info(
      `Successfully created PR review with ${suggestions.length} commit suggestions. Review ID: ${result.data.id}`
    );
  } catch (error) {
    core.error(`Failed to create PR review with suggestions: ${error}`);
    core.debug(`Error details: ${JSON.stringify(error, null, 2)}`);

    // Try fallback: create a regular issue comment instead
    try {
      core.info('Attempting fallback: creating regular PR comment instead of review');
      const fallbackBody = suggestions
        .map(
          s =>
            `## 📦 Scanoss.json Suggestion\n\n${s.body}\n\n**File:** \`${s.path}\`\n\n\`\`\`json\n${s.suggestedFix || 'No suggestion content'}\n\`\`\``
        )
        .join('\n\n---\n\n');

      await createCommentOnPR(fallbackBody);
      core.info('Fallback comment created successfully');
    } catch (fallbackError) {
      core.error(`Fallback comment also failed: ${fallbackError}`);
      throw error;
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
