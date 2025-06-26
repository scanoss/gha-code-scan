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

import * as exec from '@actions/exec';
import * as artifact from '@actions/artifact';
import * as inputs from '../app.input';
import { ScannerResults } from './result.interfaces';
import fs from 'fs';
import * as core from '@actions/core';
import {
  EXECUTABLE,
  OUTPUT_FILEPATH,
  SCAN_FILES,
  SCANOSS_SETTINGS,
  SETTINGS_FILE_PATH,
  SKIP_SNIPPETS
} from '../app.input';

const artifactClient = artifact.create();

export async function uploadResults(): Promise<void> {
  try {
    await artifactClient.uploadArtifact('results', [inputs.OUTPUT_FILEPATH], '.');
  } catch (e) {
    core.error(`Unable to upload ${inputs.OUTPUT_FILEPATH}: ${e}`);
  }
}

export interface Options {
  /**
   * Enables scanning for dependencies, utilizing scancode internally. Optional.
   */
  dependenciesEnabled?: boolean;

  /**
   * Gets dependencies with production scopes. optional
   */
  dependencyScope?: string;

  /**
   * List of custom dependency scopes to be included. optional
   */
  dependencyScopeInclude?: string;

  /**
   * List of custom dependency scopes to be excluded. optional
   */
  dependencyScopeExclude?: string;

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

  /**
   * Runtime container to perform scan. Default [ghcr.io/scanoss/scanoss-py:v1.26.3]
   */
  runtimeContainer: string;

  /**
   * Skips snippet generation. Default [false]
   */
  skipSnippets: boolean;

  /**
   * Enables or disables file and snippet scanning. Default [true]
   */
  scanFiles: boolean;

  /**
   * Enables or disables SCANOSS settings. Default [false]
   */
  scanossSettings: boolean;

  /**
   * SCANOSS Settings file path. Default [scanoss.json]
   */
  settingsFilePath: string;


  /**
   * Enable debugging
   */
  debug: boolean;
}

/**
 * @class ScannerService
 * @brief A service class that manages scanning operations using the scanoss-py Docker container
 *
 * @details
 * The ScannerService class provides functionality to scan repositories for:
 * - File scanning
 * - Dependency analysis
 *
 * @property {Options} options - Configuration options for the scanner
 * @property {string} options.apiKey - API key for SCANOSS service authentication
 * @property {string} options.apiUrl - URL endpoint for the SCANOSS service
 * @property {boolean} options.sbomEnabled - Flag to enable SBOM generation
 * @property {string} options.sbomFilepath - Path to store or read SBOM files
 * @property {string} options.sbomType - Type of SBOM format to use
 * @property {boolean} options.dependenciesEnabled - Flag to enable dependency scanning
 * @property {string} options.outputFilepath - Path for scan results output
 * @property {string} options.inputFilepath - Path to the repository to scan
 * @property {string} options.runtimeContainer - Docker container image to use
 * @property {string} options.dependencyScope - Scope for dependency scanning (prod/dev)
 * @property {string} options.dependencyScopeExclude - Dependencies to exclude from scan
 * @property {string} options.dependencyScopeInclude - Dependencies to include in scan
 * @property {boolean} options.skipSnippets - Flag to skip snippet scanning
 * @property {boolean} options.scanFiles - Flag to enable file scanning
 * @property {boolean} options.scanossSettings - Flag to enable SCANOSS Settings
 * @property {boolean} options.settingsFilePath - Path to settings file
 * @property {boolean} options.debug - Enables debugging
 *
 * @throws {Error} When required configuration options are missing or invalid
 *
 * @author [SCANOSS]
 */
export class ScanService {
  private options: Options;
  private DEFAULT_SETTING_FILE_PATH = 'scanoss.json';
  constructor(options?: Options) {
    this.options = options || {
      apiKey: inputs.API_KEY,
      apiUrl: inputs.API_URL,
      dependenciesEnabled: inputs.DEPENDENCIES_ENABLED,
      outputFilepath: inputs.OUTPUT_FILEPATH,
      inputFilepath: inputs.REPO_DIR,
      dependencyScope: inputs.DEPENDENCIES_SCOPE,
      dependencyScopeInclude: inputs.DEPENDENCY_SCOPE_INCLUDE,
      dependencyScopeExclude: inputs.DEPENDENCY_SCOPE_EXCLUDE,
      runtimeContainer: inputs.RUNTIME_CONTAINER,
      skipSnippets: SKIP_SNIPPETS,
      scanFiles: SCAN_FILES,
      scanossSettings: SCANOSS_SETTINGS,
      settingsFilePath: SETTINGS_FILE_PATH,
      debug: inputs.DEBUG
    };
  }

  /**
   * @brief Executes the scanning process using a scanoss-py Docker container
   * @throws {Error} When Docker command fails or configuration is invalid
   * @returns {Promise<ScannerResults>} The results of the scanning operation
   *
   * @details
   * This method performs the following operations:
   * - Validates basic configuration
   * - Executes Docker command
   * - Uploads results to artifacts
   * - Parses and returns results
   *
   * @note At least one scan option (scanFiles or dependenciesEnabled) must be enabled
   */
  async scan(): Promise<{ scan: ScannerResults; stdout: string; stderr: string }> {
    // Check for basic configuration before running the docker container
    this.checkBasicConfig();

    const options = {
      failOnStdErr: false,
      ignoreReturnCode: true
    };

    const args = await this.buildArgs();
    const { stdout, stderr } = await exec.getExecOutput(EXECUTABLE, args, options);

    const scan = await this.parseResult();
    return { scan, stdout, stderr };
  }

