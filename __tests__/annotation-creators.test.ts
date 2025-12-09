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
const mockNotice = jest.fn();
const mockInfo = jest.fn();

jest.mock('@actions/core', () => ({
  notice: mockNotice,
  info: mockInfo
}));

jest.mock('../src/utils/github.utils', () => ({
  resolveRepoAndSha: jest.fn(() => ({
    owner: 'test-owner',
    repo: 'test-repo',
    sha: 'abc123'
  }))
}));

jest.mock('../src/app.input', () => ({
  SCAN_PATH: '.'
}));

import { createSnippetSummaryAnnotation, createFileMatchSummaryAnnotation } from '../src/utils/annotation-creators';
import { SnippetMatchWithPath, FileMatchWithPath } from '../src/types/annotations';

describe('Annotation Creators', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createSnippetSummaryAnnotation', () => {
    it('should create annotation for single snippet match', () => {
      const snippetMatches: SnippetMatchWithPath[] = [
        {
          filePath: 'src/test.ts',
          match: {
            file: 'test.ts',
            component: 'test-component',
            lines: '10-20',
            oss_lines: '5-15',
            matched: '80%',
            purl: ['pkg:github/test/repo'],
            version: '1.0.0',
            licenses: [{ name: 'MIT' }],
            url: 'https://example.com'
          }
        }
      ];

      createSnippetSummaryAnnotation(snippetMatches);

      expect(mockNotice).toHaveBeenCalledWith(
        expect.stringContaining('Found 1 snippet matches'),
        { title: 'Code Snippet Matches Summary' }
      );
      expect(mockNotice).toHaveBeenCalledWith(
        expect.stringContaining('https://github.com/test-owner/test-repo/commit/abc123'),
        { title: 'Code Snippet Matches Summary' }
      );
      expect(mockNotice).toHaveBeenCalledWith(
        expect.stringContaining('src/test.ts'),
        { title: 'Code Snippet Matches Summary' }
      );
      expect(mockInfo).toHaveBeenCalledWith('Created snippet summary annotation for 1 matches');
    });

    it('should create annotation for multiple snippet matches in same file', () => {
      const snippetMatches: SnippetMatchWithPath[] = [
        {
          filePath: 'src/test.ts',
          match: {
            file: 'test.ts',
            component: 'test-component',
            lines: '10-20',
            oss_lines: '5-15',
            matched: '80%',
            purl: ['pkg:github/test/repo'],
            version: '1.0.0',
            licenses: [{ name: 'MIT' }],
            url: 'https://example.com'
          }
        },
        {
          filePath: 'src/test.ts',
          match: {
            file: 'test.ts',
            component: 'test-component2',
            lines: '30-40',
            oss_lines: '25-35',
            matched: '85%',
            purl: ['pkg:github/test/repo2'],
            version: '2.0.0',
            licenses: [{ name: 'Apache-2.0' }],
            url: 'https://example2.com'
          }
        }
      ];

      createSnippetSummaryAnnotation(snippetMatches);

      expect(mockNotice).toHaveBeenCalledWith(
        expect.stringContaining('Found 2 snippet matches'),
        { title: 'Code Snippet Matches Summary' }
      );
      expect(mockNotice).toHaveBeenCalledWith(
        expect.stringContaining('(2 matches)'),
        { title: 'Code Snippet Matches Summary' }
      );
    });

    it('should create annotation for multiple snippet matches in different files', () => {
      const snippetMatches: SnippetMatchWithPath[] = [
        {
          filePath: 'src/file1.ts',
          match: {
            file: 'file1.ts',
            component: 'component1',
            lines: '10-20',
            oss_lines: '5-15',
            matched: '80%',
            purl: ['pkg:github/test/repo'],
            version: '1.0.0',
            licenses: [{ name: 'MIT' }],
            url: 'https://example.com'
          }
        },
        {
          filePath: 'src/file2.ts',
          match: {
            file: 'file2.ts',
            component: 'component2',
            lines: '30-40',
            oss_lines: '25-35',
            matched: '85%',
            purl: ['pkg:github/test/repo2'],
            version: '2.0.0',
            licenses: [{ name: 'Apache-2.0' }],
            url: 'https://example2.com'
          }
        }
      ];

      createSnippetSummaryAnnotation(snippetMatches);

      expect(mockNotice).toHaveBeenCalledWith(
        expect.stringContaining('src/file1.ts'),
        { title: 'Code Snippet Matches Summary' }
      );
      expect(mockNotice).toHaveBeenCalledWith(
        expect.stringContaining('src/file2.ts'),
        { title: 'Code Snippet Matches Summary' }
      );
      expect(mockNotice).toHaveBeenCalledWith(
        expect.stringContaining('(1 match)'),
        { title: 'Code Snippet Matches Summary' }
      );
    });

    it('should limit to 10 files and show overflow message', () => {
      const snippetMatches: SnippetMatchWithPath[] = Array.from({ length: 15 }, (_, i) => ({
        filePath: `src/file${i}.ts`,
        match: {
          file: `file${i}.ts`,
          component: `component${i}`,
          lines: '10-20',
          oss_lines: '5-15',
          matched: '80%',
          purl: ['pkg:github/test/repo'],
          version: '1.0.0',
          licenses: [{ name: 'MIT' }],
          url: 'https://example.com'
        }
      }));

      createSnippetSummaryAnnotation(snippetMatches);

      expect(mockNotice).toHaveBeenCalledWith(
        expect.stringContaining('... and 5 more files'),
        { title: 'Code Snippet Matches Summary' }
      );
    });

    it('should include line highlight in URL when lines are parseable', () => {
      const snippetMatches: SnippetMatchWithPath[] = [
        {
          filePath: 'src/test.ts',
          match: {
            file: 'test.ts',
            component: 'test-component',
            lines: '42-50',
            oss_lines: '5-15',
            matched: '80%',
            purl: ['pkg:github/test/repo'],
            version: '1.0.0',
            licenses: [{ name: 'MIT' }],
            url: 'https://example.com'
          }
        }
      ];

      createSnippetSummaryAnnotation(snippetMatches);

      expect(mockNotice).toHaveBeenCalledWith(
        expect.stringContaining('https://github.com/test-owner/test-repo/blob/abc123/src/test.ts#L42-L50'),
        { title: 'Code Snippet Matches Summary' }
      );
    });

    it('should handle single line range in URL', () => {
      const snippetMatches: SnippetMatchWithPath[] = [
        {
          filePath: 'src/test.ts',
          match: {
            file: 'test.ts',
            component: 'test-component',
            lines: '42',
            oss_lines: '5-15',
            matched: '80%',
            purl: ['pkg:github/test/repo'],
            version: '1.0.0',
            licenses: [{ name: 'MIT' }],
            url: 'https://example.com'
          }
        }
      ];

      createSnippetSummaryAnnotation(snippetMatches);

      expect(mockNotice).toHaveBeenCalledWith(
        expect.stringContaining('https://github.com/test-owner/test-repo/blob/abc123/src/test.ts#L42'),
        { title: 'Code Snippet Matches Summary' }
      );
    });

    it('should handle unparseable line ranges', () => {
      const snippetMatches: SnippetMatchWithPath[] = [
        {
          filePath: 'src/test.ts',
          match: {
            file: 'test.ts',
            component: 'test-component',
            lines: 'all',
            oss_lines: '5-15',
            matched: '80%',
            purl: ['pkg:github/test/repo'],
            version: '1.0.0',
            licenses: [{ name: 'MIT' }],
            url: 'https://example.com'
          }
        }
      ];

      createSnippetSummaryAnnotation(snippetMatches);

      // Should still create annotation without line numbers
      expect(mockNotice).toHaveBeenCalled();
    });
  });

  describe('createFileMatchSummaryAnnotation', () => {
    it('should create annotation for single file match', () => {
      const fileMatches: FileMatchWithPath[] = [
        {
          filePath: 'src/test.ts',
          match: {
            file: 'test.ts',
            component: 'test-component',
            version: '1.0.0',
            purl: ['pkg:github/test/repo'],
            licenses: [{ name: 'MIT' }],
            url: 'https://example.com'
          }
        }
      ];

      createFileMatchSummaryAnnotation(fileMatches);

      expect(mockNotice).toHaveBeenCalledWith(
        expect.stringContaining('Found 1 full file matches'),
        { title: 'Full File Matches Summary' }
      );
      expect(mockNotice).toHaveBeenCalledWith(
        expect.stringContaining('test-component v1.0.0'),
        { title: 'Full File Matches Summary' }
      );
      expect(mockInfo).toHaveBeenCalledWith('Created file match summary annotation for 1 matches');
    });

    it('should create annotation for multiple file matches', () => {
      const fileMatches: FileMatchWithPath[] = [
        {
          filePath: 'src/file1.ts',
          match: {
            file: 'file1.ts',
            component: 'component1',
            version: '1.0.0',
            purl: ['pkg:github/test/repo1'],
            licenses: [{ name: 'MIT' }],
            url: 'https://example1.com'
          }
        },
        {
          filePath: 'src/file2.ts',
          match: {
            file: 'file2.ts',
            component: 'component2',
            version: '2.0.0',
            purl: ['pkg:github/test/repo2'],
            licenses: [{ name: 'Apache-2.0' }],
            url: 'https://example2.com'
          }
        }
      ];

      createFileMatchSummaryAnnotation(fileMatches);

      expect(mockNotice).toHaveBeenCalledWith(
        expect.stringContaining('Found 2 full file matches'),
        { title: 'Full File Matches Summary' }
      );
      expect(mockNotice).toHaveBeenCalledWith(
        expect.stringContaining('component1 v1.0.0'),
        { title: 'Full File Matches Summary' }
      );
      expect(mockNotice).toHaveBeenCalledWith(
        expect.stringContaining('component2 v2.0.0'),
        { title: 'Full File Matches Summary' }
      );
    });

    it('should handle match without version', () => {
      const fileMatches: FileMatchWithPath[] = [
        {
          filePath: 'src/test.ts',
          match: {
            file: 'test.ts',
            component: 'test-component',
            purl: ['pkg:github/test/repo'],
            licenses: [{ name: 'MIT' }],
            url: 'https://example.com'
          }
        }
      ];

      createFileMatchSummaryAnnotation(fileMatches);

      expect(mockNotice).toHaveBeenCalledWith(
        expect.stringContaining('test-component\n'),
        { title: 'Full File Matches Summary' }
      );
      expect(mockNotice).toHaveBeenCalledWith(
        expect.not.stringContaining(' v'),
        { title: 'Full File Matches Summary' }
      );
    });

    it('should limit to 10 files and show overflow message', () => {
      const fileMatches: FileMatchWithPath[] = Array.from({ length: 15 }, (_, i) => ({
        filePath: `src/file${i}.ts`,
        match: {
          file: `file${i}.ts`,
          component: `component${i}`,
          version: '1.0.0',
          purl: ['pkg:github/test/repo'],
          licenses: [{ name: 'MIT' }],
          url: 'https://example.com'
        }
      }));

      createFileMatchSummaryAnnotation(fileMatches);

      expect(mockNotice).toHaveBeenCalledWith(
        expect.stringContaining('... and 5 more files'),
        { title: 'Full File Matches Summary' }
      );
    });

    it('should include commit URL', () => {
      const fileMatches: FileMatchWithPath[] = [
        {
          filePath: 'src/test.ts',
          match: {
            file: 'test.ts',
            component: 'test-component',
            version: '1.0.0',
            purl: ['pkg:github/test/repo'],
            licenses: [{ name: 'MIT' }],
            url: 'https://example.com'
          }
        }
      ];

      createFileMatchSummaryAnnotation(fileMatches);

      expect(mockNotice).toHaveBeenCalledWith(
        expect.stringContaining('https://github.com/test-owner/test-repo/commit/abc123'),
        { title: 'Full File Matches Summary' }
      );
    });

    it('should create file URLs without line numbers', () => {
      const fileMatches: FileMatchWithPath[] = [
        {
          filePath: 'src/test.ts',
          match: {
            file: 'test.ts',
            component: 'test-component',
            version: '1.0.0',
            purl: ['pkg:github/test/repo'],
            licenses: [{ name: 'MIT' }],
            url: 'https://example.com'
          }
        }
      ];

      createFileMatchSummaryAnnotation(fileMatches);

      expect(mockNotice).toHaveBeenCalledWith(
        expect.stringContaining('https://github.com/test-owner/test-repo/blob/abc123/src/test.ts)'),
        { title: 'Full File Matches Summary' }
      );
      expect(mockNotice).toHaveBeenCalledWith(
        expect.not.stringContaining('#L'),
        { title: 'Full File Matches Summary' }
      );
    });
  });
});
