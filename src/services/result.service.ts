import { ComponentID, DependencyComponent, ScannerComponent, ScannerResults } from './result.interfaces';
import * as fs from 'fs';

export async function readResult(filepath: string): Promise<ScannerResults> {
  const content = await fs.promises.readFile(filepath, 'utf-8');
  return JSON.parse(content) as ScannerResults;
}

export interface License {
  spdxid: string;
  copyleft: boolean | null;
  url: string | null;
  count: number;
}

export function getLicenses(results: ScannerResults): License[] {
  const licenses = new Array<License>();

  for (const component of Object.values(results)) {
    for (const c of component) {
      if (c.id === ComponentID.FILE || c.id === ComponentID.SNIPPET) {
        for (const l of (c as ScannerComponent).licenses) {
          licenses.push({
            spdxid: l.name,
            copyleft: !l.copyleft ? null : l.copyleft === 'yes' ? true : false,
            url: l?.url ? l.url : null,
            count: 1
          });
        }
      }

      if (c.id === ComponentID.DEPENDENCY) {
        const dependencies = (c as DependencyComponent).dependencies;
        for (const d of dependencies) {
          for (const l of d.licenses) {
            if (!l.spdx_id) continue;
            licenses.push({ spdxid: l.spdx_id, copyleft: null, url: null, count: 1 });
          }
        }
      }
    }
  }

  //Increase counter. The only counter valid is only the first occurence!
  for (let i = 0; i < licenses.length; i++) {
    const p = licenses[i];
    for (let j = i + 1; j < licenses.length; j++) {
      const q = licenses[j];
      if (p.spdxid === q.spdxid) p.count++;
    }
  }

  //Clean duplicated
  const seenSpdxIds = new Set<string>();
  const uniqueLicenses = licenses.filter(license => {
    if (!seenSpdxIds.has(license.spdxid)) {
      seenSpdxIds.add(license.spdxid);
      return true;
    }
    return false;
  });

  return uniqueLicenses;
}
