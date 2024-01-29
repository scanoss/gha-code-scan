import { context, getOctokit } from '@actions/github';
import * as core from '@actions/core';
import * as inputs from '../app.input';

const prEvents = ['pull_request', 'pull_request_review', 'pull_request_review_comment'];

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
