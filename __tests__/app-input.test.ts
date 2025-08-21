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

// Mock core module before any imports

const mockWarning = jest.fn();
const mockGetInput = jest.fn();

jest.mock('@actions/core', () => ({
  getInput: mockGetInput,
  warning: mockWarning,
  debug: jest.fn(),
  info: jest.fn(),
  error: jest.fn()
}));

describe('Filename Validation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Clear module cache to get fresh validation on each test
    jest.resetModules();
  });

  it('should return default filename when input is undefined', () => {
    mockGetInput.mockReturnValue('');
    const { OUTPUT_FILEPATH } = require('../src/app.input');
    expect(OUTPUT_FILEPATH).toBe('results.json');
  });

  it('should allow valid filenames', () => {
    mockGetInput.mockReturnValue('scan-results.json');
    const { OUTPUT_FILEPATH } = require('../src/app.input');
    expect(OUTPUT_FILEPATH).toBe('scan-results.json');
  });

  it('should reject directory traversal attempts', () => {
    mockGetInput.mockReturnValue('../../../etc/passwd');
    const { OUTPUT_FILEPATH } = require('../src/app.input');
    expect(OUTPUT_FILEPATH).toBe('results.json');
    expect(mockWarning).toHaveBeenCalledWith(
      'Invalid filename detected: ../../../etc/passwd. Using default: results.json'
    );
  });

  it('should reject absolute paths', () => {
    mockGetInput.mockReturnValue('/tmp/malicious.json');
    const { OUTPUT_FILEPATH } = require('../src/app.input');
    expect(OUTPUT_FILEPATH).toBe('results.json');
    expect(mockWarning).toHaveBeenCalledWith(
      'Invalid filename detected: /tmp/malicious.json. Using default: results.json'
    );
  });

  it('should reject filenames with invalid characters', () => {
    mockGetInput.mockReturnValue('file<>|with|bad|chars.json');
    const { OUTPUT_FILEPATH } = require('../src/app.input');
    expect(OUTPUT_FILEPATH).toBe('results.json');
    expect(mockWarning).toHaveBeenCalledWith(
      'Unsafe filename detected: file<>|with|bad|chars.json. Using default: results.json'
    );
  });

  it('should add .json extension if missing', () => {
    mockGetInput.mockReturnValue('results');
    const { OUTPUT_FILEPATH } = require('../src/app.input');
    expect(OUTPUT_FILEPATH).toBe('results.json');
  });

  it('should extract basename from paths', () => {
    mockGetInput.mockReturnValue('subfolder/results.json');
    const { OUTPUT_FILEPATH } = require('../src/app.input');
    expect(OUTPUT_FILEPATH).toBe('results.json');
  });

  it('should allow common safe characters', () => {
    mockGetInput.mockReturnValue('test_results-v1.2.json');
    const { OUTPUT_FILEPATH } = require('../src/app.input');
    expect(OUTPUT_FILEPATH).toBe('test_results-v1.2.json');
  });
});
