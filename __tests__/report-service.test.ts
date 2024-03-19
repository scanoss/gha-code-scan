import * as github from '@actions/github';
import * as core from '@actions/core';

import { generateJobSummary, generatePRSummary } from '../src/services/report.service';

const tableTest = [
  {
    name: '1) report test',
    scannerResults: `{                                                                                                                                                                                                                       
      "aaaaa.c": [                                                                                                                                                                                                          
        {                                                                                                                                                                                                                   
          "component": "engine",                                                                                                                                                                                            
          "file": "cryptography.c",                                                                                                                                                                                         
          "file_hash": "45931442719d401103ab8bcbbca1af99",
          "file_url": "https://osskb.org/api/file_contents/45931442719d401103ab8bcbbca1af99",
          "id": "snippet",
          "latest": "5.3.5",
          "licenses": [
            {
              "checklist_url": "https://www.osadl.org/fileadmin/checklists/unreflicenses/GPL-2.0-only.txt",
              "copyleft": "yes",
              "incompatible_with": "Apache-1.0,Apache-1.1,Apache-2.0,BSD-4-Clause,BSD-4-Clause-UC,FTL,IJG,OpenSSL,Python-2.0,zlib-acknowledgement,XFree86-1.1",
              "name": "GPL-2.0-only",
              "osadl_updated": "2024-01-21T05:27:00+00:00",
              "patent_hints": "yes",
              "source": "component_declared",
              "url": "https://spdx.org/licenses/GPL-2.0-only.html"
            },
            {
              "checklist_url": "https://www.osadl.org/fileadmin/checklists/unreflicenses/GPL-2.0-or-later.txt",
              "copyleft": "yes",
              "incompatible_with": "Apache-1.0,Apache-1.1,Apache-2.0,BSD-4-Clause,BSD-4-Clause-UC,FTL,IJG,OpenSSL,Python-2.0,zlib-acknowledgement,XFree86-1.1",
              "name": "GPL-2.0-or-later",
              "osadl_updated": "2024-01-21T05:27:00+00:00",
              "patent_hints": "yes",
              "source": "file_spdx_tag",
              "url": "https://spdx.org/licenses/GPL-2.0-or-later.html"
            },
            {
              "checklist_url": "https://www.osadl.org/fileadmin/checklists/unreflicenses/GPL-2.0-only.txt",
              "copyleft": "yes",
              "incompatible_with": "Apache-1.0,Apache-1.1,Apache-2.0,BSD-4-Clause,BSD-4-Clause-UC,FTL,IJG,OpenSSL,Python-2.0,zlib-acknowledgement,XFree86-1.1",
              "name": "GPL-2.0-only",
              "osadl_updated": "2024-01-21T05:27:00+00:00",
              "patent_hints": "yes",
              "source": "license_file",
              "url": "https://spdx.org/licenses/GPL-2.0-only.html"
            }
          ],
          "lines": "1-37",
          "matched": "97%",
          "oss_lines": "33-69",
          "purl": [
            "pkg:github/scanoss/engine"
          ],
          "release_date": "2022-09-26",
          "server": {
            "kb_version": {
              "daily": "24.01.22",
              "monthly": "23.12"
            },
            "version": "5.3.5"
          },
          "source_hash": "aefc7383cccb35ecf8994c49d17c69be",
          "status": "pending",
          "url": "https://github.com/scanoss/engine",
          "url_hash": "d6492e2364b3b7793773edf28a372c75",
          "vendor": "scanoss",
          "version": "5.0.0"
        }
      ],
      "attributions.c": [
        {
          "component": "engine",
          "file": "attributions.c",
          "file_hash": "4dd9a878731a51b612fedde5ad5d6084",
          "file_url": "https://osskb.org/api/file_contents/4dd9a878731a51b612fedde5ad5d6084",
          "id": "file",
          "latest": "5.3.4",
          "licenses": [
            {
              "checklist_url": "https://www.osadl.org/fileadmin/checklists/unreflicenses/GPL-2.0-only.txt",
              "copyleft": "yes",
              "incompatible_with": "Apache-1.0,Apache-1.1,Apache-2.0,BSD-4-Clause,BSD-4-Clause-UC,FTL,IJG,OpenSSL,Python-2.0,zlib-acknowledgement,XFree86-1.1",
              "name": "GPL-2.0-only",
              "osadl_updated": "2024-01-21T05:27:00+00:00",
              "patent_hints": "yes",
              "source": "component_declared",
              "url": "https://spdx.org/licenses/GPL-2.0-only.html"
            },
            {
              "name": "JSON",
              "source": "scancode",
              "url": "https://spdx.org/licenses/JSON.html"
            },
            {
              "name": "LicenseRef-scancode-unknown-license-reference",
              "source": "scancode"
            },
            {
              "checklist_url": "https://www.osadl.org/fileadmin/checklists/unreflicenses/GPL-2.0-or-later.txt",
              "copyleft": "yes",
              "incompatible_with": "Apache-1.0,Apache-1.1,Apache-2.0,BSD-4-Clause,BSD-4-Clause-UC,FTL,IJG,OpenSSL,Python-2.0,zlib-acknowledgement,XFree86-1.1",
              "name": "GPL-2.0-or-later",
              "osadl_updated": "2024-01-21T05:27:00+00:00",
              "patent_hints": "yes",
              "source": "scancode",
              "url": "https://spdx.org/licenses/GPL-2.0-or-later.html"
            },
            {
              "checklist_url": "https://www.osadl.org/fileadmin/checklists/unreflicenses/GPL-2.0-or-later.txt",
              "copyleft": "yes",
              "incompatible_with": "Apache-1.0,Apache-1.1,Apache-2.0,BSD-4-Clause,BSD-4-Clause-UC,FTL,IJG,OpenSSL,Python-2.0,zlib-acknowledgement,XFree86-1.1",
              "name": "GPL-2.0-or-later",
              "osadl_updated": "2024-01-21T05:27:00+00:00",
              "patent_hints": "yes",
              "source": "file_spdx_tag",
              "url": "https://spdx.org/licenses/GPL-2.0-or-later.html"
            },
            {
              "checklist_url": "https://www.osadl.org/fileadmin/checklists/unreflicenses/GPL-2.0-only.txt",
              "copyleft": "yes",
              "incompatible_with": "Apache-1.0,Apache-1.1,Apache-2.0,BSD-4-Clause,BSD-4-Clause-UC,FTL,IJG,OpenSSL,Python-2.0,zlib-acknowledgement,XFree86-1.1",
              "name": "GPL-2.0-only",
              "osadl_updated": "2024-01-21T05:27:00+00:00",
              "patent_hints": "yes",
              "source": "license_file",
              "url": "https://spdx.org/licenses/GPL-2.0-only.html"
            }
          ],
          "lines": "all",
          "matched": "100%",
          "oss_lines": "all",
          "purl": [
            "pkg:github/scanoss/engine"
          ],
          "release_date": "2022-12-29",
          "server": {
            "kb_version": {
              "daily": "24.01.22",
              "monthly": "23.12"
            },
            "version": "5.3.5"
          },
          "source_hash": "4dd9a878731a51b612fedde5ad5d6084",
          "status": "pending",
          "url": "https://github.com/scanoss/engine",
          "url_hash": "587fc14ceb8fdd57727a2ab98d707916",
          "vendor": "scanoss",
          "version": "5.1.1"
        }
      ],
      "binary_scan.c": [
        {
          "component": "engine",
          "file": "binary_scan.c",
          "file_hash": "0d27d55d1134cbdaa1536babdff219f5",
          "file_url": "https://osskb.org/api/file_contents/0d27d55d1134cbdaa1536babdff219f5",
          "id": "file",
          "latest": "5.3.5",
          "licenses": [
            {
              "checklist_url": "https://www.osadl.org/fileadmin/checklists/unreflicenses/GPL-2.0-only.txt",
              "copyleft": "yes",
              "incompatible_with": "Apache-1.0,Apache-1.1,Apache-2.0,BSD-4-Clause,BSD-4-Clause-UC,FTL,IJG,OpenSSL,Python-2.0,zlib-acknowledgement,XFree86-1.1",
              "name": "GPL-2.0-only",
              "osadl_updated": "2024-01-21T05:27:00+00:00",
              "patent_hints": "yes",
              "source": "component_declared",
              "url": "https://spdx.org/licenses/GPL-2.0-only.html"
            },
            {
              "checklist_url": "https://www.osadl.org/fileadmin/checklists/unreflicenses/GPL-2.0-or-later.txt",
              "copyleft": "yes",
              "incompatible_with": "Apache-1.0,Apache-1.1,Apache-2.0,BSD-4-Clause,BSD-4-Clause-UC,FTL,IJG,OpenSSL,Python-2.0,zlib-acknowledgement,XFree86-1.1",
              "name": "GPL-2.0-or-later",
              "osadl_updated": "2024-01-21T05:27:00+00:00",
              "patent_hints": "yes",
              "source": "file_spdx_tag",
              "url": "https://spdx.org/licenses/GPL-2.0-or-later.html"
            },
            {
              "checklist_url": "https://www.osadl.org/fileadmin/checklists/unreflicenses/GPL-2.0-or-later.txt",
              "copyleft": "yes",
              "incompatible_with": "Apache-1.0,Apache-1.1,Apache-2.0,BSD-4-Clause,BSD-4-Clause-UC,FTL,IJG,OpenSSL,Python-2.0,zlib-acknowledgement,XFree86-1.1",
              "name": "GPL-2.0-or-later",
              "osadl_updated": "2024-01-21T05:27:00+00:00",
              "patent_hints": "yes",
              "source": "scancode",
              "url": "https://spdx.org/licenses/GPL-2.0-or-later.html"
            },
            {
              "checklist_url": "https://www.osadl.org/fileadmin/checklists/unreflicenses/GPL-2.0-only.txt",
              "copyleft": "yes",
              "incompatible_with": "Apache-1.0,Apache-1.1,Apache-2.0,BSD-4-Clause,BSD-4-Clause-UC,FTL,IJG,OpenSSL,Python-2.0,zlib-acknowledgement,XFree86-1.1",
              "name": "GPL-2.0-only",
              "osadl_updated": "2024-01-21T05:27:00+00:00",
              "patent_hints": "yes",
              "source": "license_file",
              "url": "https://spdx.org/licenses/GPL-2.0-only.html"
            }
          ],
          "lines": "all",
          "matched": "100%",
          "oss_lines": "all",
          "purl": [
            "pkg:github/scanoss/engine"
          ],
          "release_date": "2022-12-29",
          "server": {
            "kb_version": {
              "daily": "24.01.22",
              "monthly": "23.12"
            },
            "version": "5.3.5"
          },
          "source_hash": "0d27d55d1134cbdaa1536babdff219f5",
          "status": "pending",
          "url": "https://github.com/scanoss/engine",
          "url_hash": "587fc14ceb8fdd57727a2ab98d707916",
          "vendor": "scanoss",
          "version": "5.1.1"
        }
      ],
      "component.c": [
        {
          "component": "engine",
          "file": "component.c",
          "file_hash": "6852eb3bc69f70a15064645ad24446a2",
          "file_url": "https://osskb.org/api/file_contents/6852eb3bc69f70a15064645ad24446a2",
          "id": "file",
          "latest": "5.3.5",
          "licenses": [
            {
              "checklist_url": "https://www.osadl.org/fileadmin/checklists/unreflicenses/GPL-2.0-only.txt",
              "copyleft": "yes",
              "incompatible_with": "Apache-1.0,Apache-1.1,Apache-2.0,BSD-4-Clause,BSD-4-Clause-UC,FTL,IJG,OpenSSL,Python-2.0,zlib-acknowledgement,XFree86-1.1",
              "name": "GPL-2.0-only",
              "osadl_updated": "2024-01-21T05:27:00+00:00",
              "patent_hints": "yes",
              "source": "component_declared",
              "url": "https://spdx.org/licenses/GPL-2.0-only.html"
            },
            {
              "checklist_url": "https://www.osadl.org/fileadmin/checklists/unreflicenses/GPL-2.0-or-later.txt",
              "copyleft": "yes",
              "incompatible_with": "Apache-1.0,Apache-1.1,Apache-2.0,BSD-4-Clause,BSD-4-Clause-UC,FTL,IJG,OpenSSL,Python-2.0,zlib-acknowledgement,XFree86-1.1",
              "name": "GPL-2.0-or-later",
              "osadl_updated": "2024-01-21T05:27:00+00:00",
              "patent_hints": "yes",
              "source": "file_spdx_tag",
              "url": "https://spdx.org/licenses/GPL-2.0-or-later.html"
            },
            {
              "checklist_url": "https://www.osadl.org/fileadmin/checklists/unreflicenses/GPL-2.0-only.txt",
              "copyleft": "yes",
              "incompatible_with": "Apache-1.0,Apache-1.1,Apache-2.0,BSD-4-Clause,BSD-4-Clause-UC,FTL,IJG,OpenSSL,Python-2.0,zlib-acknowledgement,XFree86-1.1",
              "name": "GPL-2.0-only",
              "osadl_updated": "2024-01-21T05:27:00+00:00",
              "patent_hints": "yes",
              "source": "license_file",
              "url": "https://spdx.org/licenses/GPL-2.0-only.html"
            }
          ],
          "lines": "all",
          "matched": "100%",
          "oss_lines": "all",
          "purl": [
            "pkg:github/scanoss/engine"
          ],
          "release_date": "2023-06-05",
          "server": {
            "kb_version": {
              "daily": "24.01.22",
              "monthly": "23.12"
            },
            "version": "5.3.5"
          },
          "source_hash": "6852eb3bc69f70a15064645ad24446a2",
          "status": "pending",
          "url": "https://github.com/scanoss/engine",
          "url_hash": "1170a6175564e85c6877886e5ca565b2",
          "vendor": "scanoss",
          "version": "5.2.6"
        }
      ],
      "copyright.c": [
        {
          "component": "engine",
          "file": "copyright.c",
          "file_hash": "e5965a5937743a78129b73b4171961e9",
          "file_url": "https://osskb.org/api/file_contents/e5965a5937743a78129b73b4171961e9",
          "id": "file",
          "latest": "5.3.5",
          "licenses": [
            {
              "checklist_url": "https://www.osadl.org/fileadmin/checklists/unreflicenses/GPL-2.0-only.txt",
              "copyleft": "yes",
              "incompatible_with": "Apache-1.0,Apache-1.1,Apache-2.0,BSD-4-Clause,BSD-4-Clause-UC,FTL,IJG,OpenSSL,Python-2.0,zlib-acknowledgement,XFree86-1.1",
              "name": "GPL-2.0-only",
              "osadl_updated": "2024-01-21T05:27:00+00:00",
              "patent_hints": "yes",
              "source": "component_declared",
              "url": "https://spdx.org/licenses/GPL-2.0-only.html"
            },
            {
              "checklist_url": "https://www.osadl.org/fileadmin/checklists/unreflicenses/GPL-2.0-or-later.txt",
              "copyleft": "yes",
              "incompatible_with": "Apache-1.0,Apache-1.1,Apache-2.0,BSD-4-Clause,BSD-4-Clause-UC,FTL,IJG,OpenSSL,Python-2.0,zlib-acknowledgement,XFree86-1.1",
              "name": "GPL-2.0-or-later",
              "osadl_updated": "2024-01-21T05:27:00+00:00",
              "patent_hints": "yes",
              "source": "scancode",
              "url": "https://spdx.org/licenses/GPL-2.0-or-later.html"
            },
            {
              "checklist_url": "https://www.osadl.org/fileadmin/checklists/unreflicenses/GPL-2.0-or-later.txt",
              "copyleft": "yes",
              "incompatible_with": "Apache-1.0,Apache-1.1,Apache-2.0,BSD-4-Clause,BSD-4-Clause-UC,FTL,IJG,OpenSSL,Python-2.0,zlib-acknowledgement,XFree86-1.1",
              "name": "GPL-2.0-or-later",
              "osadl_updated": "2024-01-21T05:27:00+00:00",
              "patent_hints": "yes",
              "source": "file_spdx_tag",
              "url": "https://spdx.org/licenses/GPL-2.0-or-later.html"
            },
            {
              "checklist_url": "https://www.osadl.org/fileadmin/checklists/unreflicenses/GPL-2.0-only.txt",
              "copyleft": "yes",
              "incompatible_with": "Apache-1.0,Apache-1.1,Apache-2.0,BSD-4-Clause,BSD-4-Clause-UC,FTL,IJG,OpenSSL,Python-2.0,zlib-acknowledgement,XFree86-1.1",
              "name": "GPL-2.0-only",
              "osadl_updated": "2024-01-21T05:27:00+00:00",
              "patent_hints": "yes",
              "source": "license_file",
              "url": "https://spdx.org/licenses/GPL-2.0-only.html"
            }
          ],
          "lines": "all",
          "matched": "100%",
          "oss_lines": "all",
          "purl": [
            "pkg:github/scanoss/engine"
          ],
          "release_date": "2022-12-29",
          "server": {
            "kb_version": {
              "daily": "24.01.22",
              "monthly": "23.12"
            },
            "version": "5.3.5"
          },
          "source_hash": "e5965a5937743a78129b73b4171961e9",
          "status": "pending",
          "url": "https://github.com/scanoss/engine",
          "url_hash": "587fc14ceb8fdd57727a2ab98d707916",
          "vendor": "scanoss",
          "version": "5.1.1"
        }
      ],
      "cryptography.c": [
        {
          "component": "engine",
          "file": "cryptography.c",
          "file_hash": "45931442719d401103ab8bcbbca1af99",
          "file_url": "https://osskb.org/api/file_contents/45931442719d401103ab8bcbbca1af99",
          "id": "file",
          "latest": "5.3.5",
          "licenses": [
            {
              "checklist_url": "https://www.osadl.org/fileadmin/checklists/unreflicenses/GPL-2.0-only.txt",
              "copyleft": "yes",
              "incompatible_with": "Apache-1.0,Apache-1.1,Apache-2.0,BSD-4-Clause,BSD-4-Clause-UC,FTL,IJG,OpenSSL,Python-2.0,zlib-acknowledgement,XFree86-1.1",
              "name": "GPL-2.0-only",
              "osadl_updated": "2024-01-21T05:27:00+00:00",
              "patent_hints": "yes",
              "source": "component_declared",
              "url": "https://spdx.org/licenses/GPL-2.0-only.html"
            },
            {
              "checklist_url": "https://www.osadl.org/fileadmin/checklists/unreflicenses/GPL-2.0-or-later.txt",
              "copyleft": "yes",
              "incompatible_with": "Apache-1.0,Apache-1.1,Apache-2.0,BSD-4-Clause,BSD-4-Clause-UC,FTL,IJG,OpenSSL,Python-2.0,zlib-acknowledgement,XFree86-1.1",
              "name": "GPL-2.0-or-later",
              "osadl_updated": "2024-01-21T05:27:00+00:00",
              "patent_hints": "yes",
              "source": "file_spdx_tag",
              "url": "https://spdx.org/licenses/GPL-2.0-or-later.html"
            },
            {
              "checklist_url": "https://www.osadl.org/fileadmin/checklists/unreflicenses/GPL-2.0-only.txt",
              "copyleft": "yes",
              "incompatible_with": "Apache-1.0,Apache-1.1,Apache-2.0,BSD-4-Clause,BSD-4-Clause-UC,FTL,IJG,OpenSSL,Python-2.0,zlib-acknowledgement,XFree86-1.1",
              "name": "GPL-2.0-only",
              "osadl_updated": "2024-01-21T05:27:00+00:00",
              "patent_hints": "yes",
              "source": "license_file",
              "url": "https://spdx.org/licenses/GPL-2.0-only.html"
            }
          ],
          "lines": "all",
          "matched": "100%",
          "oss_lines": "all",
          "purl": [
            "pkg:github/scanoss/engine"
          ],
          "release_date": "2022-09-26",
          "server": {
            "kb_version": {
              "daily": "24.01.22",
              "monthly": "23.12"
            },
            "version": "5.3.5"
          },
          "source_hash": "45931442719d401103ab8bcbbca1af99",
          "status": "pending",
          "url": "https://github.com/scanoss/engine",
          "url_hash": "d6492e2364b3b7793773edf28a372c75",
          "vendor": "scanoss",
          "version": "5.0.0"
        }
      ],
      "debug.c": [
        {
          "component": "engine",
          "file": "debug.c",
          "file_hash": "5adbcacf687f26596731900c07570673",
          "file_url": "https://osskb.org/api/file_contents/5adbcacf687f26596731900c07570673",
          "id": "file",
          "latest": "5.3.4",
          "licenses": [
            {
              "checklist_url": "https://www.osadl.org/fileadmin/checklists/unreflicenses/GPL-2.0-only.txt",
              "copyleft": "yes",
              "incompatible_with": "Apache-1.0,Apache-1.1,Apache-2.0,BSD-4-Clause,BSD-4-Clause-UC,FTL,IJG,OpenSSL,Python-2.0,zlib-acknowledgement,XFree86-1.1",
              "name": "GPL-2.0-only",
              "osadl_updated": "2024-01-21T05:27:00+00:00",
              "patent_hints": "yes",
              "source": "component_declared",
              "url": "https://spdx.org/licenses/GPL-2.0-only.html"
            },
            {
              "checklist_url": "https://www.osadl.org/fileadmin/checklists/unreflicenses/GPL-2.0-or-later.txt",
              "copyleft": "yes",
              "incompatible_with": "Apache-1.0,Apache-1.1,Apache-2.0,BSD-4-Clause,BSD-4-Clause-UC,FTL,IJG,OpenSSL,Python-2.0,zlib-acknowledgement,XFree86-1.1",
              "name": "GPL-2.0-or-later",
              "osadl_updated": "2024-01-21T05:27:00+00:00",
              "patent_hints": "yes",
              "source": "file_spdx_tag",
              "url": "https://spdx.org/licenses/GPL-2.0-or-later.html"
            },
            {
              "checklist_url": "https://www.osadl.org/fileadmin/checklists/unreflicenses/GPL-2.0-or-later.txt",
              "copyleft": "yes",
              "incompatible_with": "Apache-1.0,Apache-1.1,Apache-2.0,BSD-4-Clause,BSD-4-Clause-UC,FTL,IJG,OpenSSL,Python-2.0,zlib-acknowledgement,XFree86-1.1",
              "name": "GPL-2.0-or-later",
              "osadl_updated": "2024-01-21T05:27:00+00:00",
              "patent_hints": "yes",
              "source": "scancode",
              "url": "https://spdx.org/licenses/GPL-2.0-or-later.html"
            },
            {
              "checklist_url": "https://www.osadl.org/fileadmin/checklists/unreflicenses/GPL-2.0-only.txt",
              "copyleft": "yes",
              "incompatible_with": "Apache-1.0,Apache-1.1,Apache-2.0,BSD-4-Clause,BSD-4-Clause-UC,FTL,IJG,OpenSSL,Python-2.0,zlib-acknowledgement,XFree86-1.1",
              "name": "GPL-2.0-only",
              "osadl_updated": "2024-01-21T05:27:00+00:00",
              "patent_hints": "yes",
              "source": "license_file",
              "url": "https://spdx.org/licenses/GPL-2.0-only.html"
            }
          ],
          "lines": "all",
          "matched": "100%",
          "oss_lines": "all",
          "purl": [
            "pkg:github/scanoss/engine"
          ],
          "release_date": "2022-12-29",
          "server": {
            "kb_version": {
              "daily": "24.01.22",
              "monthly": "23.12"
            },
            "version": "5.3.5"
          },
          "source_hash": "5adbcacf687f26596731900c07570673",
          "status": "pending",
          "url": "https://github.com/scanoss/engine",
          "url_hash": "587fc14ceb8fdd57727a2ab98d707916",
          "vendor": "scanoss",
          "version": "5.1.1"
        }
      ],
      "decrypt.c": [
        {
          "component": "engine",
          "file": "decrypt.c",
          "file_hash": "d954b45c05e338f1a9f56a93110cdae0",
          "file_url": "https://osskb.org/api/file_contents/d954b45c05e338f1a9f56a93110cdae0",
          "id": "file",
          "latest": "5.3.5",
          "licenses": [
            {
              "checklist_url": "https://www.osadl.org/fileadmin/checklists/unreflicenses/GPL-2.0-only.txt",
              "copyleft": "yes",
              "incompatible_with": "Apache-1.0,Apache-1.1,Apache-2.0,BSD-4-Clause,BSD-4-Clause-UC,FTL,IJG,OpenSSL,Python-2.0,zlib-acknowledgement,XFree86-1.1",
              "name": "GPL-2.0-only",
              "osadl_updated": "2024-01-21T05:27:00+00:00",
              "patent_hints": "yes",
              "source": "component_declared",
              "url": "https://spdx.org/licenses/GPL-2.0-only.html"
            },
            {
              "checklist_url": "https://www.osadl.org/fileadmin/checklists/unreflicenses/GPL-2.0-or-later.txt",
              "copyleft": "yes",
              "incompatible_with": "Apache-1.0,Apache-1.1,Apache-2.0,BSD-4-Clause,BSD-4-Clause-UC,FTL,IJG,OpenSSL,Python-2.0,zlib-acknowledgement,XFree86-1.1",
              "name": "GPL-2.0-or-later",
              "osadl_updated": "2024-01-21T05:27:00+00:00",
              "patent_hints": "yes",
              "source": "file_spdx_tag",
              "url": "https://spdx.org/licenses/GPL-2.0-or-later.html"
            },
            {
              "checklist_url": "https://www.osadl.org/fileadmin/checklists/unreflicenses/GPL-2.0-only.txt",
              "copyleft": "yes",
              "incompatible_with": "Apache-1.0,Apache-1.1,Apache-2.0,BSD-4-Clause,BSD-4-Clause-UC,FTL,IJG,OpenSSL,Python-2.0,zlib-acknowledgement,XFree86-1.1",
              "name": "GPL-2.0-only",
              "osadl_updated": "2024-01-21T05:27:00+00:00",
              "patent_hints": "yes",
              "source": "license_file",
              "url": "https://spdx.org/licenses/GPL-2.0-only.html"
            }
          ],
          "lines": "all",
          "matched": "100%",
          "oss_lines": "all",
          "purl": [
            "pkg:github/scanoss/engine"
          ],
          "release_date": "2022-09-26",
          "server": {
            "kb_version": {
              "daily": "24.01.22",
              "monthly": "23.12"
            },
            "version": "5.3.5"
          },
          "source_hash": "d954b45c05e338f1a9f56a93110cdae0",
          "status": "pending",
          "url": "https://github.com/scanoss/engine",
          "url_hash": "d6492e2364b3b7793773edf28a372c75",
          "vendor": "scanoss",
          "version": "5.0.0"
        }
      ],
      "no-match.c": [
        {
          "id": "none",
          "server": {
            "kb_version": {
              "daily": "24.01.22",
              "monthly": "23.12"
            },
            "version": "5.3.5"
          }
        }
      ],
      "requirements.txt": [
        {
          "dependencies": [
            {
              "component": "requests",
              "licenses": [
                {
                  "is_spdx_approved": true,
                  "name": "Apache2.0",
                  "spdx_id": "Apache-2.0"
                }
              ],
              "purl": "pkg:pypi/requests",
              "url": "https://pypi.org/project/requests",
              "version": "2.31.0"
            },
            {
              "licenses": [
                {}
              ],
              "purl": "pkg:pypi/crc32c"
            },
            {
              "component": "binaryornot",
              "licenses": [
                {
                  "is_spdx_approved": true,
                  "name": "BSD",
                  "spdx_id": "0BSD"
                }
              ],
              "purl": "pkg:pypi/binaryornot",
              "url": "https://pypi.org/project/binaryornot",
              "version": "0.4.4"
            },
            {
              "component": "pytest",
              "licenses": [
                {
                  "is_spdx_approved": true,
                  "name": "MIT",
                  "spdx_id": "MIT"
                }
              ],
              "purl": "pkg:pypi/pytest",
              "url": "https://pypi.org/project/pytest",
              "version": "8.0.0rc2"
            },
            {
              "component": "pytest-cov",
              "licenses": [
                {
                  "is_spdx_approved": true,
                  "name": "MIT",
                  "spdx_id": "MIT"
                }
              ],
              "purl": "pkg:pypi/pytest-cov",
              "url": "https://pypi.org/project/pytest-cov",
              "version": "4.1.0"
            },
            {
              "component": "beautifulsoup4",
              "licenses": [
                {
                  "is_spdx_approved": true,
                  "name": "MITLicense",
                  "spdx_id": "MIT"
                }
              ],
              "purl": "pkg:pypi/beautifulsoup4",
              "url": "https://pypi.org/project/beautifulsoup4",
              "version": "4.12.3"
            }
          ],
          "id": "dependency",
          "status": "pending"
        }
      ]
    }`,
    output: `
  ### SCANOSS SCAN Completed :rocket:
  - **Components detected:** 9
  - **Licenses detected:** 7
  - **Policies:**   (0 total)

  View more details on [SCANOSS Action Summary](https://github.com/x/y/actions/runs/0)
  `
  }
];

describe('Test report service: generatePRSummary', () => {
  beforeEach(() => {
    jest.spyOn(github.context, 'repo', 'get').mockReturnValue({ owner: 'x', repo: 'y' });
    github.context.runId = 0;
  });

  for (const t of tableTest) {
    it(`${t.name}`, () => {
      const report = generatePRSummary(JSON.parse(t.scannerResults), []);
      expect(report).toEqual(t.output);
    });
  }
});

describe('Test report service: generateJobSummary', () => {
  beforeEach(() => {
    jest.spyOn(github.context, 'repo', 'get').mockReturnValue({ owner: 'x', repo: 'y' });
    jest.spyOn(core.summary, 'write').mockImplementation();

    github.context.runId = 0;
  });

  for (const t of tableTest) {
    it(`${t.name}`, async () => {
      await expect(generateJobSummary(JSON.parse(t.scannerResults), [])).resolves.toEqual(undefined);
    });
  }
});
