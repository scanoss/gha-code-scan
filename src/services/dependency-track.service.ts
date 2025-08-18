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
import * as exec from '@actions/exec';
import * as inputs from '../app.input';
import { setDependencyTrackProjectId, setDependencyTrackUploadToken } from '../app.input';
import fs from 'fs';
import { CYCLONEDX_FILE_NAME } from '../app.output';

export interface DependencyTrackOptions {
  enabled: boolean;
  url: string;
  apiKey: string;
  projectId: string | undefined;
  projectName: string | undefined;
  projectVersion: string | undefined;
}

/**
 * Service for integrating with Dependency Track for vulnerability and policy management.
 * Handles SBOM upload and project management within Dependency Track instances.
 */
export class DependencyTrackService {
  private readonly MINIMUM_APIKEY_LENGTH = 10
  private options: DependencyTrackOptions;

  constructor(options?: DependencyTrackOptions) {
    this.options = options || {
      enabled: inputs.DEPENDENCY_TRACK_ENABLED,
      url: inputs.DEPENDENCY_TRACK_URL,
      apiKey: inputs.DEPENDENCY_TRACK_API_KEY,
      projectId: inputs.DEPENDENCY_TRACK_PROJECT_ID,
      projectName: inputs.DEPENDENCY_TRACK_PROJECT_NAME,
      projectVersion: inputs.DEPENDENCY_TRACK_PROJECT_VERSION
    };
  }

  /**
   * Validates that all required Dependency Track parameters are provided
   */
  private validateConfiguration(): void {
    const missingParams: string[] = [];
    const invalidParams: string[] = [];

    // Check required parameters
    if (!this.options.url) {
      missingParams.push('dependencytrack.url');
    } else {
      // Validate URL format
      try {
        const url = new URL(this.options.url);
        if (!['http:', 'https:'].includes(url.protocol)) {
          invalidParams.push('dependencytrack.url (must use http:// or https://)');
        }
      } catch (error) {
        invalidParams.push('dependencytrack.url (invalid URL format)');
      }
    }

    if (!this.options.apiKey) {
      missingParams.push('dependencytrack.apikey');
    } else if (this.options.apiKey.length < this.MINIMUM_APIKEY_LENGTH) {
      // Basic API key validation - Dependency Track API keys are typically longer
      invalidParams.push('dependencytrack.apikey (appears to be too short)');
    }

    if (missingParams.length > 0) {
      throw new Error(
        `Dependency Track Upload Failed: Required parameters are missing.\n` +
        `Missing: ${missingParams.join(', ')}\n` +
        `Please set these parameters in your workflow configuration.`
      );
    }

    if (invalidParams.length > 0) {
      throw new Error(
        `Dependency Track Upload Failed: Invalid parameter values.\n` +
        `Invalid: ${invalidParams.join(', ')}\n` +
        `Please check your parameter values and try again.`
      );
    }

    // Check project identification - must have either projectId OR (projectName + projectVersion)
    if (!this.options.projectId) {
      const missingProjectParams: string[] = [];

      if (!this.options.projectName) missingProjectParams.push('dependencytrack.projectname');
      if (!this.options.projectVersion) missingProjectParams.push('dependencytrack.projectversion');

      if (missingProjectParams.length > 0) {
        throw new Error(
          `Dependency Track Upload Failed: Project identification is incomplete.\n` +
          `You must provide EITHER:\n` +
          `  • dependencytrack.projectid (for existing projects), OR\n` +
          `  • Both dependencytrack.projectname AND dependencytrack.projectversion (to create/find projects)\n\n` +
          `Missing: ${missingProjectParams.join(', ')}`
        );
      }
    }
  }

