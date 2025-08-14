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

import { DefaultArtifactClient, UploadArtifactResponse } from '@actions/artifact';
import path from 'path';

const MAX_GH_API_CONTENT_SIZE = 65534;
const CHARACTERS_BUFFER = 50;

/**
 * Checks if content exceeds GitHub API character limits for check runs.
 */
export function isOverMaxCharacterLimitAPI(content: string): boolean {
  return content.length >= MAX_GH_API_CONTENT_SIZE - CHARACTERS_BUFFER;
}

/**
 * Uploads a file to GitHub Actions artifacts.
 */
export async function uploadToArtifacts(artifactName: string): Promise<UploadArtifactResponse> {
  const artifact = new DefaultArtifactClient();
  return await artifact.uploadArtifact(path.basename(artifactName), [artifactName], path.dirname(artifactName));
}
