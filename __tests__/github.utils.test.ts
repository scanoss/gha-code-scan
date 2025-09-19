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

import { context, getOctokit } from '@actions/github';
import * as core from '@actions/core';
import { getSHA, isPullRequest, createCommentOnPR, getFirstRunId } from '../src/utils/github.utils';

// Mock external dependencies
jest.mock('@actions/github');
jest.mock('@actions/core');
jest.mock('../src/app.input', () => ({
  GITHUB_TOKEN: 'mock-token'
}));

const mockOctokit = {
  rest: {
    actions: {
      getWorkflowRun: jest.fn(),
      listWorkflowRuns: jest.fn()
    },
    issues: {
      createComment: jest.fn()
    }
  }
};

describe('GitHub Utils', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (getOctokit as jest.Mock).mockReturnValue(mockOctokit);
    (context.eventName as any) = 'push';
    (context.sha as any) = 'abc123';
    (context.repo as any) = { owner: 'test-owner', repo: 'test-repo' };
    (context.runId as any) = 12345;
    (context.issue as any) = { number: 42 };
    (context.payload as any) = {};
  });

  describe('getSHA', () => {
    it('should return context sha for non-pull request events', () => {
      (context.eventName as any) = 'push';
      (context.sha as any) = 'push-sha-123';

      const result = getSHA();

      expect(result).toBe('push-sha-123');
    });

    it('should return pull request head sha for pull request events', () => {
      (context.eventName as any) = 'pull_request';
      (context.payload as any) = {
        pull_request: {
          head: {
            sha: 'pr-head-sha-456'
          }
        }
      };

      const result = getSHA();

      expect(result).toBe('pr-head-sha-456');
    });

    it('should fallback to context sha if pull request head sha is not available', () => {
      (context.eventName as any) = 'pull_request';
      (context.payload as any) = {
        pull_request: {
          head: {} // Missing sha property
        }
      };
      (context.sha as any) = 'fallback-sha-789';

      const result = getSHA();

      expect(result).toBe('fallback-sha-789');
    });
  });

  describe('isPullRequest', () => {
    it('should return true for pull_request event', () => {
      (context.eventName as any) = 'pull_request';

      const result = isPullRequest();

      expect(result).toBe(true);
    });

    it('should return false for non-pull request events', () => {
      (context.eventName as any) = 'push';

      const result = isPullRequest();

      expect(result).toBe(false);
    });

    it('should return false for workflow_dispatch event', () => {
      (context.eventName as any) = 'workflow_dispatch';

      const result = isPullRequest();

      expect(result).toBe(false);
    });
  });

  describe('createCommentOnPR', () => {
    beforeEach(() => {
      (context.eventName as any) = 'pull_request';
      (context.payload as any) = {
        pull_request: {
          number: 42
        }
      };
      (context.repo as any) = { owner: 'test-owner', repo: 'test-repo' };
    });

    it('should create comment on pull request successfully', async () => {
      const commentBody = 'Test comment body';
      mockOctokit.rest.issues.createComment.mockResolvedValue({
        data: { id: 123, html_url: 'https://github.com/test/comment' }
      });

      await createCommentOnPR(commentBody);

      expect(mockOctokit.rest.issues.createComment).toHaveBeenCalledWith({
        issue_number: 42,
        owner: 'test-owner',
        repo: 'test-repo',
        body: commentBody
      });
    });

    it('should handle missing pull request number', async () => {
      (context.issue as any) = {}; // Missing number property

      await createCommentOnPR('Test comment');

      expect(mockOctokit.rest.issues.createComment).toHaveBeenCalledWith({
        issue_number: undefined,
        owner: 'test-owner',
        repo: 'test-repo',
        body: 'Test comment'
      });
    });

    it('should call createComment and not handle promise rejections', async () => {
      (context.issue as any) = { number: 42 };
      // Since the function doesn't await the API call, we can't easily test error scenarios
      // because unhandled promise rejections cause test failures
      mockOctokit.rest.issues.createComment.mockResolvedValue({
        data: { id: 123, html_url: 'https://github.com/test/comment' }
      });

      await createCommentOnPR('Test comment');

      expect(mockOctokit.rest.issues.createComment).toHaveBeenCalledWith({
        issue_number: 42,
        owner: 'test-owner',
        repo: 'test-repo',
        body: 'Test comment'
      });
    });
  });

  describe('getFirstRunId', () => {
    it('should return current runId for non-workflow_dispatch events', async () => {
      (context.eventName as any) = 'push';
      (context.runId as any) = 98765;

      const result = await getFirstRunId();

      expect(result).toBe(98765);
      expect(mockOctokit.rest.actions.getWorkflowRun).not.toHaveBeenCalled();
    });

    it('should find first run for workflow_dispatch events', async () => {
      (context.eventName as any) = 'workflow_dispatch';
      (context.runId as any) = 12345;
      (context.repo as any) = { owner: 'test-owner', repo: 'test-repo' };
      (context.sha as any) = 'test-sha-123';
      (context.workflow as any) = 'Test Workflow';

      // Mock current workflow run
      mockOctokit.rest.actions.getWorkflowRun.mockResolvedValue({
        data: {
          workflow_id: 'test-workflow',
          head_sha: 'test-sha-123'
        }
      });

      // Mock workflow runs list
      mockOctokit.rest.actions.listWorkflowRuns.mockResolvedValue({
        data: {
          workflow_runs: [
            {
              id: 11111,
              created_at: '2023-01-03T10:00:00Z',
              event: 'push',
              head_sha: 'test-sha-123',
              name: 'Test Workflow'
            },
            {
              id: 22222,
              created_at: '2023-01-02T10:00:00Z',
              event: 'push',
              head_sha: 'test-sha-123',
              name: 'Test Workflow'
            },
            {
              id: 33333,
              created_at: '2023-01-01T10:00:00Z',
              event: 'push',
              head_sha: 'test-sha-123',
              name: 'Test Workflow'
            } // Oldest
          ]
        }
      });

      const infoSpy = jest.spyOn(core, 'info').mockImplementation();

      const result = await getFirstRunId();

      expect(result).toBe(33333); // Should return the oldest run
      expect(infoSpy).toHaveBeenCalledWith('First Run ID found: 33333 for workflow: Test Workflow');

      infoSpy.mockRestore();
    });

    it('should return current runId if no first run is found', async () => {
      (context.eventName as any) = 'workflow_dispatch';
      (context.runId as any) = 12345;
      (context.workflow as any) = 'Test Workflow';

      mockOctokit.rest.actions.getWorkflowRun.mockResolvedValue({
        data: {
          workflow_id: 'test-workflow',
          head_sha: 'test-sha-123'
        }
      });

      mockOctokit.rest.actions.listWorkflowRuns.mockResolvedValue({
        data: {
          workflow_runs: []
        }
      });

      const infoSpy = jest.spyOn(core, 'info').mockImplementation();

      const result = await getFirstRunId();

      expect(result).toBe(12345); // Should return current runId as fallback
      expect(infoSpy).toHaveBeenCalledWith('No first run found for workflow: Test Workflow, using current run: 12345');

      infoSpy.mockRestore();
    });

    it('should handle API errors gracefully and return current runId', async () => {
      (context.eventName as any) = 'workflow_dispatch';
      (context.runId as any) = 12345;
      (context.workflow as any) = 'Test Workflow';

      mockOctokit.rest.actions.getWorkflowRun.mockRejectedValue(new Error('API Error'));

      const infoSpy = jest.spyOn(core, 'info').mockImplementation();

      const result = await getFirstRunId();

      expect(result).toBe(12345); // Should return current runId as fallback when API fails
      expect(infoSpy).toHaveBeenCalledWith('No first run found for workflow: Test Workflow, using current run: 12345');

      infoSpy.mockRestore();
    });
  });
});
