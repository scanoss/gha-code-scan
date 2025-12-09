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

// Mock dependencies
const mockWarning = jest.fn();
const mockInfo = jest.fn();
const mockError = jest.fn();

jest.mock('@actions/core', () => ({
  warning: mockWarning,
  info: mockInfo,
  error: mockError
}));

// Mock fs module
const mockExistsSync = jest.fn();
const mockReadFileSync = jest.fn();

jest.mock('fs', () => ({
  existsSync: mockExistsSync,
  readFileSync: mockReadFileSync
}));

jest.mock('@actions/github', () => ({
  context: {
    repo: { owner: 'test-owner', repo: 'test-repo' },
    sha: 'abc123'
  }
}));

const mockCreateSnippetSummaryAnnotation = jest.fn();
const mockCreateFileMatchSummaryAnnotation = jest.fn();
const mockCreateSnippetCommitComment = jest.fn();
const mockCreateFileCommitComment = jest.fn();
const mockCreateMainConversationComment = jest.fn();

jest.mock('../src/utils/annotation-creators', () => ({
  createSnippetSummaryAnnotation: mockCreateSnippetSummaryAnnotation,
  createFileMatchSummaryAnnotation: mockCreateFileMatchSummaryAnnotation
}));

jest.mock('../src/utils/github-comment-api', () => ({
  createSnippetCommitComment: mockCreateSnippetCommitComment,
  createFileCommitComment: mockCreateFileCommitComment,
  createMainConversationComment: mockCreateMainConversationComment
}));

jest.mock('../src/app.input', () => ({
  SCAN_PATH: '.'
}));

// Import after mocks
import { createSnippetAnnotations } from '../src/utils/snippet-annotations.utils';

