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

export function isPullRequest(): boolean {
  return prEvents.includes(context.eventName);
}

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
