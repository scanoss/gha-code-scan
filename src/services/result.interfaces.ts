export type ScannerResults = Record<string, ScannerComponent[] | DependencyComponent[]>

export enum ComponentID {
  NONE = 'none',
  FILE = 'file',
  SNIPPET = 'snippet',
  DEPENDENCY = 'dependency'
}

interface CommonComponent {
  id: ComponentID
  status: string
}

export interface DependencyComponent extends CommonComponent {
  dependencies: {
    licenses: {
      is_spdx_approved: boolean
      name: string
      spdx_id: string
    }[]
    purl: string
    url: string
    version: string
  }[]
}

export interface ScannerComponent extends CommonComponent {
  lines: string
  oss_lines: string
  matched: string
  purl: string[]
  vendor: string
  component: string
  version: string
  latest: string
  url: string
  release_date: string
  file: string
  url_hash: string
  file_hash: string
  source_hash: string
  file_url: string
  licenses: {
    name: string
    patent_hints: string
    copyleft: string
    checklist_url: string
    osadl_updated: string
    source: string
    incompatible_with?: string
    url: string
  }[]
  dependencies: {
    vendor: string
    component: string
    version: string
    source: string
  }[]
  copyrights: {
    name: string
    source: string
  }[]
  vulnerabilities: {
    ID: string
    CVE: string
    severity: string
    reported: string
    introduced: string
    patched: string
    summary: string
    source: string
  }[]
  quality: {
    score: string
    source: string
  }[]
  cryptography: any[]
  health: {
    creation_date: string
    issues: number
    last_push: string
    last_update: string
    watchers: number
    country: string
    stars: number
    forks: number
  }
  server: {
    version: string
    kb_version: { monthly: string; daily: string }
    hostname: string
    flags: string
    elapsed: string
  }
}
