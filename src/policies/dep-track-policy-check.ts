// SPDX-License-Identifier: MIT
/*
   Copyright (c) 2025, SCANOSS

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

import * as core from '@actions/core';
import { CHECK_NAME } from '../app.config';
import { PolicyCheck } from './policy-check';
import { EXECUTABLE } from '../app.input';
import * as exec from '@actions/exec';
import { DependencyTrackArgumentBuilder } from './argument_builders/dependency_track/dep-track-argument-builder';
import { ArgumentBuilder } from './argument_builders/argument-builder';
import { isOverMaxCharacterLimitAPI } from '../services/github.service';

/**
 * TODO Change Documentation
 * This class checks if any of the components identified in the scanner results are subject to copyleft licenses.
 * It filters components based on their licenses and looks for those with copyleft obligations.
 * It then generates a summary and detailed report of the findings.
 */
export class DepTrackPolicyCheck extends PolicyCheck {
  static policyName = 'Dependency Track Policy';
  private argumentBuilder: ArgumentBuilder;

  constructor(argumentBuilder: DependencyTrackArgumentBuilder = new DependencyTrackArgumentBuilder()) {
    super(`${CHECK_NAME}: ${DepTrackPolicyCheck.policyName}`);
    this.argumentBuilder = argumentBuilder;
  }

  async run(): Promise<void> {
    core.info(`Checking Dependency Track for Project Violations...`);
    super.initStatus();
    const args = await this.argumentBuilder.build();
    const options = {
      failOnStdErr: false,
      ignoreReturnCode: true
    };

    const { stdout, stderr, exitCode } = await exec.getExecOutput(EXECUTABLE, args, options);
    let summary = stdout;
    let details = stderr;
    core.info(`stdout: ${stdout}, stderr: ${stderr}, exitCode: ${exitCode}`);
    if (exitCode === 0) {
      await this.success('### :white_check_mark: Policy Pass \n #### No policy violations were found', undefined);
      return;
    }

    const { id } = await this.uploadArtifact(details);
    core.debug(`Dependency Track Artifact ID: ${id}`);
    if (id) details = await this.concatPolicyArtifactURLToPolicyCheck(details, id);

    if (isOverMaxCharacterLimitAPI(summary)) {
      summary = '';
    }

    return this.reject(summary, details);
  }

  artifactPolicyFileName(): string {
    return 'dep-track-policy-check-results.md';
  }

  getPolicyName(): string {
    return DepTrackPolicyCheck.policyName;
  }
}
