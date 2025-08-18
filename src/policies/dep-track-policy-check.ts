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
import * as inputs from '../app.input';

/**
 * This class performs policy checks using Dependency Track integration.
 * It uploads SBOM (Software Bill of Materials) data to a Dependency Track server
 * and checks for policy violations including security vulnerabilities, license violations,
 * and other compliance issues as configured in the Dependency Track policies.
 * It then generates a summary and detailed report of any violations found.
 */
export class DepTrackPolicyCheck extends PolicyCheck {
  static policyName = 'Dependency Track Policy';
  private argumentBuilder: ArgumentBuilder;
  private uploadAttempted: boolean = true;

  constructor(argumentBuilder: DependencyTrackArgumentBuilder = new DependencyTrackArgumentBuilder()) {
    super(`${CHECK_NAME}: ${DepTrackPolicyCheck.policyName}`);
    this.argumentBuilder = argumentBuilder;
  }

  /**
   * Sets whether the upload to Dependency Track was attempted
   */
  setUploadAttempted(attempted: boolean): void {
    this.uploadAttempted = attempted;
  }

  /**
   * Parse policy check error and return appropriate error message and details
   */
  private parseError(stderr: string): { message: string; details: string } {
    const lowerStderr = stderr.toLowerCase();
    
    // Determine error type based on stderr content
    const getErrorType = (): string => {
      if (lowerStderr.includes('connection refused') || lowerStderr.includes('no route to host')) {
        return 'CONNECTION_ERROR';
      }
      if (lowerStderr.includes('401') || lowerStderr.includes('unauthorized')) {
        return 'AUTH_ERROR';
      }
      if (lowerStderr.includes('404') || lowerStderr.includes('not found')) {
        return 'NOT_FOUND_ERROR';
      }
      if (lowerStderr.includes('project') && lowerStderr.includes('not found')) {
        return 'PROJECT_NOT_FOUND';
      }
      if (lowerStderr.includes('timeout')) {
        return 'TIMEOUT_ERROR';
      }
      return 'GENERIC_ERROR';
    };

    switch (getErrorType()) {
      case 'CONNECTION_ERROR':
        return {
          message: 'Cannot connect to Dependency Track server',
          details: `Connection failed to: ${inputs.DEPENDENCY_TRACK_URL}\n` +
            `• Server may not be running\n` +
            `• URL may be incorrect\n` +
            `• Network connectivity issues`
        };
        
      case 'AUTH_ERROR':
        return {
          message: 'Authentication failed with Dependency Track',
          details: `Authentication error for: ${inputs.DEPENDENCY_TRACK_URL}\n` +
            `• API key may be invalid\n` +
            `• API key may be expired\n` +
            `• Check user permissions`
        };
        
      case 'NOT_FOUND_ERROR':
        return {
          message: 'Dependency Track endpoint not found',
          details: `Endpoint not found: ${inputs.DEPENDENCY_TRACK_URL}\n` +
            `• URL may be incorrect\n` +
            `• API endpoint may not exist\n` +
            `• Check Dependency Track version`
        };
        
      case 'PROJECT_NOT_FOUND':
        return {
          message: 'Project not found in Dependency Track',
          details: `Project not found:\n` +
            `• Project ID: ${inputs.DEPENDENCY_TRACK_PROJECT_ID || 'Not specified'}\n` +
            `• Project Name: ${inputs.DEPENDENCY_TRACK_PROJECT_NAME || 'Not specified'}\n` +
            `• Upload Token: ${inputs.DEPENDENCY_TRACK_UPLOAD_TOKEN ? 'Present' : 'Not specified'}\n` +
            `Solutions: Create project in Dependency Track first`
        };
        
      case 'TIMEOUT_ERROR':
        return {
          message: 'Dependency Track server timeout',
          details: `Server timeout for: ${inputs.DEPENDENCY_TRACK_URL}\n` +
            `• Server may be overloaded\n` +
            `• Network latency issues\n` +
            `• Try again later`
        };
        
      default:
        return {
          message: 'Unable to complete Dependency Track policy check',
          details: `Error details: ${stderr}`
        };
    }
  }

