import { context, getOctokit } from '@actions/github';
import * as core from '@actions/core';
import { getSHA } from '../utils/github.utils';
import { ScannerResults } from '../services/result.interfaces';

const NO_INITIALIZATE = -1;

export enum CONCLUSSION {
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
  private octokit; // TODO: type from actions/github ?

  private checkName: string;

  private checkRunId: number;

  constructor(checkName: string) {
    const GITHUB_TOKEN = core.getInput('github-token'); // TODO: move to inputs.ts file?

    this.octokit = getOctokit(GITHUB_TOKEN);
    this.checkName = checkName;
    this.checkRunId = NO_INITIALIZATE;
  }

  async start(): Promise<any> {
    // Promise<OctokitResponse>
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
    if (this.checkRunId === NO_INITIALIZATE)
      throw new Error(`Error on finish. Policy "${this.checkName}" is not created.`);

    core.debug(`Running policy check: ${this.checkName}`);
  }

  protected async success(summary: string, text: string): Promise<void> {
    await this.finish(CONCLUSSION.ActionRequired, summary, text);
  }

  protected async reject(summary: string, text: string): Promise<void> {
    await this.finish(CONCLUSSION.Failure, summary, text);
  }

  protected async finish(conclusion: CONCLUSSION | undefined, summary: string, text: string): Promise<void> {
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
