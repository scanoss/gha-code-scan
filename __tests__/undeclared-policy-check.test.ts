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

jest.mock('../src/app.input', () => ({
  ...jest.requireActual('../src/app.input'),
  REPO_DIR: '',
  OUTPUT_FILEPATH: 'results.json',
  COPYLEFT_LICENSE_EXCLUDE: '',
  COPYLEFT_LICENSE_EXPLICIT: '',
  COPYLEFT_LICENSE_INCLUDE: ''
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

    await undeclaredPolicyCheck.run();
    expect(undeclaredPolicyCheck.conclusion).toEqual(CONCLUSION.Success);
  }, 30000);

  it('should fail the policy check when undeclared components are found', async () => {
    const TEST_DIR = __dirname;
    const TEST_REPO_DIR = path.join(TEST_DIR, 'data');
    const TEST_RESULTS_FILE = 'results.json';

    // Set the required environment variables
    appInput.REPO_DIR = TEST_REPO_DIR;
    appInput.OUTPUT_FILEPATH = TEST_RESULTS_FILE;

    await undeclaredPolicyCheck.run();
    expect(undeclaredPolicyCheck.conclusion).toEqual(CONCLUSION.Neutral);
  }, 30000);
});
