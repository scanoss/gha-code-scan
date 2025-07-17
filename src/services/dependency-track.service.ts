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
import * as fs from 'fs';
import * as path from 'path';
import * as https from 'https';
import * as http from 'http';
import * as inputs from '../app.input';

export interface DependencyTrackOptions {
  enabled: boolean;
  url: string;
  apiKey: string;
  projectId: string | undefined;
  projectName: string | undefined;
  projectVersion: string | undefined;
}

interface DependencyTrackPayload {
  bom: string;
  project?: string;
  projectName?: string;
  projectVersion?: string;
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
  validateConfiguration(): void {
    if (!this.options.enabled) {
      return;
    }

    if (!this.options.projectId && !this.options.projectName && !this.options.projectVersion) {
      throw new Error('Dependency Track is enabled but you must specify a project ID or a project name and version');
    }

    if (this.options.projectName && !this.options.projectVersion) {
      throw new Error('Dependency Track is enabled but you must specify a project version');
    }

    const missingParams: string[] = [];

    if (!this.options.url) missingParams.push('dependencytrack.url');
    if (!this.options.apiKey) missingParams.push('dependencytrack.apikey');

    if (missingParams.length > 0) {
      throw new Error(`Dependency Track is enabled but required parameters are missing: ${missingParams.join(', ')}`);
    }
  }

  /**
   * Converts SCANOSS results to CycloneDX format and uploads to Dependency Track
   */
  async uploadToDependencyTrack(): Promise<boolean> {
    if (!this.options.enabled) {
      core.debug('Dependency Track upload is disabled');
      return false;
    }

    core.info('Starting Dependency Track upload process...');

    const cycloneDxPath = await this.convertToCycloneDx();

    const cycloneDxContent = fs.readFileSync(cycloneDxPath, 'utf8');
    const base64Bom = Buffer.from(cycloneDxContent).toString('base64');

    const success = await this.uploadBom(base64Bom);

    fs.unlinkSync(cycloneDxPath);

    return success;
  }

  /**
   * Converts SCANOSS results to CycloneDX format using scanoss-py
   */
  private async convertToCycloneDx(): Promise<string> {
    const outputPath = path.join(path.dirname(inputs.OUTPUT_FILEPATH), 'cyclonedx.json');

    const args = [
      'run',
      '-v',
      `${inputs.REPO_DIR}:/scanoss`,
      inputs.RUNTIME_CONTAINER,
      'convert',
      '--input',
      `./${inputs.OUTPUT_FILEPATH}`,
      '--format',
      'cyclonedx',
      '--output',
      `./${path.basename(outputPath)}`
    ];

    core.debug(`Converting to CycloneDX: ${inputs.EXECUTABLE} ${args.join(' ')}`);

    const options = {
      failOnStdErr: false,
      ignoreReturnCode: false
    };

    await exec.exec(inputs.EXECUTABLE, args, options);

    core.info('Successfully converted results to CycloneDX format');
    return outputPath;
  }

  /**
   * Uploads the BOM to Dependency Track
   */
  private async uploadBom(base64Bom: string): Promise<boolean> {
    return new Promise((resolve, reject) => {
      const payload: DependencyTrackPayload = {
        bom: base64Bom
      };

      if (this.options.projectId) {
        payload.project = this.options.projectId;
      } else {
        if (!this.options.projectName || !this.options.projectVersion) {
          throw new Error('Dependency Track is enabled but you must specify a project name and version');
        }
        payload.projectName = this.options.projectName;
        payload.projectVersion = this.options.projectVersion;
      }

      const stringifiedPayload = JSON.stringify(payload);

      const url = new URL(this.options.url);
      const bomPath = '/api/v1/bom';

      const options = {
        hostname: url.hostname,
        port: url.port || (url.protocol === 'https:' ? 443 : 80),
        path: bomPath,
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': stringifiedPayload.length,
          'X-Api-Key': this.options.apiKey
        }
      };

      core.debug(`Uploading BOM to: ${url.protocol}//${url.hostname}${bomPath}`);

      const protocol = url.protocol === 'https:' ? https : http;
      const req = protocol.request(options, res => {
        let data = '';

        res.on('data', chunk => {
          data += chunk;
        });

        res.on('end', () => {
          if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
            core.info('Successfully uploaded BOM to Dependency Track');
            resolve(true);
          } else {
            reject(new Error(`Failed to upload BOM: ${res.statusCode} - ${data}`));
          }
        });
      });

      req.on('error', error => {
        reject(new Error(`Failed to upload BOM: ${error.message}`));
      });

      req.write(stringifiedPayload);
      req.end();
    });
  }
}

export const dependencyTrackService = new DependencyTrackService();
