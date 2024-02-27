import { ComponentID, DependencyComponent, ScannerComponent, ScannerResults } from './result.interfaces';

//TODO: Move all functions to a class named ResultService that produces an object { licenses: []; compoments: []; dependencies: []; vulns: [];}

export interface License {
  spdxid: string;
  copyleft: boolean | null;
  url: string | null;
  count: number;
}

export interface Component {
  purl: string;
  version: string;
  licenses: License[];
}

export function getComponents(results: ScannerResults): Component[] {
  const components = new Array<Component>();

  for (const component of Object.values(results)) {
    for (const c of component) {
      if (c.id === ComponentID.FILE || c.id === ComponentID.SNIPPET) {
        components.push({
          purl: (c as ScannerComponent).purl[0],
          version: (c as ScannerComponent).version,
          licenses: (c as ScannerComponent).licenses.map(l => ({
            spdxid: l.name,
            copyleft: !l.copyleft ? null : l.copyleft === 'yes' ? true : false,
            url: l?.url ? l.url : null,
            count: 1
          }))
        });
      }

      if (c.id === ComponentID.DEPENDENCY) {
        const dependencies = (c as DependencyComponent).dependencies;
        for (const d of dependencies) {
          components.push({
            purl: d.purl,
            version: d.version,
            licenses: d.licenses
              .map(l => ({ spdxid: l.spdx_id, copyleft: null, url: null, count: 1 }))
              .filter(l => l.spdxid)
          });
        }
      }
    }
  }

  // Merge duplicates
  const componentMap = new Map<string, Component>();
  components.forEach((component: Component) => {
    const key = `${component.purl}-${component.version}`;
    const existingComponent = componentMap.get(key);
    if (existingComponent) {
      component.licenses = [...existingComponent.licenses, ...component.licenses];
    } else {
      componentMap.set(key, component);
    }

    // Remove duplicates licenses
    const spdxidSet = new Set<string>();
    const uniqueLicenses: License[] = [];
    component.licenses.forEach(license => {
      if (!spdxidSet.has(license.spdxid)) {
        spdxidSet.add(license.spdxid);
        uniqueLicenses.push(license);
      }
    });
    component.licenses = uniqueLicenses;
  });

  const unqiqueComponents = [...componentMap.values()];

  return unqiqueComponents;
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
