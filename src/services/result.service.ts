import { ComponentID, DependencyComponent, ScannerComponent, ScannerResults } from './result.interfaces'
import * as fs from 'fs'

export async function readResult(filepath: string): Promise<ScannerResults> {
  const content = await fs.promises.readFile(filepath, 'utf-8')
  return JSON.parse(content) as ScannerResults
}

export function getLicenses(results: ScannerResults): string[] {
  const licenses = new Set<string>()

  for (const component of Object.values(results)) {
    for (const c of component) {
      if (c.id === ComponentID.DEPENDENCY) {
        const dependencies = (c as DependencyComponent).dependencies
        for (const d of dependencies) {
          for (const l of d.licenses) {
            licenses.add(l.spdx_id)
          }
        }
      }

      if (c.id === ComponentID.FILE || c.id === ComponentID.SNIPPET) {
        for (const l of (c as ScannerComponent).licenses) {
          licenses.add(l.name)
        }
      }
    }
  }

  return Array.from(licenses)
}
