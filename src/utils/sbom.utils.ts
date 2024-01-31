import fs from 'fs';

export interface Sbom {
  components: {
    purl: string;
  }[];
}

export async function parseSbom(filepath: string): Promise<Sbom> {
  return JSON.parse(await fs.promises.readFile(filepath, 'utf-8')) as Sbom;
}
