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

import { createCommentOnPR, isPullRequest, getFirstRunId } from './utils/github.utils';
import { generateJobSummary, generatePRSummary } from './services/report.service';
import * as core from '@actions/core';
import * as inputs from './app.input';
import * as outputs from './app.output';

import { scanService, uploadResults } from './services/scan.service';
import { policyManager } from './policies/policy.manager';

/**
 * The main function for the action.
 * @returns {Promise<void>} Resolves when the action is complete.
 */
export async function run(): Promise<void> {
  try {
    core.debug(`SCANOSS Scan Action started...`);

    // create policies
    core.debug(`Creating policies`);
    const firstRunId = await getFirstRunId();

    //Read declared policies on input parameter 'policies' and create an instance for each one.
    const policies = policyManager.getPolicies();
    for (const policy of policies) {
      await policy.start(firstRunId);
    }

    // run scan
    const { scan, stdout } = await scanService.scan();
    await uploadResults();

    // run policies
    for (const policy of policies) {
      await policy.run();
    }

    if (isPullRequest()) {
      // create reports
      const report = generatePRSummary(scan, policies);
      await createCommentOnPR(report);
    }

    await generateJobSummary(scan, policies);
    // set outputs for other workflow steps to use
    core.setOutput(outputs.RESULT_FILEPATH, inputs.OUTPUT_FILEPATH);
    core.setOutput(outputs.STDOUT_SCAN_COMMAND, stdout);
  } catch (error) {
    // fail the workflow run if an error occurs
    if (error instanceof Error) core.setFailed(error.message);
  }
}
