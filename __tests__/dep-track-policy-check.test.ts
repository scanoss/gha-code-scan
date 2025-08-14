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
    expect(depTrackPolicyCheck.getPolicyName()).toBe('Dependency Track Policy');
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
});