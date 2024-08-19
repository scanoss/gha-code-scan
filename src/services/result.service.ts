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

import { ComponentID, DependencyComponent, ScannerComponent, ScannerResults } from './result.interfaces';
import { licenseUtil } from '../utils/license.utils';

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

/**
 * This function groups components by their `purl` and aggregates their licenses,
 * ensuring that each unique `purl` is represented once with a comprehensive list of licenses.
 *
 * @param results - The raw scanner results to be processed of type {@link ScannerResults}
 * @returns An array of {@link Component} objects, each representing a unique component
 *          with an aggregated list of licenses.
 */
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
            copyleft: licenseUtil.isCopyLeft(l.name?.trim().toLowerCase()),
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
              .map(l => ({
                spdxid: l.spdx_id,
                copyleft: licenseUtil.isCopyLeft(l.spdx_id?.trim().toLowerCase()),
                url: null,
                count: 1
              }))
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

/**
 * This function generate an array of {@link License } from raw scanner results {@link ScannerResults }
 *
 * @param results - The raw scanner results to be processed of type {@link ScannerResults}
 * @returns An array of {@link License} objects
 */
export function getLicenses(results: ScannerResults): License[] {
  const licenses = new Array<License>();

  for (const component of Object.values(results)) {
    for (const c of component) {
      if (c.id === ComponentID.FILE || c.id === ComponentID.SNIPPET) {
        for (const l of (c as ScannerComponent).licenses) {
          licenses.push({
            spdxid: l.name,
            copyleft: licenseUtil.isCopyLeft(l.name.trim().toLowerCase()),
            url: licenseUtil.getOSADL(l?.name),
            count: 1
          });
        }
      }

      if (c.id === ComponentID.DEPENDENCY) {
        const dependencies = (c as DependencyComponent).dependencies;
        for (const d of dependencies) {
          for (const l of d.licenses) {
            if (!l.spdx_id) continue;
            licenses.push({
              spdxid: l.spdx_id,
              copyleft: licenseUtil.isCopyLeft(l.spdx_id?.trim().toLowerCase()),
              url: licenseUtil.getOSADL(l?.spdx_id),
              count: 1
            });
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
