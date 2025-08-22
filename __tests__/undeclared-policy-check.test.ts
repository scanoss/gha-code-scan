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

import { CONCLUSION, PolicyCheck } from '../src/policies/policy-check';
import { UndeclaredPolicyCheck } from '../src/policies/undeclared-policy-check';
import path from 'path';
import * as exec from '@actions/exec';
import * as core from '@actions/core';

jest.mock('../src/app.input', () => ({
  ...jest.requireActual('../src/app.input'),
  REPO_DIR: '',
  OUTPUT_FILEPATH: 'results.json',
  COPYLEFT_LICENSE_EXCLUDE: '',
  COPYLEFT_LICENSE_EXPLICIT: '',
  COPYLEFT_LICENSE_INCLUDE: '',
  POLICIES_HALT_ON_FAILURE: true,
  HALT_ON_ERROR: true
}));

// Mock the @actions/github module
jest.mock('@actions/github', () => ({
  context: {
    repo: { owner: 'mock-owner', repo: 'mock-repo' },
    serverUrl: 'github',
    runId: 12345678
    // Add other properties as needed
  },
  getOctokit: jest.fn().mockReturnValue({
    rest: {
      checks: {
        update: jest.fn().mockResolvedValue({})
      }
    }
  })
}));

describe('UndeclaredPolicyCheck', () => {
  let undeclaredPolicyCheck: UndeclaredPolicyCheck;
  const appInput = jest.requireMock('../src/app.input');

  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(UndeclaredPolicyCheck.prototype, 'uploadArtifact').mockImplementation(async () => {
      return Promise.resolve({ id: 123456 });
    });
    jest.spyOn(PolicyCheck.prototype, 'initStatus').mockImplementation();
    jest.spyOn(UndeclaredPolicyCheck.prototype, 'updateCheck').mockImplementation();

    undeclaredPolicyCheck = new UndeclaredPolicyCheck();
  }, 30000);

  it('should pass the policy check when undeclared components are not found', async () => {
    const TEST_DIR = __dirname;
    const TEST_REPO_DIR = path.join(TEST_DIR, 'data');
    const TEST_RESULTS_FILE = 'empty-results.json';

    // Set the required environment variables
    appInput.REPO_DIR = TEST_REPO_DIR;
    appInput.OUTPUT_FILEPATH = TEST_RESULTS_FILE;

    // Mock exec.getExecOutput to simulate no undeclared components found
    jest.spyOn(exec, 'getExecOutput').mockResolvedValue({
      stdout: 'No undeclared components found',
      stderr: '',
      exitCode: 0
    });

    await undeclaredPolicyCheck.run();
    expect(undeclaredPolicyCheck.conclusion).toEqual(CONCLUSION.Success);
  }, 10000);

  it('should fail the policy check when undeclared components are found', async () => {
    const TEST_DIR = __dirname;
    const TEST_REPO_DIR = path.join(TEST_DIR, 'data');
    const TEST_RESULTS_FILE = 'results.json';

    // Set the required environment variables
    appInput.REPO_DIR = TEST_REPO_DIR;
    appInput.OUTPUT_FILEPATH = TEST_RESULTS_FILE;

    // Mock exec.getExecOutput to simulate undeclared components found
    jest.spyOn(exec, 'getExecOutput').mockResolvedValue({
      stdout:
        '## Undeclared Components Found\n\n- wfp@6afc1f6 found in crc32c.c but not declared in SBOM\n- scanner.c@1.3.3 found in json.c but not declared in SBOM',
      stderr: 'Undeclared components detected in scan results',
      exitCode: 2
    });

    await undeclaredPolicyCheck.run();
    expect(undeclaredPolicyCheck.conclusion).toEqual(CONCLUSION.ActionRequired);
  }, 10000);

  it('should return neutral when undeclared components found and halt on failure is false', async () => {
    const TEST_DIR = __dirname;
    const TEST_REPO_DIR = path.join(TEST_DIR, 'data');
    const TEST_RESULTS_FILE = 'results.json';

    // Set the required environment variables
    appInput.REPO_DIR = TEST_REPO_DIR;
    appInput.OUTPUT_FILEPATH = TEST_RESULTS_FILE;
    appInput.POLICIES_HALT_ON_FAILURE = false;

    // Mock exec.getExecOutput to simulate undeclared components found
    jest.spyOn(exec, 'getExecOutput').mockResolvedValue({
      stdout: '## Undeclared Components Found\n\n- component@1.0.0 found in file.c',
      stderr: 'Undeclared components detected',
      exitCode: 2
    });

    await undeclaredPolicyCheck.run();
    expect(undeclaredPolicyCheck.conclusion).toEqual(CONCLUSION.Neutral);
  }, 10000);

  it('should handle technical errors gracefully when halt on error is false', async () => {
    const TEST_DIR = __dirname;
    const TEST_REPO_DIR = path.join(TEST_DIR, 'data');
    const TEST_RESULTS_FILE = 'results.json';

    // Set the required environment variables
    appInput.REPO_DIR = TEST_REPO_DIR;
    appInput.OUTPUT_FILEPATH = TEST_RESULTS_FILE;
    appInput.HALT_ON_ERROR = false;

    const debugSpy = jest.spyOn(core, 'debug').mockImplementation();
    const warningSpy = jest.spyOn(core, 'warning').mockImplementation();

    // Mock exec.getExecOutput to simulate technical error
    jest.spyOn(exec, 'getExecOutput').mockResolvedValue({
      stdout: '',
      stderr: 'Docker connection failed with sensitive details',
      exitCode: 1
    });

    await undeclaredPolicyCheck.run();

    expect(undeclaredPolicyCheck.conclusion).toEqual(CONCLUSION.Neutral);
    // Verify error message sanitization
    expect(debugSpy).toHaveBeenCalledWith(
      'Undeclared policy check stderr: Docker connection failed with sensitive details'
    );
    expect(warningSpy).toHaveBeenCalledWith('Undeclared policy check encountered an error');

    debugSpy.mockRestore();
    warningSpy.mockRestore();
  }, 10000);

  it('should fail when technical error occurs and halt on error is true', async () => {
    const TEST_DIR = __dirname;
    const TEST_REPO_DIR = path.join(TEST_DIR, 'data');
    const TEST_RESULTS_FILE = 'results.json';

    // Set the required environment variables
    appInput.REPO_DIR = TEST_REPO_DIR;
    appInput.OUTPUT_FILEPATH = TEST_RESULTS_FILE;
    appInput.HALT_ON_ERROR = true;

    // Mock exec.getExecOutput to simulate technical error
    jest.spyOn(exec, 'getExecOutput').mockResolvedValue({
      stdout: '',
      stderr: 'Docker connection failed',
      exitCode: 1
    });

    await undeclaredPolicyCheck.run();
    expect(undeclaredPolicyCheck.conclusion).toEqual(CONCLUSION.Failure);
  }, 10000);
});
