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
    stat: jest.fn(),
    writeFile: jest.fn()
  },
  constants: {
    F_OK: 0,
    O_RDONLY: 0
  },
  stat: jest.fn()
}));
const mockGetExecOutput = jest.spyOn(exec, 'getExecOutput');
const mockReadFile = jest.spyOn(fs.promises, 'readFile');
const mockWriteFile = jest.spyOn(fs.promises, 'writeFile');
const mockAccess = jest.spyOn(fs.promises, 'access');

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
    mockWriteFile.mockResolvedValue(undefined);
    mockAccess.mockResolvedValue(undefined);
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
    it('should succeed with warnings when exitCode is 0 but stderr has real warnings', async () => {
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
      const warningSpy = jest.spyOn(core, 'warning').mockImplementation();

      const result = await service.uploadToDependencyTrack();

      // Should return true since exitCode is 0 (success with warnings)
      expect(result).toBe(true);
      // Should log raw stderr to debug only
      expect(debugSpy).toHaveBeenCalledWith(expect.stringContaining('Warning: Connection to sensitive-server.com:8080'));
      // Should show warning about stderr content
      expect(warningSpy).toHaveBeenCalledWith('Dependency Track upload completed with warnings. Check debug logs for details.');
      
      debugSpy.mockRestore();
      warningSpy.mockRestore();
    });

    it('should succeed without warnings when stderr contains harmless info messages', async () => {
      mockAccess.mockResolvedValue(undefined);
      mockReadFile.mockResolvedValue(JSON.stringify({
        bomFormat: "CycloneDX",
        specVersion: "1.4",
        components: [
          { name: "test-component", version: "1.0.0" }
        ]
      })); // Valid CycloneDX with components
      
      mockGetExecOutput.mockResolvedValue({
        stdout: '{"token": "test-token", "project_uuid": "test-uuid"}',
        stderr: 'Reading SBOM file: ./scanoss-cyclonedx.json',
        exitCode: 0  // Success with harmless info message
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
      const warningSpy = jest.spyOn(core, 'warning').mockImplementation();

      const result = await service.uploadToDependencyTrack();

      // Should return true since exitCode is 0
      expect(result).toBe(true);
      // Should log stderr to debug
      expect(debugSpy).toHaveBeenCalledWith(expect.stringContaining('Reading SBOM file:'));
      // Should NOT show warning for harmless info messages
      expect(warningSpy).not.toHaveBeenCalled();
      
      debugSpy.mockRestore();
      warningSpy.mockRestore();
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

  // Test empty repository handling
  describe('Empty repository handling', () => {
    it('should generate minimal CycloneDX when file does not exist', async () => {
      mockAccess.mockRejectedValue(new Error('File not found'));
      mockWriteFile.mockResolvedValue(undefined);
      mockReadFile.mockResolvedValue(JSON.stringify({
        bomFormat: "CycloneDX",
        specVersion: "1.4",
        components: []
      }));
      
      mockGetExecOutput.mockResolvedValue({
        stdout: JSON.stringify({ token: 'test-token', project_uuid: 'test-uuid' }),
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
      expect(mockWriteFile).toHaveBeenCalledWith(
        'scanoss-cyclonedx.json',
        expect.stringContaining('"bomFormat": "CycloneDX"'),
        'utf-8'
      );
    });

    it('should generate minimal CycloneDX when file is empty', async () => {
      mockAccess.mockResolvedValue(undefined);
      mockReadFile.mockResolvedValueOnce(''); // Empty file first read
      mockWriteFile.mockResolvedValue(undefined);
      mockReadFile.mockResolvedValueOnce(JSON.stringify({
        bomFormat: "CycloneDX",
        specVersion: "1.4",
        components: []
      })); // After writing minimal SBOM
      
      mockGetExecOutput.mockResolvedValue({
        stdout: JSON.stringify({ token: 'test-token', project_uuid: 'test-uuid' }),
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
      expect(mockWriteFile).toHaveBeenCalledWith(
        'scanoss-cyclonedx.json',
        expect.stringContaining('"bomFormat": "CycloneDX"'),
        'utf-8'
      );
    });

    it('should generate minimal CycloneDX when file has no components', async () => {
      mockAccess.mockResolvedValue(undefined);
      mockReadFile.mockResolvedValueOnce(JSON.stringify({
        bomFormat: "CycloneDX",
        specVersion: "1.4",
        components: []
      })); // File exists but no components
      mockWriteFile.mockResolvedValue(undefined);
      
      mockGetExecOutput.mockResolvedValue({
        stdout: JSON.stringify({ token: 'test-token', project_uuid: 'test-uuid' }),
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
      expect(mockWriteFile).toHaveBeenCalledWith(
        'scanoss-cyclonedx.json',
        expect.stringContaining('"bomFormat": "CycloneDX"'),
        'utf-8'
      );
    });

    it('should generate minimal CycloneDX when file is invalid JSON', async () => {
      mockAccess.mockResolvedValue(undefined);
      mockReadFile.mockResolvedValueOnce('invalid json content'); // Invalid JSON first read
      mockWriteFile.mockResolvedValue(undefined);
      mockReadFile.mockResolvedValueOnce(JSON.stringify({
        bomFormat: "CycloneDX",
        specVersion: "1.4",
        components: []
      })); // After writing minimal SBOM
      
      mockGetExecOutput.mockResolvedValue({
        stdout: JSON.stringify({ token: 'test-token', project_uuid: 'test-uuid' }),
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
      expect(mockWriteFile).toHaveBeenCalledWith(
        'scanoss-cyclonedx.json',
        expect.stringContaining('"bomFormat": "CycloneDX"'),
        'utf-8'
      );
    });
  });
});
