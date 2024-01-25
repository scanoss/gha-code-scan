import { getLicenses, readResult } from './services/result.service';
import { createCommentOnPR, isPullRequest } from './utils/github.utils';
import { CopyleftPolicyCheck } from './policies/copyleft-policy-check';
import { generateSummary, getLicensesTable } from './services/report.service';
import * as core from '@actions/core';
import * as exec from '@actions/exec';
import * as inputs from './app.input';
import * as outputs from './app.output';

import { commandBuilder } from './services/scan.service';
/**
 * The main function for the action.
 * @returns {Promise<void>} Resolves when the action is complete.
 */
export async function run(): Promise<void> {
  try {
    core.debug(`SCANOSS Scan Action started...`);

    // create policies
    core.debug(`Creating policies`);
    const policies = [new CopyleftPolicyCheck()];
    policies.forEach(async policy => policy.start());

    // run scan
    const { stdout, stderr } = await exec.getExecOutput(commandBuilder(), []);
    const scannerResults = await readResult(inputs.OUTPUT_PATH);

    // run policies
    policies.forEach(async policy => await policy.run(scannerResults));

    if (isPullRequest()) {
      // create reports
      const report = generateSummary(scannerResults);
      createCommentOnPR(report);
    }

    // set outputs for other workflow steps to use
    core.setOutput(outputs.RESULT_FILEPATH, inputs.OUTPUT_PATH);
    core.setOutput(outputs.STDOUT_SCAN_COMMAND, stdout);
  } catch (error) {
    // fail the workflow run if an error occurs
    if (error instanceof Error) core.setFailed(error.message);
  }
}
