// SPDX-License-Identifier: MIT
/*
   Copyright (c) 2024, SCANOSS

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
import { parseSnippetMatches } from './snippet-display.utils';

/**
 * Annotation types supported by GitHub Actions
 */
type AnnotationType = 'notice' | 'warning' | 'error';

/**
 * Interface for annotation options
 */
interface AnnotationOptions {
  type: AnnotationType;
  file: string;
  startLine?: number;
  endLine?: number;
  startColumn?: number;
  endColumn?: number;
  title?: string;
}

/**
 * Creates GitHub Actions annotations for snippet matches
 */
export function createSnippetMatchAnnotations(resultsPath: string, annotationType: AnnotationType = 'notice'): void {
  const snippets = parseSnippetMatches(resultsPath);

  if (snippets.length === 0) {
    core.debug('No snippet matches found, skipping annotations');
    return;
  }

  core.info(`Creating ${snippets.length} snippet match annotations`);

  for (const snippet of snippets) {
    const message = formatSnippetAnnotationMessage(snippet);
    const title = `${snippet.matchPercentage} match with ${snippet.component}`;

    const annotationOptions: AnnotationOptions = {
      type: annotationType,
      file: snippet.filePath,
      startLine: snippet.localLines.start,
      endLine: snippet.localLines.end,
      title
    };

    createAnnotation(message, annotationOptions);
  }
}

/**
 * Creates different types of annotations for testing purposes
 */
export function createMixedSnippetAnnotations(resultsPath: string): void {
  const snippets = parseSnippetMatches(resultsPath);

  if (snippets.length === 0) {
    core.debug('No snippet matches found for mixed annotations');
    return;
  }

  core.info(`Creating mixed annotations for ${snippets.length} snippet matches`);

  snippets.forEach(snippet => {
    const message = formatSnippetAnnotationMessage(snippet);
    const title = `${snippet.matchPercentage} match with ${snippet.component}`;

    let annotationType: AnnotationType;

    // Create different annotation types based on match percentage for testing
    const matchPercentage = parseFloat(snippet.matchPercentage.replace('%', ''));
    if (matchPercentage >= 90) {
      annotationType = 'error'; // High matches might indicate potential issues
    } else if (matchPercentage >= 70) {
      annotationType = 'warning'; // Medium matches warrant attention
    } else {
      annotationType = 'notice'; // Low matches are informational
    }

    const annotationOptions: AnnotationOptions = {
      type: annotationType,
      file: snippet.filePath,
      startLine: snippet.localLines.start,
      endLine: snippet.localLines.end,
      title: `[${annotationType.toUpperCase()}] ${title}`
    };

    createAnnotation(message, annotationOptions);
  });
}

/**
 * Formats the snippet information into an annotation message
 */
function formatSnippetAnnotationMessage(snippet: any): string {
  let message = `Code snippet matches ${snippet.component}`;

  if (snippet.version) {
    message += ` v${snippet.version}`;
  }

  message += ` (${snippet.matchPercentage} similarity)`;

  if (snippet.licenses && snippet.licenses.length > 0) {
    message += ` - License(s): ${snippet.licenses.join(', ')}`;
  }

  if (snippet.url) {
    message += ` - Source: ${snippet.url}`;
  }

  message += ` - OSS Lines: ${snippet.ossLines.start}-${snippet.ossLines.end}`;

  return message;
}

/**
 * Creates a GitHub Actions annotation using the appropriate method
 */
function createAnnotation(message: string, options: AnnotationOptions): void {
  const annotationProperties = {
    file: options.file,
    ...(options.startLine && { startLine: options.startLine }),
    ...(options.endLine && { endLine: options.endLine }),
    ...(options.startColumn && { startColumn: options.startColumn }),
    ...(options.endColumn && { endColumn: options.endColumn }),
    ...(options.title && { title: options.title })
  };

  switch (options.type) {
    case 'error':
      core.error(message, annotationProperties);
      break;
    case 'warning':
      core.warning(message, annotationProperties);
      break;
    case 'notice':
    default:
      core.notice(message, annotationProperties);
      break;
  }

  core.debug(
    `Created ${options.type} annotation for ${options.file}:${options.startLine}-${options.endLine}: ${message}`
  );
}

/**
 * Demo function to test various annotation styles
 */
export function createSnippetAnnotationDemo(resultsPath: string): void {
  core.info('🔧 Creating snippet annotation demo with various styles');

  const snippets = parseSnippetMatches(resultsPath);

  if (snippets.length === 0) {
    core.notice('No snippet matches found in results for demo');
    return;
  }

  // Take first snippet for demo
  const snippet = snippets[0];

  // Demo 1: Notice annotation (informational)
  core.notice(`Demo Notice: Found code similarity with ${snippet.component} (${snippet.matchPercentage} match)`, {
    file: snippet.filePath,
    startLine: snippet.localLines.start,
    endLine: Math.min(snippet.localLines.start + 5, snippet.localLines.end), // Show first 5 lines
    title: '📘 Code Similarity Notice'
  });

  // Demo 2: Warning annotation (attention needed)
  core.warning(`Demo Warning: High similarity detected with ${snippet.component} - review licensing requirements`, {
    file: snippet.filePath,
    startLine:
      snippet.localLines.start + 10 < snippet.localLines.end ? snippet.localLines.start + 10 : snippet.localLines.start,
    endLine: Math.min(snippet.localLines.start + 15, snippet.localLines.end),
    title: '⚠️ Licensing Review Required'
  });

  // Demo 3: Error annotation (requires action)
  core.error(
    `Demo Error: Potential license conflict detected with ${snippet.component} - immediate attention required`,
    {
      file: snippet.filePath,
      startLine:
        snippet.localLines.start + 20 < snippet.localLines.end
          ? snippet.localLines.start + 20
          : snippet.localLines.start,
      endLine: Math.min(snippet.localLines.start + 25, snippet.localLines.end),
      title: '🚨 License Conflict Alert'
    }
  );

  core.info(`Demo annotations created for ${snippet.filePath} with line ranges`);
}
