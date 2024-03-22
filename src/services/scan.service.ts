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

import { DefaultArtifactClient } from '@actions/artifact';
import * as exec from '@actions/exec';
import * as inputs from '../app.input';
import { ScannerResults } from './result.interfaces';
import fs from 'fs';
import * as core from '@actions/core';
import * as path from 'path';

const artifact = new DefaultArtifactClient();

export async function uploadResults(): Promise<void> {
  await artifact.uploadArtifact(
    path.basename(inputs.OUTPUT_FILEPATH),
    [inputs.OUTPUT_FILEPATH],
    path.dirname(inputs.OUTPUT_FILEPATH)
  );
}

export interface Options {
  /**
   * Whether SBOM ingestion is enabled. Optional.
   */
  sbomEnabled?: boolean;

  /**
   * Specifies the SBOM processing type: "identify" or "ignore". Optional.
   */
  sbomType?: string;

  /**
   * Absolute path to the SBOM file. Required if sbomEnabled is set to true.
   */
  sbomFilepath?: string;

  /**
   * Enables scanning for dependencies, utilizing scancode internally. Optional.
   */
  dependenciesEnabled?: boolean;

  /**
   * Credentials for SCANOSS, enabling unlimited scans. Optional.
   */
  apiKey?: string;
  apiUrl?: string;

  /**
   * Absolute path where scan results are saved. Required.
   */
  outputFilepath: string;

  /**
   * Absolute path of the folder or file to scan. Required.
   */
  inputFilepath: string;
}

/**
 * `ScanService` is a class that wraps the `scanoss.py` Docker image, providing a simplified interface
 * for configuring and executing source code scans
 */
export class ScanService {
  private options: Options;
  constructor(options?: Options) {
    this.options = options || {
      sbomFilepath: inputs.SBOM_FILEPATH,
      sbomType: inputs.SBOM_TYPE,
      sbomEnabled: inputs.SBOM_ENABLED,
      apiKey: inputs.API_KEY,
      apiUrl: inputs.API_URL,
      dependenciesEnabled: inputs.DEPENDENCIES_ENABLED,
      outputFilepath: inputs.OUTPUT_FILEPATH,
      inputFilepath: inputs.REPO_DIR
    };
  }
  async scan(): Promise<{ scan: ScannerResults; stdout: string; stderr: string }> {
    const command = await this.buildCommand();
    const { stdout, stderr } = await exec.getExecOutput(command, []);
    const scan = await this.parseResult();
    return { scan, stdout, stderr };
  }

  private async buildCommand(): Promise<string> {
    return `docker run -v "${this.options.inputFilepath}":"/scanoss" ghcr.io/scanoss/scanoss-py:v1.9.0 scan . 
                    --output ${this.options.outputFilepath}  
                    ${this.options.dependenciesEnabled ? `--dependencies` : ''}  
                    ${await this.detectSBOM()} 
                    ${this.options.apiUrl ? `--apiurl ${this.options.apiUrl}` : ''} 
                    ${this.options.apiKey ? `--key ${this.options.apiKey}` : ''}`.replace(/\n/gm, ' ');
  }

  /**
   * Constructs the command segment for SBOM ingestion based on the current configuration. This method checks if SBOM
   * ingestion is enabled and verifies the SBOM file's existence before constructing the command.
   *
   * @example
   * // When SBOM ingestion is enabled with a specified SBOM file and type:
   * // sbomEnabled = true, sbomFilepath = "/src/SBOM.json", sbomType = "identify"
   * // returns "--identify /src/SBOM.json"
   *
   * @returns A command string segment for SBOM ingestion or an empty string if conditions are not met.
   * @private
   */
  private async detectSBOM(): Promise<string> {
    if (!this.options.sbomEnabled || !this.options.sbomFilepath) return '';

    try {
      await fs.promises.access(this.options.sbomFilepath, fs.constants.F_OK);
      return `--${this.options.sbomType} ${this.options.sbomFilepath}`;
    } catch (error) {
      core.warning('SBOM not found');
      return '';
    }
  }

  private async parseResult(): Promise<ScannerResults> {
    const content = await fs.promises.readFile(this.options.outputFilepath, 'utf-8');
    return JSON.parse(content) as ScannerResults;
  }
}

export const scanService = new ScanService();
