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

import { resolveSettingsPath, resolveScanPath, getScanPathSuffix } from '../src/utils/path.utils';

describe('Path Utils', () => {
  describe('resolveSettingsPath', () => {
    const repoDir = '/repo';

    describe('with relative settings path', () => {
      it('should resolve settings path when scanning root directory', () => {
        const result = resolveSettingsPath('scanoss.json', '.', repoDir);
        expect(result.fullPath).toBe('/repo/scanoss.json');
        expect(result.githubPath).toBe('scanoss.json');
      });

      it('should resolve settings path when scanning subfolder', () => {
        const result = resolveSettingsPath('scanoss.json', 'src/api', repoDir);
        expect(result.fullPath).toBe('/repo/src/api/scanoss.json');
        expect(result.githubPath).toBe('src/api/scanoss.json');
      });

      it('should handle nested subfolder paths', () => {
        const result = resolveSettingsPath('config.json', 'packages/frontend/lib', repoDir);
        expect(result.fullPath).toBe('/repo/packages/frontend/lib/config.json');
        expect(result.githubPath).toBe('packages/frontend/lib/config.json');
      });

      it('should normalize backslashes to forward slashes in githubPath', () => {
        // Simulate Windows-style path.join result by providing pre-joined path
        const result = resolveSettingsPath('scanoss.json', 'src\\api', repoDir);
        // The githubPath should normalize backslashes
        expect(result.githubPath).not.toContain('\\');
        expect(result.githubPath).toContain('/');
      });
    });

    describe('with absolute settings path', () => {
      it('should use absolute path as-is for fullPath', () => {
        const result = resolveSettingsPath('/custom/path/scanoss.json', 'src', repoDir);
        expect(result.fullPath).toBe('/custom/path/scanoss.json');
      });

      it('should calculate relative path from repo root for githubPath', () => {
        const result = resolveSettingsPath('/repo/src/scanoss.json', 'packages', repoDir);
        expect(result.githubPath).toBe('src/scanoss.json');
      });

      it('should normalize backslashes in absolute path resolution', () => {
        const result = resolveSettingsPath('/repo/src/scanoss.json', 'src', repoDir);
        expect(result.githubPath).not.toContain('\\');
      });
    });

    describe('edge cases', () => {
      it('should handle empty scan path', () => {
        const result = resolveSettingsPath('scanoss.json', '', repoDir);
        expect(result.fullPath).toBe('/repo/scanoss.json');
        expect(result.githubPath).toBe('scanoss.json');
      });

      it('should handle settings file in subdirectory relative to scan path', () => {
        const result = resolveSettingsPath('config/scanoss.json', 'src', repoDir);
        expect(result.fullPath).toBe('/repo/src/config/scanoss.json');
        expect(result.githubPath).toBe('src/config/scanoss.json');
      });
    });
  });

  describe('resolveScanPath', () => {
    describe('when scanning root directory', () => {
      it('should return path unchanged when scanPath is "."', () => {
        expect(resolveScanPath('file.c', '.')).toBe('file.c');
        expect(resolveScanPath('src/file.c', '.')).toBe('src/file.c');
      });

      it('should return path unchanged when scanPath is empty', () => {
        expect(resolveScanPath('file.c', '')).toBe('file.c');
      });

      it('should return path unchanged when scanPath is undefined', () => {
        expect(resolveScanPath('file.c', undefined as any)).toBe('file.c');
      });
    });

    describe('when scanning subfolder', () => {
      it('should prepend scan path to file path', () => {
        expect(resolveScanPath('file.c', 'src')).toBe('src/file.c');
      });

      it('should handle nested scan paths', () => {
        expect(resolveScanPath('file.c', 'packages/api/lib')).toBe('packages/api/lib/file.c');
      });

      it('should handle file paths with subdirectories', () => {
        expect(resolveScanPath('util/helper.c', 'src/api')).toBe('src/api/util/helper.c');
      });

      it('should normalize backslashes to forward slashes', () => {
        const result = resolveScanPath('file.c', 'src\\api');
        expect(result).not.toContain('\\');
        expect(result).toContain('/');
      });
    });

    describe('cross-platform compatibility', () => {
      it('should produce consistent results regardless of path separators', () => {
        // Both should produce same result with forward slashes
        const withForward = resolveScanPath('file.c', 'src/api');
        const withBackward = resolveScanPath('file.c', 'src\\api');

        expect(withForward).toBe('src/api/file.c');
        expect(withBackward).toBe('src/api/file.c');
      });
    });
  });

  describe('getScanPathSuffix', () => {
    it('should return empty string for root directory (".")', () => {
      expect(getScanPathSuffix('.')).toBe('');
    });

    it('should return empty string for empty scan path', () => {
      expect(getScanPathSuffix('')).toBe('');
    });

    it('should return formatted suffix for single-level path', () => {
      expect(getScanPathSuffix('src')).toBe(' (📁 `src`)');
    });

    it('should return formatted suffix for nested path', () => {
      expect(getScanPathSuffix('packages/api/lib')).toBe(' (📁 `packages/api/lib`)');
    });

    it('should handle paths with special characters', () => {
      expect(getScanPathSuffix('src-v2')).toBe(' (📁 `src-v2`)');
      expect(getScanPathSuffix('packages.new')).toBe(' (📁 `packages.new`)');
    });

    it('should return consistent format with folder emoji', () => {
      const result = getScanPathSuffix('src');
      expect(result).toMatch(/^\s\(📁\s`.*`\)$/);
    });
  });
});