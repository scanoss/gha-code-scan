import { context, getOctokit } from '@actions/github';
import * as core from '@actions/core';
import { getSHA } from '../utils/github.utils';
import { ScannerResults } from '../services/result.interfaces';
import { GitHub } from '@actions/github/lib/utils';
import { OctokitResponse } from '@octokit/types';

const UNINITIALIZED = -1;

export enum CONCLUSION {
  ActionRequired = 'action_required',
  Cancelled = 'cancelled',
  Failure = 'failure',
  Neutral = 'neutral',
  Success = 'success',
  Skipped = 'skipped',
  Stale = 'stale',
  TimedOut = 'timed_out'
}

export abstract class PolicyCheck {
  private octokit: InstanceType<typeof GitHub>;

  private checkName: string;

  private checkRunId: number;

  constructor(checkName: string) {
    const GITHUB_TOKEN = core.getInput('github-token');

    this.octokit = getOctokit(GITHUB_TOKEN);
    this.checkName = checkName;
    this.checkRunId = UNINITIALIZED;
  }

  async start(): Promise<any> {
    const result = await this.octokit.rest.checks.create({
      owner: context.repo.owner,
      repo: context.repo.repo,
      name: this.checkName,
      head_sha: getSHA()
    });

    this.checkRunId = result.data.id;

    return result.data;
  }

  async run(scannerResults: ScannerResults): Promise<void> {
    if (this.checkRunId === UNINITIALIZED)
      throw new Error(`Error on finish. Policy "${this.checkName}" is not created.`);

    core.debug(`Running policy check: ${this.checkName}`);
  }

  protected async success(summary: string, text: string): Promise<void> {
    await this.finish(CONCLUSION.Success, summary, text);
  }

  protected async reject(summary: string, text: string): Promise<void> {
    await this.finish(CONCLUSION.Failure, summary, text);
  }

  protected async finish(conclusion: CONCLUSION | undefined, summary: string, text: string): Promise<void> {
    core.debug(`Finish policy check: ${this.checkName}. (conclusion=${conclusion})`);

    const result = await this.octokit.rest.checks.update({
      owner: context.repo.owner,
      repo: context.repo.repo,
      check_run_id: this.checkRunId,
      status: 'completed',
      conclusion,
      output: {
        title: this.checkName,
        summary,
        text
      }
    });
  }
}