  /**
   * Converts SCANOSS results to CycloneDX format and uploads to Dependency Track
   */
  async uploadToDependencyTrack(): Promise<boolean> {
    try {
      if (!this.options.enabled) {
        core.debug('Dependency Track upload is disabled');
        return false;
      }
      this.validateConfiguration();

      // Check if CycloneDX file exists, create minimal one if missing
      try {
        await fs.promises.access(CYCLONEDX_FILE_NAME, fs.constants.F_OK);
      } catch (error) {
        core.info('No CycloneDX file found - generating minimal SBOM for empty repository');
        await this.generateMinimalCycloneDX();
      }

      // Check if CycloneDX file has meaningful content, enhance if empty
      const cycloneDxContent = await fs.promises.readFile(CYCLONEDX_FILE_NAME, 'utf-8');
      if (!cycloneDxContent.trim()) {
        core.info('CycloneDX file is empty - generating minimal SBOM for empty repository');
        await this.generateMinimalCycloneDX();
      } else {
        // Check if it has components, if not enhance it
        try {
          const cycloneDxData = JSON.parse(cycloneDxContent);
          if (!cycloneDxData.components || cycloneDxData.components.length === 0) {
            core.info('CycloneDX file contains no components - ensuring minimal valid SBOM structure');
            await this.generateMinimalCycloneDX();
          }
        } catch (parseError) {
          core.warning('CycloneDX file appears to be invalid JSON - regenerating minimal SBOM');
          await this.generateMinimalCycloneDX();
        }
      }

      core.info('Starting Dependency Track upload process...');
      const uploadError = await this.uploadCycloneDXToDependencyTrack();
      if (uploadError) {
        core.error(uploadError.message);
        return false;
      }
      return true;
    } catch (e: any) {
      core.error(e.message);
      return false;
    }
  }

  /**
   * Generate a minimal valid CycloneDX SBOM for empty repositories
   */
  private async generateMinimalCycloneDX(): Promise<void> {
    const minimalSbom = {
      bomFormat: "CycloneDX",
      specVersion: "1.4",
      serialNumber: `urn:uuid:${this.generateUUID()}`,
      version: 1,
      metadata: {
        timestamp: new Date().toISOString(),
        tools: [
          {
            vendor: "SCANOSS",
            name: "scanoss-py",
            version: "latest"
          }
        ],
        component: {
          type: "application",
          "bom-ref": this.generateUUID(),
          name: this.options.projectName || "unknown-project",
          version: this.options.projectVersion || "1.0.0"
        }
      },
      components: [],
      dependencies: [],
      vulnerabilities: []
    };

    await fs.promises.writeFile(CYCLONEDX_FILE_NAME, JSON.stringify(minimalSbom, null, 2), 'utf-8');
    core.debug(`Generated minimal CycloneDX SBOM: ${JSON.stringify(minimalSbom, null, 2)}`);
  }

  /**
   * Generate a simple UUID v4
   */
  private generateUUID(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }

  /**
   * Parse upload error and return appropriate error message
   */
  private parseUploadError(stderr: string): string {
    const lowerStderr = stderr.toLowerCase();
    
    // Determine error type based on stderr content
    const getErrorType = (): string => {
      if (lowerStderr.includes('connection refused') || lowerStderr.includes('no route to host')) {
        return 'CONNECTION_ERROR';
      }
      if (lowerStderr.includes('401') || lowerStderr.includes('unauthorized') || lowerStderr.includes('invalid api key')) {
        return 'AUTH_ERROR';
      }
      if (lowerStderr.includes('404') || lowerStderr.includes('not found')) {
        return 'NOT_FOUND_ERROR';
      }
      if (lowerStderr.includes('timeout') || lowerStderr.includes('timed out')) {
        return 'TIMEOUT_ERROR';
      }
      if (lowerStderr.includes('ssl') || lowerStderr.includes('certificate') || lowerStderr.includes('tls')) {
        return 'SSL_ERROR';
      }
      if (lowerStderr.includes('project') && lowerStderr.includes('not found')) {
        return 'PROJECT_NOT_FOUND';
      }
      if (lowerStderr.includes('forbidden') || lowerStderr.includes('403')) {
        return 'FORBIDDEN_ERROR';
      }
      return 'GENERIC_ERROR';
    };

    switch (getErrorType()) {
      case 'CONNECTION_ERROR':
        return `Cannot connect to Dependency Track server.\n` +
          `• URL: ${this.options.url}\n` +
          `• Issue: Server is not reachable\n` +
          `• Solutions: Verify the URL, check network connectivity, ensure server is running`;
          
      case 'AUTH_ERROR':
        return `Authentication failed with Dependency Track server.\n` +
          `• URL: ${this.options.url}\n` +
          `• Issue: Invalid or missing API key\n` +
          `• Solutions: Verify your API key, check user permissions in Dependency Track`;
          
      case 'NOT_FOUND_ERROR':
        return `Dependency Track server endpoint not found.\n` +
          `• URL: ${this.options.url}\n` +
          `• Issue: Server endpoint does not exist\n` +
          `• Solutions: Verify the URL is correct, check if Dependency Track is properly deployed`;
          
      case 'TIMEOUT_ERROR':
        return `Connection to Dependency Track server timed out.\n` +
          `• URL: ${this.options.url}\n` +
          `• Issue: Server is too slow to respond\n` +
          `• Solutions: Check network connectivity, verify server performance, try again later`;
          
      case 'SSL_ERROR':
        return `SSL/TLS connection error with Dependency Track server.\n` +
          `• URL: ${this.options.url}\n` +
          `• Issue: SSL certificate validation failed\n` +
          `• Solutions: Check SSL certificate validity, ensure proper HTTPS configuration`;
          
      case 'PROJECT_NOT_FOUND':
        return `Project not found in Dependency Track.\n` +
          `• Project ID: ${this.options.projectId || 'Not specified'}\n` +
          `• Project Name: ${this.options.projectName || 'Not specified'}\n` +
          `• Solutions: Verify project exists, check project ID/name, create project first`;
          
      case 'FORBIDDEN_ERROR':
        return `Access forbidden to Dependency Track resource.\n` +
          `• URL: ${this.options.url}\n` +
          `• Issue: Insufficient permissions\n` +
          `• Solutions: Check API key permissions, verify user role in Dependency Track`;
          
      default:
        return `Dependency Track upload failed with error:\n${stderr}\n\n` +
          `Troubleshooting:\n` +
          `• Verify URL: ${this.options.url}\n` +
          `• Check API key validity\n` +
          `• Ensure project exists in Dependency Track`;
    }
  }

