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

jest.mock('@actions/core', () => ({
  debug: jest.fn(),
  info: jest.fn(),
  warning: jest.fn(),
  error: jest.fn()
}));

const mockInputs = {
  API_KEY: 'test-key',
  API_URL: 'https://api.osskb.org/scan/direct'
};

jest.mock('../src/app.input', () => mockInputs);

import { fetchOssSnippetBlock, getFileContentsUrl } from '../src/utils/oss-file-contents';
import { SnippetMatch } from '../src/types/annotations';

const baseSnippet: SnippetMatch = {
  file: 'src/Folder.ts',
  component: 'scanoss',
  version: '0.4.4-beta',
  matched: '91%',
  lines: '5-62',
  oss_lines: '2-4',
  url: 'https://www.npmjs.com/package/scanoss',
  file_hash: 'abcdef123456'
};

const FILE_BODY = 'line1\nline2\nline3\nline4\nline5\n';

describe('getFileContentsUrl', () => {
  it('derives the file_contents endpoint from the configured api.url origin', () => {
    expect(getFileContentsUrl('hash123')).toBe('https://api.osskb.org/file_contents/hash123');
  });
});

describe('fetchOssSnippetBlock', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    mockInputs.API_KEY = 'test-key';
    mockInputs.API_URL = 'https://api.osskb.org/scan/direct';
    // Safety net: any test that hits fetch without setting its own mock fails
    // loudly instead of reaching the real SCANOSS endpoint.
    global.fetch = jest.fn(() => {
      throw new Error('Unexpected real fetch call - mock the response in the test');
    }) as unknown as typeof fetch;
  });

  afterEach(() => {
    global.fetch = originalFetch;
    jest.clearAllMocks();
  });

  it('returns null when no api.key is configured (premium feature)', async () => {
    mockInputs.API_KEY = '';
    const fetchSpy = jest.fn();
    global.fetch = fetchSpy as unknown as typeof fetch;

    const result = await fetchOssSnippetBlock(baseSnippet);

    expect(result).toBeNull();
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('returns null when the match has no file_hash', async () => {
    const fetchSpy = jest.fn();
    global.fetch = fetchSpy as unknown as typeof fetch;

    const result = await fetchOssSnippetBlock({ ...baseSnippet, file_hash: undefined });

    expect(result).toBeNull();
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('returns null and does not throw when the request fails (e.g. 403)', async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: false, status: 403 }) as unknown as typeof fetch;

    const result = await fetchOssSnippetBlock(baseSnippet);

    expect(result).toBeNull();
  });

  it('returns null when fetch throws', async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error('network')) as unknown as typeof fetch;

    const result = await fetchOssSnippetBlock(baseSnippet);

    expect(result).toBeNull();
  });

  it('inlines the oss_lines slice as a fenced code block with language hint', async () => {
    const fetchSpy = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: async () => FILE_BODY
    });
    global.fetch = fetchSpy as unknown as typeof fetch;

    const result = await fetchOssSnippetBlock(baseSnippet);

    // oss_lines '2-4' -> lines 2,3,4
    expect(result).toBe('\n\n```ts\nline2\nline3\nline4\n```');
    expect(fetchSpy).toHaveBeenCalledWith('https://api.osskb.org/file_contents/abcdef123456', {
      headers: { 'X-Session': 'test-key' }
    });
  });

  it('truncates output exceeding the character budget and notes the truncation', async () => {
    // 500 lines of 50 chars each (~25 KB) far exceeds the 10 KB budget.
    const body = Array.from({ length: 500 }, () => 'x'.repeat(50)).join('\n');
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: async () => body
    }) as unknown as typeof fetch;

    const result = await fetchOssSnippetBlock({ ...baseSnippet, oss_lines: 'all' });

    expect(result).toContain('Output truncated to 10000 characters');
    // The fenced code body stays within the budget...
    const fenced = (result ?? '').split('```')[1].replace(/^ts\n/, '').trimEnd();
    expect(fenced.length).toBeLessThanOrEqual(10000);
    // ...and is clipped at a line boundary (the last full line is intact)
    expect(fenced.endsWith('x')).toBe(true);
    expect(fenced.split('\n').every(line => line === 'x'.repeat(50))).toBe(true);
  });
});
