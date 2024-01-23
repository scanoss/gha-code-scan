import { ComponentID, DependencyComponent, ScannerComponent, ScannerResults } from './result.interfaces'
import * as fs from 'fs'

export async function readResult(filepath: string): Promise<ScannerResults> {
  const content = await fs.promises.readFile(filepath, 'utf-8')
  return JSON.parse(content) as ScannerResults
}

export interface Licenses {
  spdxid: string
  copyleft: boolean | null
  url: string | null
}

export function getLicenses(results: ScannerResults): Licenses[] {
  const licenses = new Array<Licenses>()

  for (const component of Object.values(results)) {
    for (const c of component) {
      if (c.id === ComponentID.FILE || c.id === ComponentID.SNIPPET) {
        for (const l of (c as ScannerComponent).licenses) {
          licenses.push({
            spdxid: l.name,
            copyleft: !l.copyleft ? null : l.copyleft === 'yes' ? true : false,
            url: l?.url ? l.url : null
          })
        }
      }

      if (c.id === ComponentID.DEPENDENCY) {
        const dependencies = (c as DependencyComponent).dependencies
        for (const d of dependencies) {
          for (const l of d.licenses) {
            if (!l.spdx_id) continue
            licenses.push({ spdxid: l.spdx_id, copyleft: null, url: null })
          }
        }
      }
    }
  }

  const seenSpdxIds = new Set<string>()
  const uniqueLicenses = licenses.filter(license => {
    if (!seenSpdxIds.has(license.spdxid)) {
      seenSpdxIds.add(license.spdxid)
      return true
    }
    return false
  })

  return uniqueLicenses
}
