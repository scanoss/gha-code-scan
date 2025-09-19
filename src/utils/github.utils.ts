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
  octokit.rest.issues.createComment({
    issue_number: context.issue.number,
    owner: context.repo.owner,
    repo: context.repo.repo,
    body: message
  });
}

/**
 * Gets the first workflow run ID for linking purposes.
 * For workflow_dispatch events, finds the original triggering run from the same workflow.
 */
export async function getFirstRunId(): Promise<number> {
  let firstRunId = context.runId;
  if (context.eventName === FIND_FIRST_RUN_EVENT) {
    const firstRun = await loadFirstRun(context.repo.owner, context.repo.repo);
    if (firstRun) {
      core.info(`First Run ID found: ${firstRun.id} for workflow: ${context.workflow}`);
      firstRunId = firstRun.id;
    } else {
      core.info(`No first run found for workflow: ${context.workflow}, using current run: ${context.runId}`);
    }
  }
  return firstRunId;
}

/**
 * Loads the workflow run that contains the SCANOSS action for the current SHA.
 * This ensures policy checks are only attached to workflows that actually use SCANOSS.
 */
async function loadFirstRun(owner: string, repo: string): Promise<WorkflowRun | null> {
  const octokit = getOctokit(inputs.GITHUB_TOKEN);
  const sha = getSHA();

  try {
    // Get all workflow runs for this repository and then filter by SHA
    const runs = await octokit.rest.actions.listWorkflowRunsForRepo({
      owner,
      repo,
      head_sha: sha
    });

    // Filter runs to find those that contain SCANOSS action
    const scanossRuns: WorkflowRun[] = [];

    for (const run of runs.data.workflow_runs) {
      if (run.head_sha !== sha) continue;

      try {
        // Check if this workflow run contains SCANOSS action by examining its jobs
        const jobs = await octokit.rest.actions.listJobsForWorkflowRun({
          owner,
          repo,
          run_id: run.id
        });

        // Look for jobs that have steps using SCANOSS action specifically
        const hasScanossAction = jobs.data.jobs.some(job =>
          job.steps?.some(step => {
            const uses = (step as any).uses;
            const stepName = step.name?.toLowerCase() || '';

            // Match SCANOSS action usage patterns
            return uses?.includes('scanoss/code-scan-action') || // Direct SCANOSS action reference
              uses?.match(/scanoss\/.*action/) || // Any SCANOSS action variant
              (uses === './' && (
                stepName.includes('scanoss') || // Local action with SCANOSS in step name
                stepName.includes('code scan') || // Local action with 'code scan' in step name
                stepName.includes('scan') // Local action with 'scan' in step name (broad but reasonable)
              ));
          })
        );

        if (hasScanossAction) {
          scanossRuns.push(run);
          core.debug(`Found SCANOSS workflow run: ${run.id} in workflow: ${run.name}`);
        }
      } catch (jobError) {
        core.debug(`Could not check jobs for run ${run.id}: ${jobError}`);
        // Continue checking other runs
      }
    }

    if (scanossRuns.length === 0) {
      core.warning(`No workflow runs found with SCANOSS action for SHA ${sha}`);
      return null;
    }

    // Sort by creation date to find the first SCANOSS run
    const sortedRuns = scanossRuns.sort((a, b) =>
      a.created_at && b.created_at ? new Date(a.created_at).getTime() - new Date(b.created_at).getTime() : 0
    );

    const firstRun = sortedRuns[0];
    core.info(`Selected SCANOSS workflow run: ${firstRun.id} from workflow: ${firstRun.name}`);

    return firstRun;
  } catch (error) {
    core.error(`Failed to load SCANOSS workflow run: ${error}`);
    return null;
  }
}
