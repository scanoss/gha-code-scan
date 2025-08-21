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

import { DependencyTrackStatusService, DependencyTrackUploadResult } from '../src/services/dependency-track-status.service';
import * as core from '@actions/core';
import { context, getOctokit } from '@actions/github';
import * as inputs from '../src/app.input';

// Mock modules
jest.mock('@actions/core');
jest.mock('@actions/github');
jest.mock('../src/utils/github.utils');
jest.mock('../src/app.input', () => ({
  GITHUB_TOKEN: 'mock-token',
  DEPENDENCY_TRACK_URL: 'https://dependencytrack.example.com'
}));

const mockOctokit = {
  rest: {
    checks: {
      create: jest.fn().mockResolvedValue({ data: { id: 12345 } })
    }
  }
};

describe('DependencyTrackStatusService', () => {
  let service: DependencyTrackStatusService;

  beforeEach(() => {
    service = new DependencyTrackStatusService();
    jest.clearAllMocks();
    
    (getOctokit as jest.Mock).mockReturnValue(mockOctokit);
    (context.repo as any) = { owner: 'test-owner', repo: 'test-repo' };
    
    // Mock getSHA
    const { getSHA } = require('../src/utils/github.utils');
    (getSHA as jest.Mock).mockResolvedValue('abc123');
  });

  describe('reportUploadStatus', () => {
    it('should create success status check for successful upload', async () => {
      const uploadResult: DependencyTrackUploadResult = {
        success: true,
        enabled: true,
        projectId: 'project-123',
        uploadToken: 'token-456789',
        projectName: 'test-project',
        projectVersion: '1.0.0',
        fileSize: 2048,
        componentsCount: 25,
        uploadTime: 1.5
      };

      const checkRunId = await service.reportUploadStatus(uploadResult);
      
      expect(checkRunId).toBe(12345);

      expect(mockOctokit.rest.checks.create).toHaveBeenCalledWith({
        owner: 'test-owner',
        repo: 'test-repo',
        name: 'Status Check: Dependency Track Upload',
        head_sha: 'abc123',
        status: 'completed',
        conclusion: 'success',
        output: {
          title: 'SBOM successfully uploaded to Dependency Track',
          summary: '### ✅ Dependency Track Upload \n #### SBOM successfully uploaded to Dependency Track',
          text: expect.stringContaining('**Upload Details:**')
        }
      });

      const callArgs = mockOctokit.rest.checks.create.mock.calls[0][0];
      expect(callArgs.output.text).toContain('• Project Name: test-project');
      expect(callArgs.output.text).toContain('• Project Version: 1.0.0');
      expect(callArgs.output.text).toContain('• Project ID: project-123');
      expect(callArgs.output.text).toContain('• Server: https://dependencytrack.example.com');
      expect(callArgs.output.text).toContain('• File: scanoss-cyclonedx.json (2.0 KB, 25 components)');
      expect(callArgs.output.text).toContain('• Upload Time: 1.5s');
      expect(callArgs.output.text).toContain('View project in Dependency Track [here](https://dependencytrack.example.com/projects/project-123).');
    });

    it('should create failure status check for failed upload', async () => {
      const uploadResult: DependencyTrackUploadResult = {
        success: false,
        enabled: true,
        error: 'Connection refused to server',
        uploadTime: 0.3
      };

      await service.reportUploadStatus(uploadResult);

      expect(mockOctokit.rest.checks.create).toHaveBeenCalledWith({
        owner: 'test-owner',
        repo: 'test-repo',
        name: 'Status Check: Dependency Track Upload',
        head_sha: 'abc123',
        status: 'completed',
        conclusion: 'failure',
        output: {
          title: 'Failed to upload SBOM to Dependency Track',
          summary: '### ❌ Dependency Track Upload \n #### Failed to upload SBOM to Dependency Track',
          text: expect.stringContaining('**Upload Details:**')
        }
      });

      const callArgs = mockOctokit.rest.checks.create.mock.calls[0][0];
      expect(callArgs.output.text).toContain('• Server: https://dependencytrack.example.com');
      expect(callArgs.output.text).toContain('• Error: Connection refused to server');
    });


    it('should handle minimal success result', async () => {
      const uploadResult: DependencyTrackUploadResult = {
        success: true,
        enabled: true,
        projectName: 'minimal-project'
      };

      await service.reportUploadStatus(uploadResult);

      expect(mockOctokit.rest.checks.create).toHaveBeenCalledWith({
        owner: 'test-owner',
        repo: 'test-repo',
        name: 'Status Check: Dependency Track Upload',
        head_sha: 'abc123',
        status: 'completed',
        conclusion: 'success',
        output: {
          title: 'SBOM successfully uploaded to Dependency Track',
          summary: '### ✅ Dependency Track Upload \n #### SBOM successfully uploaded to Dependency Track',
          text: expect.stringContaining('• Project Name: minimal-project')
        }
      });
    });

    it('should handle GitHub API errors gracefully', async () => {
      const uploadResult: DependencyTrackUploadResult = {
        success: true,
        enabled: true
      };

      mockOctokit.rest.checks.create.mockRejectedValue(new Error('GitHub API error'));
      const warningSpy = jest.spyOn(core, 'warning').mockImplementation();

      const checkRunId = await service.reportUploadStatus(uploadResult);

      expect(checkRunId).toBeNull();
      expect(warningSpy).toHaveBeenCalledWith('Failed to create Dependency Track upload status check: Error: GitHub API error');
      warningSpy.mockRestore();
      
      // Reset mock to return success for other tests
      mockOctokit.rest.checks.create.mockResolvedValue({ data: { id: 12345 } });
    });

    it('should include file size without components count', async () => {
      const uploadResult: DependencyTrackUploadResult = {
        success: true,
        enabled: true,
        fileSize: 1536
      };

      await service.reportUploadStatus(uploadResult);

      const callArgs = mockOctokit.rest.checks.create.mock.calls[0][0];
      expect(callArgs.output.text).toContain('• File: scanoss-cyclonedx.json (1.5 KB)');
      expect(callArgs.output.text).not.toContain('components');
    });

    it('should not include Dependency Track project link without project ID', async () => {
      const uploadResult: DependencyTrackUploadResult = {
        success: true,
        enabled: true,
        projectName: 'test-project'
      };

      await service.reportUploadStatus(uploadResult);

      const callArgs = mockOctokit.rest.checks.create.mock.calls[0][0];
      expect(callArgs.output.text).not.toContain('**View project in Dependency Track:**');
    });
  });
});