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
import * as exec from '@actions/exec';
import { DepTrackPolicyCheck } from '../src/policies/dep-track-policy-check';
import { CONCLUSION } from '../src/policies/policy-check';
import { ExecOutput } from '@actions/exec';
import * as githubService from '../src/services/github.service';
import * as core from '@actions/core';

jest.mock('../src/app.input', () => ({
  ...jest.requireActual('../src/app.input'),
  REPO_DIR: '',
  OUTPUT_FILEPATH: 'results.json',
  DEPENDENCY_TRACK_URL: 'https://dep-track.example.com',
  DEPENDENCY_TRACK_API_KEY: 'test-api-key',
  DEPENDENCY_TRACK_PROJECT_ID: 'test-project-id',
  POLICIES_HALT_ON_FAILURE: true,
  HALT_ON_ERROR: true
}));

// Mock the @actions/github module
jest.mock('@actions/github', () => ({
  context: {
    repo: { owner: 'mock-owner', repo: 'mock-repo' },
    serverUrl: 'github',
    runId: 12345678
  },
  getOctokit: jest.fn().mockReturnValue({
    rest: {
      checks: {
        update: jest.fn().mockResolvedValue({}),
        create: jest.fn().mockReturnValue({
          data: {
            id: 1,
            url: 'https://api.github.com/repos/mock-owner/mock-repo/check-runs/1'
          }
        })
      },
      actions: {
        uploadArtifact: jest.fn().mockResolvedValue({
          data: { id: 123456, url: 'https://api.github.com/artifact/123456' }
        })
      }
    }
  })
}));

const mockGetExecOutput = jest.spyOn(exec, 'getExecOutput');

// Mock core.warning at the module level
jest.mock('@actions/core', () => ({
  ...jest.requireActual('@actions/core'),
  warning: jest.fn()
}));

const mockCoreWarning = core.warning as jest.MockedFunction<typeof core.warning>;

