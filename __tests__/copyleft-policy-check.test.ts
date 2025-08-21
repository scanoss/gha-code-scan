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

import path from 'path';
import { CopyleftPolicyCheck } from '../src/policies/copyleft-policy-check';
import { CONCLUSION } from '../src/policies/policy-check';
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
        update: jest.fn().mockResolvedValue({}),
        create: jest.fn().mockReturnValue({
          data: {
            id: 1
          }
        })
      }
    }
  })
}));

describe('CopyleftPolicyCheck', () => {
  const appInput = jest.requireMock('../src/app.input');

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    appInput.COPYLEFT_LICENSE_EXPLICIT = '';
    appInput.COPYLEFT_LICENSE_EXCLUDE = '';
    appInput.COPYLEFT_LICENSE_INCLUDE = '';
  });

  it('Copyleft policy check fail when halt on failure is true', async () => {
    const TEST_DIR = __dirname;
    const TEST_REPO_DIR = path.join(TEST_DIR, 'data');
    const TEST_RESULTS_FILE = 'results.json';

    appInput.REPO_DIR = TEST_REPO_DIR;
    appInput.OUTPUT_FILEPATH = TEST_RESULTS_FILE;
    appInput.POLICIES_HALT_ON_FAILURE = true;

    // Mock exec.getExecOutput to simulate copyleft license violations found
    jest.spyOn(exec, 'getExecOutput').mockResolvedValue({
      stdout:
        '## Copyleft Policy Violations\n\n- GPL-2.0-only license found in crc32c.c\n- GPL-2.0-only license found in json.c',
      stderr: 'Policy violations detected',
      exitCode: 2
    });

    jest.spyOn(CopyleftPolicyCheck.prototype, 'uploadArtifact').mockImplementation(async () => {
      return Promise.resolve({ id: 123456 });
    });
    jest.spyOn(CopyleftPolicyCheck.prototype, 'initStatus').mockImplementation();
    jest.spyOn(CopyleftPolicyCheck.prototype, 'updateCheck').mockImplementation();
    const copyleftPolicyCheck = new CopyleftPolicyCheck();
    await copyleftPolicyCheck.start(1);
    await copyleftPolicyCheck.run();
    expect(copyleftPolicyCheck.conclusion).toEqual(CONCLUSION.ActionRequired);
  }, 10000);

  it('Copyleft policy check neutral when halt on failure is false', async () => {
    const TEST_DIR = __dirname;
    const TEST_REPO_DIR = path.join(TEST_DIR, 'data');
    const TEST_RESULTS_FILE = 'results.json';

    appInput.REPO_DIR = TEST_REPO_DIR;
    appInput.OUTPUT_FILEPATH = TEST_RESULTS_FILE;
    appInput.POLICIES_HALT_ON_FAILURE = false;

    // Mock exec.getExecOutput to simulate copyleft license violations found
    jest.spyOn(exec, 'getExecOutput').mockResolvedValue({
      stdout: '## Copyleft Policy Violations\n\n- GPL-2.0-only license found in crc32c.c',
      stderr: 'Policy violations detected',
      exitCode: 2
    });

    jest.spyOn(CopyleftPolicyCheck.prototype, 'uploadArtifact').mockImplementation(async () => {
      return Promise.resolve({ id: 123456 });
    });
    jest.spyOn(CopyleftPolicyCheck.prototype, 'initStatus').mockImplementation();
    jest.spyOn(CopyleftPolicyCheck.prototype, 'updateCheck').mockImplementation();
    const copyleftPolicyCheck = new CopyleftPolicyCheck();
    await copyleftPolicyCheck.start(1);
    await copyleftPolicyCheck.run();
    expect(copyleftPolicyCheck.conclusion).toEqual(CONCLUSION.Neutral);
  }, 10000);

  it('Copyleft policy empty results', async () => {
    const TEST_DIR = __dirname;
    const TEST_REPO_DIR = path.join(TEST_DIR, 'data');
    const TEST_RESULTS_FILE = 'results.json';

    appInput.REPO_DIR = TEST_REPO_DIR;
    appInput.OUTPUT_FILEPATH = TEST_RESULTS_FILE;
    appInput.COPYLEFT_LICENSE_EXCLUDE = 'GPL-2.0-only';

    // Mock exec.getExecOutput to simulate no copyleft violations (GPL-2.0-only excluded)
    jest.spyOn(exec, 'getExecOutput').mockResolvedValue({
      stdout: 'No copyleft licenses found',
      stderr: '',
      exitCode: 0
    });

    jest.spyOn(CopyleftPolicyCheck.prototype, 'uploadArtifact').mockImplementation(async () => {
      return Promise.resolve({ id: 123456 });
    });
    jest.spyOn(CopyleftPolicyCheck.prototype, 'initStatus').mockImplementation();
    jest.spyOn(CopyleftPolicyCheck.prototype, 'updateCheck').mockImplementation();
    const copyleftPolicyCheck = new CopyleftPolicyCheck();
    await copyleftPolicyCheck.start(1);
    await copyleftPolicyCheck.run();
    expect(copyleftPolicyCheck.conclusion).toEqual(CONCLUSION.Success);
  }, 10000);

  it('Copyleft policy explicit licenses', async () => {
    const TEST_DIR = __dirname;
    const TEST_REPO_DIR = path.join(TEST_DIR, 'data');
    const TEST_RESULTS_FILE = 'results.json';

    appInput.REPO_DIR = TEST_REPO_DIR;
    appInput.OUTPUT_FILEPATH = TEST_RESULTS_FILE;
    appInput.COPYLEFT_LICENSE_EXPLICIT = 'MIT,Apache-2.0';
    appInput.POLICIES_HALT_ON_FAILURE = true;

    // Mock exec.getExecOutput to simulate violations when only MIT/Apache-2.0 are allowed
    jest.spyOn(exec, 'getExecOutput').mockResolvedValue({
      stdout:
        '## License Policy Violations\n\n- GPL-2.0-only license found but not in explicit allow list\n- BSD-2-Clause license found but not in explicit allow list',
      stderr: 'License violations detected - only MIT,Apache-2.0 allowed',
      exitCode: 2
    });

    jest.spyOn(CopyleftPolicyCheck.prototype, 'uploadArtifact').mockImplementation(async () => {
      return Promise.resolve({ id: 123456 });
    });
    jest.spyOn(CopyleftPolicyCheck.prototype, 'initStatus').mockImplementation();
    jest.spyOn(CopyleftPolicyCheck.prototype, 'updateCheck').mockImplementation();
    const copyleftPolicyCheck = new CopyleftPolicyCheck();
    await copyleftPolicyCheck.start(1);
    await copyleftPolicyCheck.run();
    expect(copyleftPolicyCheck.conclusion).toEqual(CONCLUSION.ActionRequired);
  }, 10000);

  it('should handle technical errors gracefully when halt on error is false', async () => {
    const TEST_DIR = __dirname;
    const TEST_REPO_DIR = path.join(TEST_DIR, 'data');
    const TEST_RESULTS_FILE = 'results.json';

    appInput.REPO_DIR = TEST_REPO_DIR;
    appInput.OUTPUT_FILEPATH = TEST_RESULTS_FILE;
    appInput.HALT_ON_ERROR = false;

    const debugSpy = jest.spyOn(core, 'debug').mockImplementation();
    const warningSpy = jest.spyOn(core, 'warning').mockImplementation();

    // Mock exec.getExecOutput to simulate technical error
    jest.spyOn(exec, 'getExecOutput').mockResolvedValue({
      stdout: '',
      stderr: 'Docker connection failed with sensitive API details',
      exitCode: 1
    });

    jest.spyOn(CopyleftPolicyCheck.prototype, 'uploadArtifact').mockImplementation(async () => {
      return Promise.resolve({ id: 123456 });
    });
    jest.spyOn(CopyleftPolicyCheck.prototype, 'initStatus').mockImplementation();
    jest.spyOn(CopyleftPolicyCheck.prototype, 'updateCheck').mockImplementation();
    const copyleftPolicyCheck = new CopyleftPolicyCheck();
    await copyleftPolicyCheck.start(1);
    await copyleftPolicyCheck.run();

    expect(copyleftPolicyCheck.conclusion).toEqual(CONCLUSION.Neutral);
    // Verify error message sanitization
    expect(debugSpy).toHaveBeenCalledWith(
      'Copyleft policy check stderr: Docker connection failed with sensitive API details'
    );
    expect(warningSpy).toHaveBeenCalledWith('Copyleft policy check encountered an error');

    debugSpy.mockRestore();
    warningSpy.mockRestore();
  }, 10000);

  it('should fail when technical error occurs and halt on error is true', async () => {
    const TEST_DIR = __dirname;
    const TEST_REPO_DIR = path.join(TEST_DIR, 'data');
    const TEST_RESULTS_FILE = 'results.json';

    appInput.REPO_DIR = TEST_REPO_DIR;
    appInput.OUTPUT_FILEPATH = TEST_RESULTS_FILE;
    appInput.HALT_ON_ERROR = true;

    // Mock exec.getExecOutput to simulate technical error
    jest.spyOn(exec, 'getExecOutput').mockResolvedValue({
      stdout: '',
      stderr: 'Docker connection failed',
      exitCode: 1
    });

    jest.spyOn(CopyleftPolicyCheck.prototype, 'uploadArtifact').mockImplementation(async () => {
      return Promise.resolve({ id: 123456 });
    });
    jest.spyOn(CopyleftPolicyCheck.prototype, 'initStatus').mockImplementation();
    jest.spyOn(CopyleftPolicyCheck.prototype, 'updateCheck').mockImplementation();
    const copyleftPolicyCheck = new CopyleftPolicyCheck();
    await copyleftPolicyCheck.start(1);
    await copyleftPolicyCheck.run();
    expect(copyleftPolicyCheck.conclusion).toEqual(CONCLUSION.Failure);
  }, 10000);
});