  /**
   * @brief Builds the dependency scope command string
   * @returns {Array<string>} The formatted dependency scope command
   *
   * @details
   * Handles three possible scope configurations:
   * - Dependency scope exclude
   * - Dependency scope include
   * - Dependency scope (prod/dev)
   *
   * @throws {Error} When multiple dependency scope filters are set
   *
   * @note Only one dependency scope filter can be set at a time
   */
  private dependencyScopeArgs(): string[] {
    const { dependencyScopeInclude, dependencyScopeExclude, dependencyScope } = this.options;

    // Count the number of non-empty values
    const setScopes = [dependencyScopeInclude, dependencyScopeExclude, dependencyScope].filter(
      scope => scope !== '' && scope !== undefined
    );

    if (setScopes.length > 1) {
      core.error('Only one dependency scope filter can be set');
    }

    if (dependencyScopeExclude && dependencyScopeExclude !== '') return ['--dep-scope-exc', dependencyScopeExclude];

    if (dependencyScopeInclude && dependencyScopeInclude !== '') return ['--dep-scope-inc', dependencyScopeInclude];

    if (dependencyScope && dependencyScope === 'prod') return ['--dep-scope', 'prod'];

    if (dependencyScope && dependencyScope === 'dev') return ['--dep-scope', 'dev'];

    return [];
  }

  /**
   * @brief Generates the snippet-related portion of the Docker command
   * @returns {Array<string>} The snippet command flag (-S) or empty string
   *
   * @details
   * Returns ["-S"] if snippets should be skipped, empty string otherwise
   */
  private buildSnippetArgs(): string[] {
    if (!this.options.skipSnippets) return [];
    return ['-S'];
  }

  /**
   * @brief Constructs the dependencies cmd
   * @returns {Array<string>} The formatted dependencies command
   *
   * @details
   * Combines dependency scanning options with scope commands.
   * Possible return values:
   * - [--dependencies-only, ${scopeCmd}]'
   * - [--dependencies, ${scopeCmd}]
   * - Empty array if no dependencies scanning is needed
   */
  private buildDependenciesArgs(): string[] {
    const dependencyScopeCmd = this.dependencyScopeArgs();
    if (!this.options.scanFiles && this.options.dependenciesEnabled) {
      return ['--dependencies-only', ...dependencyScopeCmd];
    } else if (this.options.dependenciesEnabled) {
      return ['--dependencies', ...dependencyScopeCmd];
    }
    return [];
  }

  /**
   * @brief Assembles the complete Docker command string
   * @returns {Promise<Array<string>>} The complete Docker command
   *
   * @details
   * Combines all command components:
   * - Docker run command with volume mounting
   * - Runtime container specification
   * - Scan command with output file
   * - Dependencies command
   * - SBOM detection
   * - Snippet command
   * - API configuration
   *
   */
  private async buildArgs(): Promise<string[]> {
    return [
      'run',
      '-v',
      `${this.options.inputFilepath}:/scanoss`,
      this.options.runtimeContainer,
      'scan',
      '.',
      '--output',
      `./${OUTPUT_FILEPATH}`,
      ...this.buildDependenciesArgs(),
      ...(await this.detectSBOM()),
      ...this.buildSnippetArgs(),
      ...(this.options.apiUrl ? ['--apiurl', this.options.apiUrl] : []),
      ...(this.options.apiKey ? ['--key', this.options.apiKey.replace(/\n/gm, ' ')] : []),
      ...(this.options.debug ? ['--debug'] : [])
    ];
  }

  /**
   * @brief Validates the basic configuration requirements for scanning
   *
   * @throws {Error} When no scan options are enabled
   *
   * @details
   * This method ensures that at least one of the following scan options is enabled:
   * - scanFiles: For scanning source code files
   * - dependenciesEnabled: For scanning project dependencies
   *
   */
  private checkBasicConfig(): void {
    if (!this.options.scanFiles && !this.options.dependenciesEnabled) {
      core.error(`At least one scan option should be enabled: [scanFiles, dependencyEnabled]`);
    }
    core.info('Basic scan config is valid');
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
  private async detectSBOM(): Promise<string[]> {
    // Overrides sbom file if is set
    if (this.options.scanossSettings) {
      try {
        await fs.promises.access(this.options.settingsFilePath, fs.constants.F_OK);
        return ['--settings', this.options.settingsFilePath];
      } catch (error: any) {
        if (this.options.settingsFilePath === this.DEFAULT_SETTING_FILE_PATH) return [];
        core.warning(`SCANOSS settings file not found at '${this.options.settingsFilePath}'.
        Please provide a valid SCANOSS settings file path.`);
        return [];
      }
    }
    // Force scanoss.py to not load the settings.json file
    return ['-stf'];
  }

  private async parseResult(): Promise<ScannerResults> {
    const content = await fs.promises.readFile(this.options.outputFilepath, 'utf-8');
    return JSON.parse(content) as ScannerResults;
  }
}

export const scanService = new ScanService();
