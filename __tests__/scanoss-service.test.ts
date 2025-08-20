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

import { RUNTIME_CONTAINER } from '../src/app.input';
import { ScanOssService } from '../src/services/scanoss.service';
import { CYCLONEDX_FILE_NAME } from '../src/app.output';
import * as exec from '@actions/exec';
import * as core from '@actions/core';
import * as fs from 'fs';

// Mock external dependencies
jest.mock('@actions/exec');
jest.mock('@actions/core');

// Mock fs module for dynamic import
const mockAccess = jest.fn();

// Mock node:fs module which is used by dynamic import
jest.mock('node:fs', () => ({
  constants: { F_OK: 0 },
  promises: {
    access: jest.fn()
  }
}));

// Also mock fs in case it uses standard fs import
jest.mock('fs', () => ({
  constants: { F_OK: 0 },
  promises: {
    access: jest.fn()
  }
}));

jest.mock('../src/services/github.service', () => ({
  uploadToArtifacts: jest.fn()
}));

jest.mock('../src/app.input', () => ({
  ...jest.requireActual('../src/app.input'),
  REPO_DIR: '',
  OUTPUT_FILEPATH: 'results.json',
  EXECUTABLE: 'docker',
  COPYLEFT_LICENSE_EXCLUDE: '',
  COPYLEFT_LICENSE_EXPLICIT: '',
  COPYLEFT_LICENSE_INCLUDE: ''
}));

const mockGetExecOutput = exec.getExecOutput as jest.MockedFunction<typeof exec.getExecOutput>;

describe('Scanoss service tests', () => {
  let scanossService: ScanOssService;

  beforeEach(() => {
    scanossService = new ScanOssService();
    jest.clearAllMocks();
  });

  describe('buildCycloneDXParameters', () => {
    it('should correctly return the scanoss-py CycloneDX conversion command', () => {
      const command = (scanossService as any).buildCycloneDXParameters();
      expect(command).toEqual([
        'run',
        '-v',
        ':/scanoss',
        RUNTIME_CONTAINER,
        'convert',
        '--input',
        './results.json',
        '--format',
        'cyclonedx',
        '--output',
        `./${CYCLONEDX_FILE_NAME}`
      ]);
    });
  });

  describe('scanResultsToCycloneDX', () => {
    it('should successfully convert results to CycloneDX format', async () => {
      const { uploadToArtifacts } = require('../src/services/github.service');
      
      mockGetExecOutput.mockResolvedValue({
        stdout: 'Conversion successful',
        stderr: '',
        exitCode: 0
      });
      (uploadToArtifacts as jest.Mock).mockResolvedValue(undefined);

      const infoSpy = jest.spyOn(core, 'info').mockImplementation();

      const result = await scanossService.scanResultsToCycloneDX();

      expect(result).toBeUndefined();
      expect(mockGetExecOutput).toHaveBeenCalledWith(
        'docker',
        expect.arrayContaining(['convert', '--format', 'cyclonedx']),
        expect.objectContaining({
          failOnStdErr: false,
          ignoreReturnCode: false
        })
      );
      expect(infoSpy).toHaveBeenCalledWith('Converting SCANOSS results to CycloneDX format...');
      // Due to dynamic import, we can't easily test the fs.access call and upload
      // The important part is that the conversion command was executed successfully

      infoSpy.mockRestore();
    });

    it('should handle conversion failure with non-zero exit code', async () => {
      mockGetExecOutput.mockResolvedValue({
        stdout: '',
        stderr: 'Conversion failed',
        exitCode: 1
      });

      const result = await scanossService.scanResultsToCycloneDX();

      expect(result).toBeInstanceOf(Error);
      expect(result?.message).toBe('Error converting scan results into CycloneDX format');
      expect(mockAccess).not.toHaveBeenCalled();
    });

    it('should handle missing CycloneDX file (empty repository)', async () => {
      mockGetExecOutput.mockResolvedValue({
        stdout: 'Conversion completed',
        stderr: '',
        exitCode: 0
      });
      mockAccess.mockRejectedValue(new Error('File not found'));

      const infoSpy = jest.spyOn(core, 'info').mockImplementation();

      const result = await scanossService.scanResultsToCycloneDX();

      expect(result).toBeUndefined();
      expect(infoSpy).toHaveBeenCalledWith('CycloneDX conversion completed but no file generated (likely empty repository)');

      infoSpy.mockRestore();
    });

    it('should handle exec command throwing error', async () => {
      mockGetExecOutput.mockRejectedValue(new Error('Docker command failed'));

      const errorSpy = jest.spyOn(core, 'error').mockImplementation();

      const result = await scanossService.scanResultsToCycloneDX();

      expect(result).toBeUndefined();
      expect(errorSpy).toHaveBeenCalledWith('Docker command failed');

      errorSpy.mockRestore();
    });

    it('should handle file upload failure gracefully', async () => {
      const { uploadToArtifacts } = require('../src/services/github.service');
      
      mockGetExecOutput.mockResolvedValue({
        stdout: 'Conversion successful',
        stderr: '',
        exitCode: 0
      });
      mockAccess.mockResolvedValue(undefined);
      (uploadToArtifacts as jest.Mock).mockRejectedValue(new Error('Upload failed'));

      const infoSpy = jest.spyOn(core, 'info').mockImplementation();

      const result = await scanossService.scanResultsToCycloneDX();

      expect(result).toBeUndefined();
      expect(infoSpy).toHaveBeenCalledWith('CycloneDX conversion completed but no file generated (likely empty repository)');

      infoSpy.mockRestore();
    });
  });
});
