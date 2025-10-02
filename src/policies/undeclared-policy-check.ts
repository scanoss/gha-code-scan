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
import { EXECUTABLE, SCANOSS_SETTINGS, SETTINGS_FILE_PATH } from '../app.input';
import * as exec from '@actions/exec';
import { UndeclaredArgumentBuilder } from './argument_builders/components/undeclared-argument-builder';
import { ArgumentBuilder } from './argument_builders/argument-builder';
import { isOverMaxCharacterLimitAPI } from '../services/github.service';
import { context } from '@actions/github';
import { isPullRequest, resolveRepoAndSha } from '../utils/github.utils';
import * as fs from 'fs';

/**
 * Verifies that all components identified in scanner results are declared in the project's SBOM.
 * The run method compares components found by the scanner against those declared in the SBOM.
 *
 * It identifies and reports undeclared components, generating a summary and detailed report of the findings.
 *
 */
export class UndeclaredPolicyCheck extends PolicyCheck {
  static policyName = 'Undeclared';
  private argumentBuilder: ArgumentBuilder;
  constructor(argumentBuilder: ArgumentBuilder = new UndeclaredArgumentBuilder()) {
    super(`${CHECK_NAME}: ${UndeclaredPolicyCheck.policyName}`);
    this.argumentBuilder = argumentBuilder;
  }

  /**
   * Executes the undeclared components policy check.
   */
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
    let summary = stdout;
    let details = stderr;

    if (!SCANOSS_SETTINGS) {
      core.warning('Undeclared policy is being used with SCANOSS settings disabled');
    }

    if (exitCode === 0) {
      await this.success('### :white_check_mark: Policy Pass \n #### No undeclared components were found', undefined);
      return;
    }

    if (exitCode === 1) {
      // Technical error occurred
      core.warning('Undeclared policy check encountered an error');
      core.debug(`Undeclared policy check stderr: ${stderr}`);
      const errorSummary = '### :warning: Policy Check Error \n #### Unable to complete undeclared component check';
      const errorDetails = 'Error details: Check debug logs for more information';

      await this.technicalError(errorSummary, errorDetails);
      return;
    }

    // exitCode === 2 means policy violations found
    // Combine stdout (summary) and stderr (details) for comprehensive reporting
    if (stderr) {
      details = `${stdout}\n\n${stderr}`;
    } else {
      details = stdout;
    }

    // Add scanoss.json file link and context based on file existence
    details += `\n\n---\n\n`;
    details += `**📝 Quick Fix:**\n`;

    // Get the correct branch name for links
    let branchName = context.ref.replace('refs/heads/', '');
    if (isPullRequest()) {
      const pull = context.payload.pull_request;
      if (pull?.head.ref) {
        branchName = pull.head.ref;
      }
    }

    if (fs.existsSync(SETTINGS_FILE_PATH)) {
      const { owner, repo } = resolveRepoAndSha();
      const settingsFileUrl = `https://github.com/${owner}/${repo}/edit/${branchName}/${SETTINGS_FILE_PATH}`;

      // Try to replace the existing JSON with merged version
      const mergedJson = mergeWithExistingScanossJson(details);
      if (mergedJson) {
        // Replace the first JSON block with merged version, fenced for readability
        details = details.replace(/{[\s\S]*?}/, `\`\`\`json\n${mergedJson}\n\`\`\``);
      }

      details += `\n\n📝 Quick Fix:\n`;
      details += `[Edit ${SETTINGS_FILE_PATH} file](${settingsFileUrl}) and replace with the JSON snippet provided above to declare these components and resolve policy violations.`;
    } else {
      // Build JSON content from the details output that already contains the structure
      const jsonContent = extractJsonFromPolicyDetails(details);
      if (!jsonContent) {
        core.warning('Could not extract JSON content from policy details');
        return;
      }

      const encodedJson = encodeURIComponent(jsonContent);
      const { owner, repo } = resolveRepoAndSha();
      const createFileUrl = `https://github.com/${owner}/${repo}/new/${branchName}?filename=${SETTINGS_FILE_PATH}&value=${encodedJson}`;
      details += `\n\n📝 Quick Fix:\n`;
      details += `${SETTINGS_FILE_PATH} doesn't exist. Create it in your repository root with the JSON snippet provided above to resolve policy violations.\n\n`;
      details += `[Create ${SETTINGS_FILE_PATH} file](${createFileUrl})`;
    }

