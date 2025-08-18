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
import * as exec from '@actions/exec';
import { DependencyTrackService } from '../src/services/dependency-track.service';
import * as fs from 'fs';
import * as core from '@actions/core';

jest.mock('../src/app.input', () => ({
  ...jest.requireActual('../src/app.input'),
  REPO_DIR: '',
  OUTPUT_FILEPATH: 'results.json',
  COPYLEFT_LICENSE_EXCLUDE: '',
  COPYLEFT_LICENSE_EXPLICIT: '',
  COPYLEFT_LICENSE_INCLUDE: ''
}));

jest.mock('fs', () => ({
  promises: {
    readFile: jest.fn(),
    access: jest.fn(),
    stat: jest.fn()
  },
  constants: {
    F_OK: 0,
    O_RDONLY: 0
  },
  stat: jest.fn()
}));
const mockGetExecOutput = jest.spyOn(exec, 'getExecOutput');
const mockReadFile = jest.spyOn(fs.promises, 'readFile');

describe('Dependency track service', () => {
  let dependencyTrackProjectName = 'dependency-track-project-name';
  let dependencyTrackProjectVersion = '1.2.4';
  let dependencyTrackProjectID = 'asttvsd2346gfy';
  let dependencyTrackURL = 'https://dependencytrack.com';
  let dependencyTrackAPIKey = 'tgtresetryokjgvcb';
  beforeEach(() => {
    dependencyTrackProjectName = 'dependency-track-project-name';
    dependencyTrackProjectVersion = '1.2.4';
    dependencyTrackProjectID = 'asttvsd2346gfy';
    dependencyTrackURL = 'https://dependencytrack.com';
    dependencyTrackAPIKey = 'tgtresetryokjgvcb';
    jest.clearAllMocks();
    mockReadFile.mockResolvedValue('mock cyclonedx content');
  });

  it('should fail due to missing Dependency Track API Key', () => {
    dependencyTrackAPIKey = '';
    const service = new DependencyTrackService({
      enabled: true,
      url: dependencyTrackURL,
      apiKey: dependencyTrackAPIKey,
      projectId: dependencyTrackProjectID,
      projectName: dependencyTrackProjectName,
      projectVersion: dependencyTrackProjectVersion
    });

    expect(() => {
      (service as any).validateConfiguration();
    }).toThrow('Dependency Track Upload Failed: Required parameters are missing.');
  });

  it('should fail due to missing project version', () => {
    // Project id has more priority than project version
    dependencyTrackProjectID = '';
    // Set dependency track project version to empty string
    dependencyTrackProjectVersion = '';
    const service = new DependencyTrackService({
      enabled: true,
      url: dependencyTrackURL,
      apiKey: dependencyTrackAPIKey,
      projectId: dependencyTrackProjectID,
      projectName: dependencyTrackProjectName,
      projectVersion: dependencyTrackProjectVersion
    });

    expect(() => {
      (service as any).validateConfiguration();
    }).toThrow('Dependency Track Upload Failed: Project identification is incomplete.');
  });

  it('should fail due to missing project name', () => {
    // Project id has more priority than project version
    dependencyTrackProjectID = '';
    // Set dependency track project version to empty string
    dependencyTrackProjectName = '';
    const service = new DependencyTrackService({
      enabled: true,
      url: dependencyTrackURL,
      apiKey: dependencyTrackAPIKey,
      projectId: dependencyTrackProjectID,
      projectName: dependencyTrackProjectName,
      projectVersion: dependencyTrackProjectVersion
    });

    expect(() => {
      (service as any).validateConfiguration();
    }).toThrow('Dependency Track Upload Failed: Project identification is incomplete.');
  });

  it('should fail due to missing dependency track URL', () => {
    dependencyTrackURL = '';
    const service = new DependencyTrackService({
      enabled: true,
      url: dependencyTrackURL,
      apiKey: dependencyTrackAPIKey,
      projectId: dependencyTrackProjectID,
      projectName: dependencyTrackProjectName,
      projectVersion: dependencyTrackProjectVersion
    });
    expect(() => {
      (service as any).validateConfiguration();
    }).toThrow('Dependency Track Upload Failed: Required parameters are missing.');
  });

  it('should correctly return the scanoss-py Dependency Track upload command', () => {
    const service = new DependencyTrackService({
      enabled: true,
      url: dependencyTrackURL,
      apiKey: dependencyTrackAPIKey,
      projectId: dependencyTrackProjectID,
      projectName: dependencyTrackProjectName,
      projectVersion: dependencyTrackProjectVersion
    });
    const command = (service as any).buildDependencyTrackUploadParameters();
    expect(command).toEqual([
      'run',
      '-v',
      ':/scanoss',
      RUNTIME_CONTAINER,
      'export',
      'dependency-track',
      '--input',
      './scanoss-cyclonedx.json',
      '--apikey',
      dependencyTrackAPIKey,
      '--url',
      dependencyTrackURL,
      '--project-id',
      dependencyTrackProjectID,
      '--project-name',
      dependencyTrackProjectName,
      '--project-version',
      dependencyTrackProjectVersion
    ]);
  });

  it('should return false when dependency track is disabled', async () => {
    const service = new DependencyTrackService({
      enabled: false,
      url: dependencyTrackURL,
      apiKey: dependencyTrackAPIKey,
      projectId: dependencyTrackProjectID,
      projectName: dependencyTrackProjectName,
      projectVersion: dependencyTrackProjectVersion
    });

    const result = await service.uploadToDependencyTrack();
    expect(result).toBe(false);
  });

  it('should return false when upload fails due to validation errors', async () => {
    const service = new DependencyTrackService({
      enabled: true,
      url: '',  // Invalid URL to trigger validation error
      apiKey: dependencyTrackAPIKey,
      projectId: dependencyTrackProjectID,
      projectName: dependencyTrackProjectName,
      projectVersion: dependencyTrackProjectVersion
    });

    const result = await service.uploadToDependencyTrack();
    expect(result).toBe(false);
  });

  it('should return false when cyclonedx file read fails', async () => {
    mockReadFile.mockRejectedValue(new Error('File not found'));
    
    const service = new DependencyTrackService({
      enabled: true,
      url: dependencyTrackURL,
      apiKey: dependencyTrackAPIKey,
      projectId: dependencyTrackProjectID,
      projectName: dependencyTrackProjectName,
      projectVersion: dependencyTrackProjectVersion
    });

    const result = await service.uploadToDependencyTrack();
    expect(result).toBe(false);
  });

  it('should return true when upload succeeds', async () => {
    mockGetExecOutput.mockResolvedValue({
      stdout: JSON.stringify({ token: 'upload-token', project_uuid: 'project-id' }),
      stderr: '',
      exitCode: 0
    });

    const service = new DependencyTrackService({
      enabled: true,
      url: dependencyTrackURL,
      apiKey: dependencyTrackAPIKey,
      projectId: dependencyTrackProjectID,
      projectName: dependencyTrackProjectName,
      projectVersion: dependencyTrackProjectVersion
    });

    const result = await service.uploadToDependencyTrack();
    expect(result).toBe(true);
  });

  it('should return false when upload command fails', async () => {
    mockGetExecOutput.mockResolvedValue({
      stdout: '',
      stderr: 'Connection refused',
      exitCode: 1
    });

    const service = new DependencyTrackService({
      enabled: true,
      url: dependencyTrackURL,
      apiKey: dependencyTrackAPIKey,
      projectId: dependencyTrackProjectID,
      projectName: dependencyTrackProjectName,
      projectVersion: dependencyTrackProjectVersion
    });

    const result = await service.uploadToDependencyTrack();
    expect(result).toBe(false);
  });

  // Test error message parsing and sanitization
  describe('Error message handling', () => {
    it('should sanitize stderr in upload errors when exitCode is 0 but stderr exists', async () => {
      mockGetExecOutput.mockResolvedValue({
        stdout: '{"token": "test-token", "project_uuid": "test-uuid"}',
        stderr: 'Warning: Connection to sensitive-server.com:8080 with API key abc123',
        exitCode: 0  // Success but with warning stderr
      });

      const service = new DependencyTrackService({
        enabled: true,
        url: dependencyTrackURL,
        apiKey: dependencyTrackAPIKey,
        projectId: dependencyTrackProjectID,
        projectName: dependencyTrackProjectName,
        projectVersion: dependencyTrackProjectVersion
      });

      const debugSpy = jest.spyOn(core, 'debug').mockImplementation();

      const result = await service.uploadToDependencyTrack();

      // Should return false due to stderr even with exitCode 0
      expect(result).toBe(false);
      // Should log raw stderr to debug only
      expect(debugSpy).toHaveBeenCalledWith(expect.stringContaining('Warning: Connection to sensitive-server.com:8080'));
      
      debugSpy.mockRestore();
    });

    it('should use parseUploadError for exitCode 1 errors', async () => {
      mockGetExecOutput.mockResolvedValue({
        stdout: '',
        stderr: 'Connection refused to server',
        exitCode: 1
      });

      const service = new DependencyTrackService({
        enabled: true,
        url: dependencyTrackURL,
        apiKey: dependencyTrackAPIKey,
        projectId: dependencyTrackProjectID,
        projectName: dependencyTrackProjectName,
        projectVersion: dependencyTrackProjectVersion
      });

      const result = await service.uploadToDependencyTrack();
      expect(result).toBe(false);
      // Error should be parsed through the parseUploadError method, not directly exposed
    });

    it('should parse connection errors correctly', async () => {
      const service = new DependencyTrackService({
        enabled: true,
        url: dependencyTrackURL,
        apiKey: dependencyTrackAPIKey,
        projectId: dependencyTrackProjectID,
        projectName: dependencyTrackProjectName,
        projectVersion: dependencyTrackProjectVersion
      });

      // Test the private parseUploadError method via reflection
      const parseMethod = (service as any).parseUploadError.bind(service);
      const result = parseMethod('Connection refused to server');
      
      expect(result).toContain('Cannot connect to Dependency Track server');
      expect(result).toContain('Server is not reachable');
      expect(result).not.toContain('Connection refused to server'); // Raw stderr should not be in result
    });

    it('should parse authentication errors correctly', async () => {
      const service = new DependencyTrackService({
        enabled: true,
        url: dependencyTrackURL,
        apiKey: dependencyTrackAPIKey,
        projectId: dependencyTrackProjectID,
        projectName: dependencyTrackProjectName,
        projectVersion: dependencyTrackProjectVersion
      });

      const parseMethod = (service as any).parseUploadError.bind(service);
      const result = parseMethod('401 Unauthorized invalid api key abc123');
      
      expect(result).toContain('Authentication failed with Dependency Track server');
      expect(result).toContain('Invalid or missing API key');
      expect(result).not.toContain('401 Unauthorized invalid api key abc123');
    });
  });
});
