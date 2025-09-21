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

export type ScannerResults = Record<string, ScannerComponent[] | DependencyComponent[]>;

export enum ComponentID {
  NONE = 'none',
  FILE = 'file',
  SNIPPET = 'snippet',
  DEPENDENCY = 'dependency'
}

interface CommonComponent {
  id: ComponentID;
  status: string;
}

export interface DependencyComponent extends CommonComponent {
  dependencies: {
    licenses: {
      is_spdx_approved: boolean;
      name: string;
      spdx_id: string;
    }[];
    purl: string;
    url: string;
    version: string;
  }[];
}

export interface ScannerComponent extends CommonComponent {
  lines: string;
  oss_lines: string;
  matched: string;
  purl: string[];
  vendor: string;
  component: string;
  version: string;
  latest: string;
  url: string;
  release_date: string;
  file: string;
  url_hash: string;
  file_hash: string;
  source_hash: string;
  file_url: string;
  licenses: {
    name: string;
    patent_hints: string;
    copyleft: string;
    checklist_url: string;
    osadl_updated: string;
    source: string;
    incompatible_with?: string;
    url: string;
  }[];
  dependencies: {
    vendor: string;
    component: string;
    version: string;
    source: string;
  }[];
  copyrights: {
    name: string;
    source: string;
  }[];
  vulnerabilities: {
    ID: string;
    CVE: string;
    severity: string;
    reported: string;
    introduced: string;
    patched: string;
    summary: string;
    source: string;
  }[];
  quality: {
    score: string;
    source: string;
  }[];
  cryptography: {
    algorithm: string;
    strength: string;
  }[];
  health: {
    creation_date: string;
    issues: number;
    last_push: string;
    last_update: string;
    watchers: number;
    country: string;
    stars: number;
    forks: number;
  };
  server: {
    version: string;
    kb_version: { monthly: string; daily: string };
    hostname: string;
    flags: string;
    elapsed: string;
  };
}
