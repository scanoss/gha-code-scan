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

import * as core from '@actions/core';
import { CHECK_NAME } from '../app.config';
import { PolicyCheck } from './policy-check';
import { EXECUTABLE } from '../app.input';
import * as exec from '@actions/exec';
import { CopyLeftArgumentBuilder } from './argument_builders/licenses/copyleft-argument-builder';
import { ArgumentBuilder } from './argument_builders/argument-builder';
import { isOverMaxCharacterLimitAPI } from '../services/github.service';

/**
 * This class checks if any of the components identified in the scanner results are subject to copyleft licenses.
 * It filters components based on their licenses and looks for those with copyleft obligations.
 * It then generates a summary and detailed report of the findings.
 */
export class CopyleftPolicyCheck extends PolicyCheck {
  static policyName = 'Copyleft';
  private argumentBuilder: ArgumentBuilder;

  constructor(argumentBuilder: CopyLeftArgumentBuilder = new CopyLeftArgumentBuilder()) {
    super(`${CHECK_NAME}: ${CopyleftPolicyCheck.policyName}`);
    this.argumentBuilder = argumentBuilder;
  }

  /**
   * Executes the copyleft policy check.
   */
  async run(): Promise<void> {
    core.info(`Running Copyleft Policy Check...`);
    super.initStatus();
    const args = await this.argumentBuilder.build();
    const options = {
      failOnStdErr: false,
      ignoreReturnCode: true
    };

    const { stdout, stderr, exitCode } = await exec.getExecOutput(EXECUTABLE, args, options);
    let summary = stdout;
    let details = stderr;
    // Happy path. All goodness
    if (exitCode === 0) {
      await this.success('### :white_check_mark: Policy Pass \n #### No copyleft licenses were found', undefined);
      return;
    } else if (exitCode === 1) {
      // Technical error occurred
      core.warning('Copyleft policy check encountered an error');
      core.debug(`Copyleft policy check stderr: ${stderr}`);
      const errorSummary = '### :warning: Policy Check Error \n #### Unable to complete copyleft license check';
      const errorDetails = 'Error details: Check debug logs for more information';
      await this.technicalError(errorSummary, errorDetails);
      return;
    }
    // exitCode === 2 means policy violations found
    const { id } = await this.uploadArtifact(stdout);
    core.debug(`Copyleft Artifact ID: ${id}`);
    if (id) {
      details = await this.concatPolicyArtifactURLToPolicyCheck(stderr, id);
    }
    // Checking if the summary is too long
    if (isOverMaxCharacterLimitAPI(summary)) {
      summary = '';
    }
    // Reject/fail the policy check (unless disabled)
    return this.reject(summary, details);
  }

  /**
   * Returns the artifact filename for copyleft policy results.
   */
  artifactPolicyFileName(): string {
    return 'policy-check-copyleft-results.md';
  }

  /**
   * Returns the policy name for copyleft checks.
   */
  getPolicyName(): string {
    return CopyleftPolicyCheck.policyName;
  }
}