  /**
   * Validates Dependency Track policy check configuration
   */
  private validatePolicyConfiguration(): void {
    const MINIMUM_API_KEY_LENGTH = 10;
    const missingParams: string[] = [];
    const invalidParams: string[] = [];

    // Check required parameters from app.input
    if (!inputs.DEPENDENCY_TRACK_URL) {
      missingParams.push('dependencytrack.url');
    } else {
      // Validate URL format
      try {
        const url = new URL(inputs.DEPENDENCY_TRACK_URL);
        if (!['http:', 'https:'].includes(url.protocol)) {
          invalidParams.push('dependencytrack.url (must use http:// or https://)');
        }
      } catch (error) {
        invalidParams.push('dependencytrack.url (invalid URL format)');
      }
    }

    if (!inputs.DEPENDENCY_TRACK_API_KEY) {
      missingParams.push('dependencytrack.apikey');
    } else if (inputs.DEPENDENCY_TRACK_API_KEY.length < MINIMUM_API_KEY_LENGTH) {
      invalidParams.push('dependencytrack.apikey (appears to be too short)');
    }

    // Check project identification
    if (!inputs.DEPENDENCY_TRACK_PROJECT_ID && !inputs.DEPENDENCY_TRACK_UPLOAD_TOKEN) {
      const missingProjectParams: string[] = [];
      if (!inputs.DEPENDENCY_TRACK_PROJECT_NAME && !inputs.DEPENDENCY_TRACK_PROJECT_VERSION) {
        missingProjectParams.push('Either dependencytrack.projectid or BOTH dependencytrack.projectname AND dependencytrack.projectversion');
      }
      else if (!inputs.DEPENDENCY_TRACK_PROJECT_NAME) missingProjectParams.push('dependencytrack.projectname');
      else if (!inputs.DEPENDENCY_TRACK_PROJECT_VERSION) missingProjectParams.push('dependencytrack.projectversion');

      if (missingProjectParams.length > 0) {
        missingParams.push(...missingProjectParams);
      }
    }

    if (missingParams.length > 0) {
      throw new Error(
        `Dependency Track Policy Check Failed: Required parameters are missing.\n` +
        `Missing: ${missingParams.join(', ')}\n` +
        `Please set these parameters in your workflow configuration.`
      );
    }

    if (invalidParams.length > 0) {
      throw new Error(
        `Dependency Track Policy Check Failed: Invalid parameter values.\n` +
        `Invalid: ${invalidParams.join(', ')}\n` +
        `Please check your parameter values and try again.`
      );
    }
  }

  /**
   * Executes the Dependency Track policy check.
   */
  async run(): Promise<void> {
    try {
      core.info(`Checking Dependency Track for Project Violations...`);
      super.initStatus();
      
      // Validate configuration before running
      this.validatePolicyConfiguration();
      
      const args = await this.argumentBuilder.build();
      const options = {
        failOnStdErr: false,
        ignoreReturnCode: true
      };

      const { stdout, stderr, exitCode } = await exec.getExecOutput(EXECUTABLE, args, options);
      let summary = stdout;
      let details = stderr;
    
      if (exitCode === 0) {
        let successMessage = '### :white_check_mark: Policy Pass \n #### No policy violations were found';
        if (!this.uploadAttempted) {
          core.warning('No policy violations found, but SBOM upload to Dependency Track was not attempted - may have missed new issues');
          successMessage += '\n\n:warning: **Warning**: SBOM upload to Dependency Track was not attempted. Results may not reflect latest changes.';
        }
        await this.success(successMessage, undefined);
        return;
      }

      if (exitCode === 1) {
        // Technical error occurred - parse for better error messages
        let errorMessage = 'Unable to complete Dependency Track policy check';
        let errorDetails = `Error details: ${stderr}`;

        if (stderr) {
          const { message, details } = this.parseError(stderr);
          errorMessage = message;
          errorDetails = details;
        }

        core.warning(`Dependency Track policy check encountered an error: ${errorMessage}`);
        const errorSummary = `### :warning: Policy Check Error \n #### ${errorMessage}`;
        await this.technicalError(errorSummary, errorDetails);
        return;
      }

      // exitCode === 2 means policy violations found
      if (!this.uploadAttempted) {
        core.warning('Policy violations found, but SBOM upload to Dependency Track was not attempted - results may be outdated');
        const uploadWarning = '\n\n:warning: **Warning**: SBOM upload to Dependency Track was not attempted. These policy violations may be based on outdated data.\n';
        details = stderr + uploadWarning;
      }
      
      const { id } = await this.uploadArtifact(stdout);
      core.debug(`Dependency Track Artifact ID: ${id}`);
      if (id) {
        details = await this.concatPolicyArtifactURLToPolicyCheck(details || stderr, id);
      }

      if (isOverMaxCharacterLimitAPI(summary)) {
        summary = '';
      }

      return this.reject(summary, details);
    } catch (validationError: any) {
      // Handle validation errors
      core.warning(`Dependency Track policy check configuration error: ${validationError.message}`);
      const errorSummary = '### :warning: Configuration Error \n #### Dependency Track policy check misconfigured';
      await this.technicalError(errorSummary, validationError.message);
    }
  }

  /**
   * Returns the filename for Dependency Track policy check artifact results.
   */
  artifactPolicyFileName(): string {
    return 'dep-track-policy-check-results.md';
  }

  /**
   * Returns the name of the Dependency Track policy.
   */
  getPolicyName(): string {
    return DepTrackPolicyCheck.policyName;
  }
}
