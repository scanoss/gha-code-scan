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

import { PolicyCheck } from './policy-check';
import { CHECK_NAME } from '../app.config';
import * as core from '@actions/core';
import { EXECUTABLE, SCANOSS_SETTINGS } from '../app.input';
import * as exec from '@actions/exec';
import { UndeclaredArgumentBuilder } from './argument_builders/undeclared-argument-builder';
import { ArgumentBuilder } from './argument_builders/argument-builder';

/**
 * Verifies that all components identified in scanner results are declared in the project's SBOM.
 * The run method compares components found by the scanner against those declared in the SBOM.
 *
 * It identifies and reports undeclared components, generating a summary and detailed report of the findings.
 *
 */
export class UndeclaredPolicyCheck extends PolicyCheck {
  static policyName = 'Undeclared Policy';
  private argumentBuilder: ArgumentBuilder;
  constructor(argumentBuilder: ArgumentBuilder = new UndeclaredArgumentBuilder()) {
    super(`${CHECK_NAME}: ${UndeclaredPolicyCheck.policyName}`);
    this.argumentBuilder = argumentBuilder;
  }

  async run(): Promise<void> {
    core.info(`Running Undeclared Components Policy Check...`);
    super.initStatus();
    const args = await this.argumentBuilder.build();
    core.debug(`Args: ${args}`);
    const options = {
      failOnStdErr: false,
      ignoreReturnCode: true
    };

    const { stdout, stderr, exitCode } = await exec.getExecOutput(EXECUTABLE, args, options);
    const summary = stdout;
    let details = stderr;

    if (!SCANOSS_SETTINGS) {
      core.warning('Undeclared policy is being used with SCANOSS settings disabled');
    }

    if (exitCode === 1) {
      await this.success('### :white_check_mark: Policy Pass \n #### Not undeclared components were found', undefined);
      return;
    }

    //await this.uploadArtifact(details);
    // core.debug(`Undeclared Artifact ID: ${id}`);
    // if (id) details = await this.concatPolicyArtifactURLToPolicyCheck(details, id);

    return this.reject(summary, details);
  }

  artifactPolicyFileName(): string {
    return 'policy-check-undeclared-results.md';
  }

  getPolicyName(): string {
    return UndeclaredPolicyCheck.policyName;
  }
}
