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
import fs from 'fs';
import { CYCLONEDX_FILE_NAME } from '../app.output';
import { DEPENDENCY_TRACK_UPLOAD_TOKEN, setDependencyTrackUploadToken } from '../app.input';

export interface DependencyTrackOptions {
  enabled: boolean;
  url: string;
  apiKey: string;
  projectId: string | undefined;
  projectName: string | undefined;
  projectVersion: string | undefined;
}

export class DependencyTrackService {
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

    // Check required parameters
    if (!this.options.url) missingParams.push('dependencytrack.url');
    if (!this.options.apiKey) missingParams.push('dependencytrack.apikey');

    if (missingParams.length > 0) {
      throw new Error(`Dependency Track is enabled but required parameters are missing: ${missingParams.join(', ')}`);
    }

    // Check project identification - must have either projectId OR (projectName + projectVersion)
    if (!this.options.projectId) {
      const missingProjectParams: string[] = [];

      if (!this.options.projectName) missingProjectParams.push('dependencytrack.projectName');
      if (!this.options.projectVersion) missingProjectParams.push('dependencytrack.projectVersion');

      if (missingProjectParams.length > 0) {
        throw new Error(
          `Dependency Track is enabled but project identification is incomplete. ` +
            `Either provide 'dependencytrack.projectId' OR both 'dependencytrack.projectName' and 'dependencytrack.projectVersion'. ` +
            `Missing: ${missingProjectParams.join(', ')}`
        );
      }
    }
  }

  /**
   * Converts SCANOSS results to CycloneDX format and uploads to Dependency Track
   */
  async uploadToDependencyTrack(): Promise<void> {
    try {
      if (!this.options.enabled) {
        core.debug('Dependency Track upload is disabled');
        return;
      }
      this.validateConfiguration();

      // Check if CycloneDX file exists
      await fs.promises.readFile(CYCLONEDX_FILE_NAME, 'utf8');

      core.info('Starting Dependency Track upload process...');
      await this.uploadCycloneDXToDependencyTrack();
    } catch (e: any) {
      core.error(e.message);
    }
  }

  /**
   * Build scanoss-py dependency track upload parameters */
  private buildDependencyTrackUploadParameters(): string[] {
    const args = [
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
    return args;
  }

  /**
   * Upload CycloneDX file to Dependency Track using scanoss-py
   */
  private async uploadCycloneDXToDependencyTrack(): Promise<Error | undefined> {
    const options = {
      failOnStdErr: false,
      ignoreReturnCode: false
    };

    const { stderr, stdout } = await exec.getExecOutput(
      inputs.EXECUTABLE,
      this.buildDependencyTrackUploadParameters(),
      options
    );
    if (stderr) {
      return new Error(`Error uploading CycloneDX to Dependency Track: ${stderr}`);
    }
    const response = JSON.parse(stdout);
    setDependencyTrackUploadToken(response.token);
    core.info('CycloneDX successfully uploaded to Dependency Track');
  }
}

export const dependencyTrackService = new DependencyTrackService();