    const { id } = await this.uploadArtifact(details);
    core.debug(`Undeclared Artifact ID: ${id}`);
    if (id) details = await this.concatPolicyArtifactURLToPolicyCheck(details, id);

    if (isOverMaxCharacterLimitAPI(summary)) {
      summary = '';
    }

    return this.reject(summary, details);
  }

  /**
   * Returns the filename for undeclared policy check artifact results.
   */
  artifactPolicyFileName(): string {
    return 'policy-check-undeclared-results.md';
  }

  /**
   * Returns the name of the undeclared components policy.
   */
  getPolicyName(): string {
    return UndeclaredPolicyCheck.policyName;
  }
}

/**
 * Extracts JSON content from policy details using the marker text
 */
function extractJsonFromPolicyDetails(details: string): string | null {
  const marker = 'Add the following snippet into your';
  const markerIndex = details.indexOf(marker);

  if (markerIndex === -1) {
    core.warning('Could not find JSON marker in policy details');
    return null;
  }

  // Find the start of JSON (first '{' after the marker)
  const searchStart = markerIndex + marker.length;
  const jsonStart = details.indexOf('{', searchStart);

  if (jsonStart === -1) {
    core.warning('Could not find JSON start in policy details');
    return null;
  }

  // Find the matching closing brace
  let braceCount = 0;
  let jsonEnd = -1;

  for (let i = jsonStart; i < details.length; i++) {
    if (details[i] === '{') {
      braceCount++;
    } else if (details[i] === '}') {
      braceCount--;
      if (braceCount === 0) {
        jsonEnd = i;
        break;
      }
    }
  }

  if (jsonEnd === -1) {
    core.warning('Could not find JSON end in policy details');
    return null;
  }

  const jsonContent = details.substring(jsonStart, jsonEnd + 1);

  // Validate it's valid JSON
  try {
    JSON.parse(jsonContent);
    return jsonContent;
  } catch (error) {
    core.warning(`Extracted content is not valid JSON: ${error}`);
    return null;
  }
}

/**
 * Merges new undeclared components with existing scanoss.json file
 */
function mergeWithExistingScanossJson(policyDetails: string): string | null {
  try {
    // Extract new components from policy details
    const jsonContent = extractJsonFromPolicyDetails(policyDetails);
    if (!jsonContent) {
      core.warning('Could not extract new components from policy details');
      return null;
    }

    const newStructure = JSON.parse(jsonContent);
    const newComponents = newStructure.bom?.include || [];

    if (newComponents.length === 0) {
      core.warning('No new components found to add');
      return null;
    }

    // Read existing settings file
    const existingContent = fs.readFileSync(SETTINGS_FILE_PATH, 'utf8');
    const existingConfig = JSON.parse(existingContent);

    // Ensure bom section exists
    if (!existingConfig.bom) {
      existingConfig.bom = {};
    }

    // Ensure include array exists
    if (!existingConfig.bom.include) {
      existingConfig.bom.include = [];
    }

    // Ensure include is an array
    if (!Array.isArray(existingConfig.bom.include)) {
      core.warning('Existing bom.include is not an array, creating new array');
      existingConfig.bom.include = [];
    }

    // Add all new components (no duplicate checking needed)
    existingConfig.bom.include.push(...newComponents);

    core.info(`Added ${newComponents.length} new components to existing ${SETTINGS_FILE_PATH} structure`);

    // Return formatted JSON
    return JSON.stringify(existingConfig, null, 2);
  } catch (error) {
    core.warning(`Failed to merge with existing ${SETTINGS_FILE_PATH}: ${error}`);
    return null;
  }
}
