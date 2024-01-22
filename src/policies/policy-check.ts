import { context, getOctokit } from '@actions/github';
import * as core from '@actions/core';
import { getSHA } from '../utils/github.utils';

const NO_INITIALIZATE = -1;

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

  async run(text: string): Promise<any> {
    // Promise<OctokitResponse>
    if (this.checkRunId === NO_INITIALIZATE)
      throw new Error(`Error on finish. Check "${this.checkName}" is not created.`);

    const result = await this.octokit.rest.checks.update({
      owner: context.repo.owner,
      repo: context.repo.repo,
      check_run_id: this.checkRunId,
      status: 'completed',
      conclusion: 'success',
      output: {
        title: this.checkName,
        summary: 'Policy checker completed successfully',
        text
      }
    });

    return result.data;
  }
}
