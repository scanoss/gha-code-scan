import fs from 'fs';

export interface SBOM {
  components: {
    purl: string;
  }[];
}

export async function parseSBOM(filepath: string): Promise<SBOM> {
  return JSON.parse(await fs.promises.readFile(filepath, 'utf-8')) as SBOM;
}
