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
import { getSHA } from '../utils/github.utils';
import { ScannerResults } from '../services/result.interfaces';
import { GitHub } from '@actions/github/lib/utils';
import * as inputs from '../app.input';

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

export enum STATUS {
  UNINITIALIZED = 'UNINITIALIZED',
  INITIALIZED = 'INITIALIZED',
  RUNNING = 'RUNNING',
  FINISHED = 'FINISHED'
}

export abstract class PolicyCheck {
  private octokit: InstanceType<typeof GitHub>;

  private checkName: string;

  private checkRunId: number;

  private _raw: any;

  private _status: STATUS;

  private _conclusion: CONCLUSION;

  constructor(checkName: string) {
    this.octokit = getOctokit(inputs.GITHUB_TOKEN);
    this.checkName = checkName;
    this._status = STATUS.UNINITIALIZED;
    this._conclusion = CONCLUSION.Neutral;
    this.checkRunId = -1;
  }

  async start(): Promise<any> {
    const result = await this.octokit.rest.checks.create({
      owner: context.repo.owner,
      repo: context.repo.repo,
      name: this.checkName,
      head_sha: getSHA()
    });

    this.checkRunId = result.data.id;
    this._raw = result.data;

    this._status = STATUS.INITIALIZED;
    return result.data;
  }

  get name(): string {
    return this.checkName;
  }

  get conclusion(): CONCLUSION {
    return this._conclusion;
  }

  get raw(): any {
    return this._raw;
  }

  get url(): string {
    return `${context.serverUrl}/${context.repo.owner}/${context.repo.repo}/actions/runs/${context.runId}/job/${this.raw.id}`;
  }

  async run(scannerResults: ScannerResults): Promise<void> {
    if (this._status === STATUS.UNINITIALIZED)
      throw new Error(`Error on finish. Policy "${this.checkName}" is not created.`);

    core.debug(`Running policy check: ${this.checkName}`);
    this._status = STATUS.RUNNING;
  }

  protected async success(summary: string, text?: string): Promise<void> {
    this._conclusion = CONCLUSION.Success;
    return await this.finish(summary, text);
  }

  protected async reject(summary: string, text?: string): Promise<void> {
    if (inputs.POLICIES_HALT_ON_FAILURE) this._conclusion = CONCLUSION.Failure;
    else this._conclusion = CONCLUSION.Neutral;
    return await this.finish(summary, text);
  }

  async finish(summary: string, text?: string): Promise<void> {
    core.debug(`Finish policy check: ${this.checkName}. (conclusion=${this._conclusion})`);
    this._status = STATUS.FINISHED;

    await this.octokit.rest.checks.update({
      owner: context.repo.owner,
      repo: context.repo.repo,
      check_run_id: this.checkRunId,
      status: 'completed',
      conclusion: this._conclusion,
      output: {
        title: this.checkName,
        summary,
        text
      }
    });
  }
}
