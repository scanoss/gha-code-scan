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

import { RAW_RESULT_FILE_NAME } from '../src/app.output';

describe('Filename Validation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Clear module cache to get fresh validation on each test
    jest.resetModules();
  });

  it('should return default filename when input is undefined', () => {
    mockGetInput.mockReturnValue('');
    const { OUTPUT_FILEPATH } = require('../src/app.input');
    expect(OUTPUT_FILEPATH).toBe(RAW_RESULT_FILE_NAME);
  });

  it('should allow valid filenames', () => {
    mockGetInput.mockReturnValue('scan-results.json');
    const { OUTPUT_FILEPATH } = require('../src/app.input');
    expect(OUTPUT_FILEPATH).toBe('scan-results.json');
  });

  it('should reject directory traversal attempts', () => {
    mockGetInput.mockReturnValue('../../../etc/passwd');
    const { OUTPUT_FILEPATH } = require('../src/app.input');
    expect(OUTPUT_FILEPATH).toBe(RAW_RESULT_FILE_NAME);
    expect(mockWarning).toHaveBeenCalledWith(
      `Invalid filename detected: ../../../etc/passwd. Using default: ${RAW_RESULT_FILE_NAME}`
    );
  });

  it('should reject absolute paths', () => {
    mockGetInput.mockReturnValue('/tmp/malicious.json');
    const { OUTPUT_FILEPATH } = require('../src/app.input');
    expect(OUTPUT_FILEPATH).toBe(RAW_RESULT_FILE_NAME);
    expect(mockWarning).toHaveBeenCalledWith(
      `Invalid filename detected: /tmp/malicious.json. Using default: ${RAW_RESULT_FILE_NAME}`
    );
  });

  it('should reject filenames with invalid characters', () => {
    mockGetInput.mockReturnValue('file<>|with|bad|chars.json');
    const { OUTPUT_FILEPATH } = require('../src/app.input');
    expect(OUTPUT_FILEPATH).toBe(RAW_RESULT_FILE_NAME);
    expect(mockWarning).toHaveBeenCalledWith(
      `Unsafe filename detected: file<>|with|bad|chars.json. Using default: ${RAW_RESULT_FILE_NAME}`
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

describe('Scan Path Validation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.resetModules();
  });

  describe('valid scan paths', () => {
    it('should return "." when input is undefined', () => {
      mockGetInput.mockReturnValue('');
      const { SCAN_PATH } = require('../src/app.input');
      expect(SCAN_PATH).toBe('.');
    });

    it('should allow single-level relative paths', () => {
      mockGetInput.mockReturnValue('src');
      const { SCAN_PATH } = require('../src/app.input');
      expect(SCAN_PATH).toBe('src');
    });

    it('should allow nested relative paths', () => {
      mockGetInput.mockReturnValue('packages/api/lib');
      const { SCAN_PATH } = require('../src/app.input');
      expect(SCAN_PATH).toBe('packages/api/lib');
    });

    it('should allow paths with hyphens and underscores', () => {
      mockGetInput.mockReturnValue('src-v2/api_server');
      const { SCAN_PATH } = require('../src/app.input');
      expect(SCAN_PATH).toBe('src-v2/api_server');
    });

    it('should allow paths with dots', () => {
      mockGetInput.mockReturnValue('packages.new/service');
      const { SCAN_PATH } = require('../src/app.input');
      expect(SCAN_PATH).toBe('packages.new/service');
    });

    it('should strip leading "./" for consistency', () => {
      mockGetInput.mockReturnValue('./src/api');
      const { SCAN_PATH } = require('../src/app.input');
      expect(SCAN_PATH).toBe('src/api');
    });
  });

  describe('invalid scan paths', () => {
    it('should reject absolute paths and return default', () => {
      mockGetInput.mockReturnValue('/etc/passwd');
      const { SCAN_PATH } = require('../src/app.input');
      expect(SCAN_PATH).toBe('.');
      expect(mockWarning).toHaveBeenCalledWith('Absolute scan paths not allowed: /etc/passwd. Using default: .');
    });

    it('should reject Windows-style absolute paths', () => {
      mockGetInput.mockReturnValue('C:\\Windows\\System32');
      const { SCAN_PATH } = require('../src/app.input');
      expect(SCAN_PATH).toBe('.');
      expect(mockWarning).toHaveBeenCalledWith(
        'Absolute scan paths not allowed: C:\\Windows\\System32. Using default: .'
      );
    });

    it('should reject parent directory references', () => {
      mockGetInput.mockReturnValue('../../../etc');
      const { SCAN_PATH } = require('../src/app.input');
      expect(SCAN_PATH).toBe('.');
      expect(mockWarning).toHaveBeenCalledWith('Invalid scan path detected: ../../../etc. Using default: .');
    });

    it('should reject paths with parent references in the middle', () => {
      mockGetInput.mockReturnValue('src/../../etc');
      const { SCAN_PATH } = require('../src/app.input');
      expect(SCAN_PATH).toBe('.');
      expect(mockWarning).toHaveBeenCalledWith('Invalid scan path detected: src/../../etc. Using default: .');
    });

    it('should reject single parent reference', () => {
      mockGetInput.mockReturnValue('..');
      const { SCAN_PATH } = require('../src/app.input');
      expect(SCAN_PATH).toBe('.');
      expect(mockWarning).toHaveBeenCalledWith('Invalid scan path detected: ... Using default: .');
    });
  });

  describe('edge cases', () => {
    it('should handle "." as root directory', () => {
      mockGetInput.mockReturnValue('.');
      const { SCAN_PATH } = require('../src/app.input');
      expect(SCAN_PATH).toBe('.');
      expect(mockWarning).not.toHaveBeenCalled();
    });

    it('should normalize mixed separators', () => {
      mockGetInput.mockReturnValue('src\\api/lib');
      const { SCAN_PATH } = require('../src/app.input');
      // Should normalize backslashes to forward slashes
      expect(SCAN_PATH).toBe('src/api/lib');
    });

    it('should handle path with only "./" prefix', () => {
      mockGetInput.mockReturnValue('./');
      const { SCAN_PATH } = require('../src/app.input');
      expect(SCAN_PATH).toBe('.');
    });
  });

  describe('security boundary validation', () => {
    it('should prevent directory traversal attempt 1', () => {
      mockGetInput.mockReturnValue('../../../../etc/passwd');
      const { SCAN_PATH } = require('../src/app.input');
      expect(SCAN_PATH).toBe('.');
    });

    it('should prevent directory traversal attempt 2', () => {
      mockGetInput.mockReturnValue('src/../../../etc');
      const { SCAN_PATH } = require('../src/app.input');
      expect(SCAN_PATH).toBe('.');
    });

    it('should prevent absolute Unix path', () => {
      mockGetInput.mockReturnValue('/var/log/secrets');
      const { SCAN_PATH } = require('../src/app.input');
      expect(SCAN_PATH).toBe('.');
    });

    it('should prevent absolute Windows path with forward slashes', () => {
      mockGetInput.mockReturnValue('C:/Windows/System32');
      const { SCAN_PATH } = require('../src/app.input');
      expect(SCAN_PATH).toBe('.');
    });
  });
});