describe('DepTrackPolicyCheck', () => {
  let depTrackPolicyCheck: DepTrackPolicyCheck
  const appInput = jest.requireMock('../src/app.input');
  const TEST_DIR = __dirname;
  const TEST_REPO_DIR = path.join(TEST_DIR, 'data');

  beforeEach(() => {
    appInput.REPO_DIR = TEST_REPO_DIR;
    appInput.OUTPUT_FILEPATH = 'results.json';
    appInput.DEPENDENCY_TRACK_URL = 'https://dep-track.example.com';
    appInput.DEPENDENCY_TRACK_API_KEY = 'test-api-key';
    appInput.DEPENDENCY_TRACK_PROJECT_ID = 'test-project-id';
    appInput.POLICIES_HALT_ON_FAILURE = true;
    mockGetExecOutput.mockRestore();
    mockCoreWarning.mockClear();
    // Clear all mocks before each test
    jest.clearAllMocks();
    depTrackPolicyCheck = new DepTrackPolicyCheck();

    jest.spyOn(DepTrackPolicyCheck.prototype, 'uploadArtifact').mockImplementation(async () => {
      return Promise.resolve({ id: 123456 });
    });
  });
  // Test: Policy pass
  it('should pass the policy check when no violations are found', async () => {
    // Mock inspect dt pv - success
     jest.spyOn(exec, 'getExecOutput').mockResolvedValue(
      new Promise<ExecOutput>(resolve =>{
        resolve({
          stdout: 'No policy violations found',
          stderr: 'no violations found',
          exitCode: 0
        })
        })
    );
    await depTrackPolicyCheck.start(1)
    await depTrackPolicyCheck.run();
    // Expecting success
    expect(depTrackPolicyCheck.conclusion).toBe(CONCLUSION.Success);
  }, 30000);

  // Test: policy fail
  it('should fail the policy check when violations are found', async () => {

    const violationsOutput = `
# Dependency Track Policy Violations

## High Risk Vulnerabilities
- CVE-2023-1234: Critical vulnerability in package xyz
- CVE-2023-5678: High severity issue in component abc

## Policy Violations
- License violation: GPL-3.0 not allowed
- Outdated dependency: package-old v1.0.0
    `;
    // Mock execution with violations (exit code 2 for policy violations)
    jest.spyOn(exec, 'getExecOutput').mockResolvedValue({
      stdout: violationsOutput,
      stderr: 'Policy violations detected',
      exitCode: 2
    });
    await depTrackPolicyCheck.start(1)
    await depTrackPolicyCheck.run();
    expect(depTrackPolicyCheck.conclusion).toBe(CONCLUSION.ActionRequired);

  }, 10000);

  it('should return neutral when policy violations occur and halt on failure is false', async () => {
    appInput.POLICIES_HALT_ON_FAILURE = false;
    const violationsOutput = `## Policy Violations Found
| Component | Version | License | Risk |
|-----------|---------|---------|------|
| example-lib | 1.0.0 | GPL-3.0 | HIGH |`;

    jest.spyOn(exec, 'getExecOutput').mockResolvedValue({
      stdout: violationsOutput,
      stderr: 'Policy violations detected',
      exitCode: 2
    });
    await depTrackPolicyCheck.start(1)
    await depTrackPolicyCheck.run();
    expect(depTrackPolicyCheck.conclusion).toBe(CONCLUSION.Neutral);
  }, 10000);

  // Test: Make sure we're testing the right class
  it('should return correct policy name', () => {
    expect(depTrackPolicyCheck.getPolicyName()).toBe('Dependency Track');
  });

  it('should return correct artifact file name', () => {
    expect(depTrackPolicyCheck.artifactPolicyFileName()).toBe('dep-track-policy-check-results.md');
  });

  it('should handle execution errors gracefully when halt on error is false', async () => {
    appInput.HALT_ON_ERROR = false
    const mockExecOutput = jest.spyOn(exec, 'getExecOutput').mockResolvedValue({
      stdout: '',
      stderr: 'Connection to Dependency Track failed',
      exitCode: 1
    });
    await depTrackPolicyCheck.start(1)
    await depTrackPolicyCheck.run();
    
    expect(depTrackPolicyCheck.conclusion).toBe(CONCLUSION.Neutral);
    expect(mockExecOutput).toHaveBeenCalled();
  }, 10000);

  it('should fail when technical error occurs and halt on error is true', async () => {
    appInput.HALT_ON_ERROR = true
    const mockExecOutput = jest.spyOn(exec, 'getExecOutput').mockResolvedValue({
      stdout: '',
      stderr: 'Connection to Dependency Track failed',
      exitCode: 1
    });
    await depTrackPolicyCheck.start(1)
    await depTrackPolicyCheck.run();
    
    expect(depTrackPolicyCheck.conclusion).toBe(CONCLUSION.Failure);
    expect(mockExecOutput).toHaveBeenCalled();
  }, 10000);

  it('should truncate summary when over character limit', async () => {
    const depTrackPolicyCheck = new DepTrackPolicyCheck();
    
    // Mock isOverMaxCharacterLimitAPI to return true
    const mockIsOverLimit = jest.spyOn(githubService,'isOverMaxCharacterLimitAPI').mockReturnValue(true);
    jest.doMock('../src/services/github.service', () => ({
      isOverMaxCharacterLimitAPI: mockIsOverLimit
    }));

    jest.spyOn(exec, 'getExecOutput').mockResolvedValue({
      stdout: 'Very long summary that exceeds limits',
      stderr: 'Error details',
      exitCode: 2
    });

    await depTrackPolicyCheck.start(1)
    await depTrackPolicyCheck.run();
    
    expect(mockIsOverLimit).toHaveBeenCalledWith('Very long summary that exceeds limits');
    expect(depTrackPolicyCheck.conclusion).toBe(CONCLUSION.ActionRequired);
  }, 10000);

  // Test warning scenarios when upload not attempted
  it('should show warning when no violations found but upload was not attempted', async () => {
    const depTrackPolicyCheck = new DepTrackPolicyCheck();
    depTrackPolicyCheck.setUploadAttempted(false);

    // Mock updateCheck to capture the summary
    let capturedSummary = '';
    jest.spyOn(depTrackPolicyCheck, 'updateCheck' as any).mockImplementation(async (...args: any[]) => {
      capturedSummary = args[0];
    });

    jest.spyOn(exec, 'getExecOutput').mockResolvedValue({
      stdout: 'No policy violations found',
      stderr: 'no violations found',
      exitCode: 0
    });

    await depTrackPolicyCheck.start(1);
    await depTrackPolicyCheck.run();

    expect(mockCoreWarning).toHaveBeenCalledWith('No policy violations found, but SBOM upload to Dependency Track was not attempted - may have missed new issues');
    expect(depTrackPolicyCheck.conclusion).toBe(CONCLUSION.Success);
    expect(capturedSummary).toContain(':warning: **Warning**: SBOM upload to Dependency Track was not attempted');
  }, 10000);

  it('should show warning when violations found but upload was not attempted', async () => {
    const depTrackPolicyCheck = new DepTrackPolicyCheck();
    depTrackPolicyCheck.setUploadAttempted(false);

    // Mock isOverMaxCharacterLimitAPI to return false so details aren't truncated
    jest.spyOn(githubService, 'isOverMaxCharacterLimitAPI').mockReturnValue(false);

    // Mock updateCheck to capture the details
    let capturedDetails = '';
    jest.spyOn(depTrackPolicyCheck, 'updateCheck' as any).mockImplementation(async (...args: any[]) => {
      capturedDetails = args[1] || '';
    });

    const violationsOutput = `# Dependency Track Policy Violations
## High Risk Vulnerabilities
- CVE-2023-1234: Critical vulnerability in package xyz`;

    jest.spyOn(exec, 'getExecOutput').mockResolvedValue({
      stdout: violationsOutput,
      stderr: 'Policy violations detected',
      exitCode: 2
    });

    await depTrackPolicyCheck.start(1);
    await depTrackPolicyCheck.run();

    expect(mockCoreWarning).toHaveBeenCalledWith('Policy violations found, but SBOM upload to Dependency Track was not attempted - results may be outdated');
    expect(depTrackPolicyCheck.conclusion).toBe(CONCLUSION.ActionRequired);
    expect(capturedDetails).toContain(':warning: **Warning**: SBOM upload to Dependency Track was not attempted');
  }, 10000);

  it('should not show warning when upload was attempted successfully', async () => {
    const depTrackPolicyCheck = new DepTrackPolicyCheck();
    depTrackPolicyCheck.setUploadAttempted(true);

    // Mock updateCheck to capture the summary
    let capturedSummary = '';
    jest.spyOn(depTrackPolicyCheck, 'updateCheck' as any).mockImplementation(async (...args: any[]) => {
      capturedSummary = args[0];
    });

    jest.spyOn(exec, 'getExecOutput').mockResolvedValue({
      stdout: 'No policy violations found',
      stderr: 'no violations found',
      exitCode: 0
    });

    await depTrackPolicyCheck.start(1);
    await depTrackPolicyCheck.run();

    expect(mockCoreWarning).not.toHaveBeenCalledWith(expect.stringContaining('upload to Dependency Track was not attempted'));
    expect(depTrackPolicyCheck.conclusion).toBe(CONCLUSION.Success);
    expect(capturedSummary).not.toContain(':warning: **Warning**: SBOM upload to Dependency Track was not attempted');
  }, 10000);

  it('should test setUploadAttempted method', () => {
    const depTrackPolicyCheck = new DepTrackPolicyCheck();
    
    // Default should be true
    expect((depTrackPolicyCheck as any).uploadAttempted).toBe(true);
    
    // Set to false
    depTrackPolicyCheck.setUploadAttempted(false);
    expect((depTrackPolicyCheck as any).uploadAttempted).toBe(false);
    
    // Set back to true
    depTrackPolicyCheck.setUploadAttempted(true);
    expect((depTrackPolicyCheck as any).uploadAttempted).toBe(true);
  });
});