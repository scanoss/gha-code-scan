import { context, getOctokit } from '@actions/github';
import * as core from '@actions/core';
import { getSHA } from '../utils/github.utils';
import { ScannerResults } from '../services/result.interfaces';
import { GitHub } from '@actions/github/lib/utils';
import * as inputs from '../app.input';

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
    this.octokit = getOctokit(inputs.GITHUB_TOKEN);
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

  get name(): string {
    return this.checkName;
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
    await this.finish(inputs.POLICIES_HALT_ON_FAILURE ? CONCLUSION.Failure : CONCLUSION.Neutral, summary, text);
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
