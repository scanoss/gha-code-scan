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

import * as core from '@actions/core';
import * as inputs from '../app.input';
import { SnippetMatch, LineRange } from '../types/annotations';
import { parseLineRange } from './line-parsers';

/**
 * Maximum number of characters of OSS source to inline into a comment. GitHub caps
 * comment bodies at 65,536 characters; ~10 KB leaves ample headroom for the rest of
 * the message while still showing a substantial portion of the matched code.
 */
const MAX_INLINE_CHARS = 10000;

/** Default SCANOSS host used when no custom api.url is supplied. */
const DEFAULT_API_ORIGIN = 'https://api.osskb.org';

/**
 * Maps common file extensions to a Markdown code-fence language hint for syntax highlighting.
 */
const EXTENSION_TO_LANGUAGE: Record<string, string> = {
  ts: 'ts',
  tsx: 'tsx',
  js: 'js',
  jsx: 'jsx',
  mjs: 'js',
  cjs: 'js',
  py: 'python',
  java: 'java',
  c: 'c',
  h: 'c',
  cpp: 'cpp',
  cc: 'cpp',
  hpp: 'cpp',
  cs: 'csharp',
  go: 'go',
  rs: 'rust',
  rb: 'ruby',
  php: 'php',
  swift: 'swift',
  kt: 'kotlin',
  scala: 'scala',
  sh: 'bash',
  bash: 'bash',
  json: 'json',
  yaml: 'yaml',
  yml: 'yaml',
  xml: 'xml',
  html: 'html',
  css: 'css',
  scss: 'scss',
  sql: 'sql',
  md: 'markdown'
};

/**
 * Derives the SCANOSS file_contents endpoint URL for a given file hash.
 *
 * The configured `api.url` points at the scan endpoint (e.g.
 * `https://api.osskb.org/scan/direct`); the file_contents endpoint lives at the
 * same origin under `/file_contents/{md5}`.
 */
export function getFileContentsUrl(fileHash: string): string {
  let origin = DEFAULT_API_ORIGIN;
  if (inputs.API_URL) {
    try {
      origin = new URL(inputs.API_URL).origin;
    } catch {
      origin = DEFAULT_API_ORIGIN;
    }
  }
  return `${origin}/file_contents/${fileHash}`;
}

/**
 * Resolves a Markdown code-fence language hint from a file path.
 */
function languageFromPath(filePath: string): string {
  const ext = filePath.split('.').pop()?.toLowerCase() ?? '';
  return EXTENSION_TO_LANGUAGE[ext] ?? '';
}

/**
 * Fetches the matched OSS file from the SCANOSS file_contents API and returns the
 * portion covered by `oss_lines` as a Markdown fenced code block.
 *
 * The file_contents endpoint is a premium SCANOSS feature: it requires a valid
 * `api.key` (sent as the `X-Session` header). When no key is configured, when the
 * match lacks a file hash, or when the request fails, this returns `null` and the
 * caller should fall back to the existing link/plain-text behavior.
 *
 * @param snippet - The snippet match containing `file_hash` and `oss_lines`
 * @returns A fenced code block string, or `null` when contents cannot be inlined
 */
export async function fetchOssSnippetBlock(snippet: SnippetMatch): Promise<string | null> {
  if (!snippet.file_hash) {
    core.debug('OSS file contents skipped: match has no file_hash');
    return null;
  }

  // file_contents is premium-gated; without an API key the request returns 403.
  if (!inputs.API_KEY) {
    core.debug('OSS file contents skipped: no api.key configured (premium feature)');
    return null;
  }

  const url = getFileContentsUrl(snippet.file_hash);

  let content: string;
  try {
    const response = await fetch(url, {
      headers: { 'X-Session': inputs.API_KEY }
    });

    if (!response.ok) {
      core.debug(`OSS file contents request failed for ${snippet.file_hash}: HTTP ${response.status}`);
      return null;
    }

    content = await response.text();
  } catch (error) {
    core.debug(`OSS file contents request errored for ${snippet.file_hash}: ${error}`);
    return null;
  }

  if (!content) return null;

  const lines = content.split('\n');

  // Determine the slice covered by oss_lines (1-based, inclusive). "all" yields {1,1}.
  const range: LineRange | null = parseLineRange(snippet.oss_lines);
  const isWholeFile = !range || snippet.oss_lines === 'all';

  let start = 1;
  let end = lines.length;
  if (!isWholeFile && range) {
    start = Math.max(1, range.start);
    end = Math.min(lines.length, range.end);
  }

  const selectedLines = lines.slice(start - 1, end);
  if (selectedLines.length === 0) return null;

  let selected = selectedLines.join('\n');
  let truncated = false;
  if (selected.length > MAX_INLINE_CHARS) {
    // Clip to the character budget, then back off to the last complete line so we
    // never emit a half-line of code.
    let clipped = selected.slice(0, MAX_INLINE_CHARS);
    const lastNewline = clipped.lastIndexOf('\n');
    if (lastNewline > 0) clipped = clipped.slice(0, lastNewline);
    selected = clipped;
    truncated = true;
  }

  if (!selected) return null;

  const language = languageFromPath(snippet.file);
  let block = `\n\n\`\`\`${language}\n${selected}\n\`\`\``;
  if (truncated) {
    block += `\n_Output truncated to ${MAX_INLINE_CHARS} characters._`;
  }

  return block;
}