  /**
   * Build scanoss-py dependency track upload parameters
   */
  private buildDependencyTrackUploadParameters(): string[] {
    return [
      'run',
      '-v',
      `${inputs.REPO_DIR}:/scanoss`,
      inputs.RUNTIME_CONTAINER,
      'export',
      'dependency-track',
      '--input',
      `./${CYCLONEDX_FILE_NAME}`,
      ...(this.options.apiKey ? ['--apikey', this.options.apiKey] : []),
      ...(this.options.url ? ['--url', this.options.url] : []),
      ...(this.options.projectId ? ['--project-id', this.options.projectId] : []),
      ...(this.options.projectName ? ['--project-name', this.options.projectName] : []),
      ...(this.options.projectVersion ? ['--project-version', this.options.projectVersion] : [])
    ];
  }

  /**
   * Upload CycloneDX file to Dependency Track using scanoss-py
   */
  private async uploadCycloneDXToDependencyTrack(): Promise<Error | undefined> {
    const options = {
      failOnStdErr: false,
      ignoreReturnCode: true
    };

    const { stderr, stdout, exitCode } = await exec.getExecOutput(
      inputs.EXECUTABLE,
      this.buildDependencyTrackUploadParameters(),
      options
    );
    
    if (exitCode !== 0) {
      let errorMessage;
      
      if (stderr) {
        errorMessage = this.parseUploadError(stderr);
      } else {
        errorMessage = `Dependency Track upload failed (exit code ${exitCode}).\n` +
          `• URL: ${this.options.url}\n` +
          `• Check server connectivity and configuration`;
      }
      
      return new Error(errorMessage);
    }
    
    if (stderr) {
      // Log stderr for debugging but don't treat as error if exitCode is 0
      core.debug(`Dependency Track upload stderr: ${stderr}`);
      
      // Filter out harmless informational messages
      const trimmedStderr = stderr.trim();
      const isHarmlessInfo = trimmedStderr.startsWith('Reading SBOM file:') ||
                            trimmedStderr.includes('Reading SBOM file:') ||
                            trimmedStderr.match(/^Reading .+ file:/);
      
      if (!isHarmlessInfo) {
        core.warning('Dependency Track upload completed with warnings. Check debug logs for details.');
      }
    }
    const response = JSON.parse(stdout);
    setDependencyTrackUploadToken(response.token);
    setDependencyTrackProjectId(response.project_uuid);
    core.info('CycloneDX successfully uploaded to Dependency Track');
  }
}

export const dependencyTrackService = new DependencyTrackService();
