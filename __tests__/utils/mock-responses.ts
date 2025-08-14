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

import { ExecOutput } from '@actions/exec';

export const mockScanResponses = {
  // Mock response for successful scan with dependencies
  scanSuccessWithDependencies: {
    "package.json": [
      {
        "dependencies": [
          {
            "component": "@grpc/grpc-js",
            "licenses": [
              {
                "is_spdx_approved": true,
                "name": "Apache-2.0",
                "spdx_id": "Apache-2.0"
              }
            ],
            "purl": "pkg:npm/%40grpc/grpc-js",
            "url": "https://www.npmjs.com/package/%40grpc/grpc-js",
            "version": "1.12.2"
          },
          {
            "component": "abort-controller",
            "licenses": [
              {
                "is_spdx_approved": true,
                "name": "MIT",
                "spdx_id": "MIT"
              }
            ],
            "purl": "pkg:npm/abort-controller",
            "url": "https://www.npmjs.com/package/abort-controller",
            "version": "3.0.0"
          }
        ],
        "id": "dependency",
        "status": "pending"
      }
    ]
  },

  // Mock response for empty scan results
  scanEmpty: {},

  // Mock responses for policy checks
  copyleftViolationsFound: {
    stdout: `# Copyleft Policy Check Report

## Summary
Found 2 components with copyleft licenses that violate the policy.

## Violations
| File | Component | License | Copyleft |
|------|-----------|---------|----------|
| crc32c.c | wfp@6afc1f6 | GPL-2.0-only | Yes |
| json.c | scanner.c@1.3.3 | GPL-2.0-only | Yes |

## Recommendation
Review these components and consider replacing them with non-copyleft alternatives or ensure compliance with GPL-2.0-only license terms.`,
    stderr: 'Policy check completed with violations found',
    exitCode: 2
  } as ExecOutput,

  copyleftNoViolations: {
    stdout: `# Copyleft Policy Check Report

## Summary
✅ No copyleft license violations found.

All detected licenses comply with your copyleft policy settings.`,
    stderr: '',
    exitCode: 0
  } as ExecOutput,

  copyleftExplicitLicenseViolations: {
    stdout: '## License Policy Violations\n\n- GPL-2.0-only license found but not in explicit allow list\n- BSD-2-Clause license found but not in explicit allow list',
    stderr: 'License violations detected - only MIT,Apache-2.0 allowed',
    exitCode: 2
  } as ExecOutput,

  undeclaredComponentsFound: {
    stdout: `# Undeclared Components Report

## Summary
Found 2 undeclared components in scan results.

## Undeclared Components
| File | Component | Version | PURL |
|------|-----------|---------|------|
| crc32c.c | wfp | 6afc1f6 | pkg:github/scanoss/wfp |
| json.c | scanner.c | 1.3.3 | pkg:github/scanoss/scanner.c |

## Recommendation
Add these components to your SBOM or dependency manifest files to ensure proper tracking and compliance.`,
    stderr: 'Undeclared components detected in scan results',
    exitCode: 2
  } as ExecOutput,

  undeclaredNoComponents: {
    stdout: `# Undeclared Components Report

## Summary
✅ No undeclared components found.

All detected components are properly declared in your SBOM.`,
    stderr: '',
    exitCode: 0
  } as ExecOutput,

  dependencyTrackViolations: {
    stdout: `# Dependency Track Policy Violations

## High Risk Vulnerabilities
- CVE-2023-1234: Critical vulnerability in package xyz
- CVE-2023-5678: High severity issue in component abc

## Policy Violations
- License violation: GPL-3.0 not allowed
- Outdated dependency: package-old v1.0.0`,
    stderr: 'Policy violations detected',
    exitCode: 2
  } as ExecOutput,

  dependencyTrackNoViolations: {
    stdout: 'No policy violations found',
    stderr: 'no violations found',
    exitCode: 0
  } as ExecOutput,

  dependencyTrackConnectionError: {
    stdout: '',
    stderr: 'Connection to Dependency Track failed',
    exitCode: 1
  } as ExecOutput
};

// GitHub API mocks that can be reused
export const mockGitHubApi = () => ({
  context: {
    repo: { owner: 'mock-owner', repo: 'mock-repo' },
    serverUrl: 'github',
    runId: 12345678
  },
  getOctokit: jest.fn().mockReturnValue({
    rest: {
      checks: {
        update: jest.fn().mockResolvedValue({}),
        create: jest.fn().mockReturnValue({
          data: {
            id: 1,
            url: 'https://api.github.com/repos/mock-owner/mock-repo/check-runs/1'
          }
        })
      },
      actions: {
        uploadArtifact: jest.fn().mockResolvedValue({
          data: { id: 123456, url: 'https://api.github.com/artifact/123456' }
        })
      }
    }
  })
});

// App input mocks that can be reused
export const mockAppInput = () => ({
  ...jest.requireActual('../src/app.input'),
  REPO_DIR: '',
  OUTPUT_FILEPATH: 'results.json',
  COPYLEFT_LICENSE_EXCLUDE: '',
  COPYLEFT_LICENSE_EXPLICIT: '',
  COPYLEFT_LICENSE_INCLUDE: '',
  DEPENDENCY_TRACK_URL: 'https://dep-track.example.com',
  DEPENDENCY_TRACK_API_KEY: 'test-api-key',
  DEPENDENCY_TRACK_PROJECT_ID: 'test-project-id'
});