describe('Snippet Annotations Utils', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCreateSnippetCommitComment.mockResolvedValue(true);
    mockCreateFileCommitComment.mockResolvedValue(true);
    mockCreateMainConversationComment.mockResolvedValue(true);
  });

  describe('createSnippetAnnotations', () => {
    it('should warn if results file does not exist', async () => {
      mockExistsSync.mockReturnValue(false);

      await createSnippetAnnotations('/path/to/missing-results.json');

      expect(mockWarning).toHaveBeenCalledWith('Results file not found: /path/to/missing-results.json');
      expect(mockCreateSnippetSummaryAnnotation).not.toHaveBeenCalled();
    });

    it('should process snippet matches and create annotations', async () => {
      const resultsData = {
        'file1.ts': [
          {
            id: 'snippet',
            status: 'pending',
            file: 'file1.ts',
            component: 'test-component',
            lines: '10-20',
            oss_lines: '5-15',
            matched: '80%',
            purl: ['pkg:github/test/repo'],
            licenses: [{ name: 'MIT' }]
          }
        ]
      };

      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue(JSON.stringify(resultsData));

      await createSnippetAnnotations('/path/to/results.json');

      expect(mockCreateSnippetSummaryAnnotation).toHaveBeenCalledWith([
        {
          filePath: 'file1.ts',
          match: expect.objectContaining({ component: 'test-component' })
        }
      ]);
      expect(mockCreateSnippetCommitComment).toHaveBeenCalledWith(
        'file1.ts',
        expect.objectContaining({ component: 'test-component' })
      );
      expect(mockCreateMainConversationComment).toHaveBeenCalled();
    });

    it('should process file matches and create annotations', async () => {
      const resultsData = {
        'file1.ts': [
          {
            id: 'file',
            status: 'pending',
            component: 'test-component',
            version: '1.0.0',
            purl: ['pkg:github/test/repo'],
            licenses: [{ name: 'MIT' }]
          }
        ]
      };

      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue(JSON.stringify(resultsData));

      await createSnippetAnnotations('/path/to/results.json');

      expect(mockCreateFileMatchSummaryAnnotation).toHaveBeenCalledWith([
        {
          filePath: 'file1.ts',
          match: expect.objectContaining({ id: 'file' })
        }
      ]);
      expect(mockCreateFileCommitComment).toHaveBeenCalledWith('file1.ts', expect.objectContaining({ id: 'file' }));
    });

    it('should process both snippet and file matches', async () => {
      const resultsData = {
        'file1.ts': [
          {
            id: 'snippet',
            status: 'pending',
            lines: '10-20',
            oss_lines: '5-15',
            matched: '80%',
            purl: ['pkg:github/test/repo']
          }
        ],
        'file2.ts': [
          {
            id: 'file',
            status: 'pending',
            component: 'test-component',
            version: '1.0.0',
            purl: ['pkg:github/test/repo']
          }
        ]
      };

      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue(JSON.stringify(resultsData));

      await createSnippetAnnotations('/path/to/results.json');

      expect(mockCreateSnippetSummaryAnnotation).toHaveBeenCalled();
      expect(mockCreateFileMatchSummaryAnnotation).toHaveBeenCalled();
      expect(mockCreateMainConversationComment).toHaveBeenCalledWith(
        expect.arrayContaining([expect.objectContaining({ filePath: 'file1.ts' })]),
        expect.arrayContaining([expect.objectContaining({ filePath: 'file2.ts' })])
      );
    });

    it('should skip non-pending matches', async () => {
      const resultsData = {
        'file1.ts': [
          {
            id: 'snippet',
            status: 'identified',
            lines: '10-20',
            oss_lines: '5-15',
            matched: '80%',
            purl: ['pkg:github/test/repo']
          }
        ]
      };

      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue(JSON.stringify(resultsData));

      await createSnippetAnnotations('/path/to/results.json');

      expect(mockCreateSnippetSummaryAnnotation).not.toHaveBeenCalled();
      expect(mockCreateFileMatchSummaryAnnotation).not.toHaveBeenCalled();
      expect(mockCreateMainConversationComment).not.toHaveBeenCalled();
    });

    it('should skip non-array entries in results', async () => {
      const resultsData = {
        'file1.ts': { invalid: 'data' },
        'file2.ts': [
          {
            id: 'snippet',
            status: 'pending',
            lines: '10-20',
            oss_lines: '5-15',
            matched: '80%',
            purl: ['pkg:github/test/repo']
          }
        ]
      };

      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue(JSON.stringify(resultsData));

      await createSnippetAnnotations('/path/to/results.json');

      expect(mockCreateSnippetSummaryAnnotation).toHaveBeenCalledWith([
        expect.objectContaining({ filePath: 'file2.ts' })
      ]);
    });

    it('should handle multiple matches in single file', async () => {
      const resultsData = {
        'file1.ts': [
          {
            id: 'snippet',
            status: 'pending',
            lines: '10-20',
            oss_lines: '5-15',
            matched: '80%',
            purl: ['pkg:github/test/repo1']
          },
          {
            id: 'snippet',
            status: 'pending',
            lines: '30-40',
            oss_lines: '25-35',
            matched: '85%',
            purl: ['pkg:github/test/repo2']
          }
        ]
      };

      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue(JSON.stringify(resultsData));

      await createSnippetAnnotations('/path/to/results.json');

      expect(mockCreateSnippetSummaryAnnotation).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ filePath: 'file1.ts' }),
          expect.objectContaining({ filePath: 'file1.ts' })
        ])
      );
      expect(mockCreateSnippetCommitComment).toHaveBeenCalledTimes(2);
    });

    it('should log GitHub context information', async () => {
      const resultsData = {
        'file1.ts': [
          {
            id: 'snippet',
            status: 'pending',
            lines: '10-20',
            oss_lines: '5-15',
            matched: '80%',
            purl: ['pkg:github/test/repo']
          }
        ]
      };

      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue(JSON.stringify(resultsData));

      await createSnippetAnnotations('/path/to/results.json');

      expect(mockInfo).toHaveBeenCalledWith(expect.stringContaining('owner=test-owner, repo=test-repo, sha=abc123'));
    });

    it('should handle failed commit comments gracefully', async () => {
      const resultsData = {
        'file1.ts': [
          {
            id: 'snippet',
            status: 'pending',
            lines: '10-20',
            oss_lines: '5-15',
            matched: '80%',
            purl: ['pkg:github/test/repo']
          }
        ],
        'file2.ts': [
          {
            id: 'file',
            status: 'pending',
            component: 'test-component',
            purl: ['pkg:github/test/repo']
          }
        ]
      };

      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue(JSON.stringify(resultsData));
      mockCreateSnippetCommitComment.mockResolvedValue(false);
      mockCreateFileCommitComment.mockResolvedValue(true);

      await createSnippetAnnotations('/path/to/results.json');

      expect(mockWarning).toHaveBeenCalledWith(
        expect.stringContaining('1 commit comments failed to create, 1 succeeded')
      );
    });

    it('should handle empty results', async () => {
      const resultsData = {};

      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue(JSON.stringify(resultsData));

      await createSnippetAnnotations('/path/to/results.json');

      expect(mockCreateSnippetSummaryAnnotation).not.toHaveBeenCalled();
      expect(mockCreateFileMatchSummaryAnnotation).not.toHaveBeenCalled();
      expect(mockCreateMainConversationComment).not.toHaveBeenCalled();
    });

    it('should handle JSON parse error', async () => {
      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue('invalid json');

      await createSnippetAnnotations('/path/to/results.json');

      expect(mockError).toHaveBeenCalledWith(expect.stringContaining('Failed to create snippet annotations'));
    });

    it('should handle file read error', async () => {
      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockImplementation(() => {
        throw new Error('File read error');
      });

      await createSnippetAnnotations('/path/to/results.json');

      expect(mockError).toHaveBeenCalledWith(expect.stringContaining('Failed to create snippet annotations'));
    });

    it('should log summary of operations performed', async () => {
      const resultsData = {
        'file1.ts': [
          {
            id: 'snippet',
            status: 'pending',
            lines: '10-20',
            oss_lines: '5-15',
            matched: '80%',
            purl: ['pkg:github/test/repo']
          }
        ]
      };

      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue(JSON.stringify(resultsData));

      await createSnippetAnnotations('/path/to/results.json');

      expect(mockInfo).toHaveBeenCalledWith(
        expect.stringContaining('Created summary annotations, attempted 1 commit comments')
      );
    });
  });
});
