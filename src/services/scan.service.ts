import path from 'path';
import * as input from '../app.input';
import { DefaultArtifactClient } from '@actions/artifact';

const artifact = new DefaultArtifactClient();

export async function uploadResults(): Promise<void> {
  await artifact.uploadArtifact(path.basename(input.OUTPUT_PATH), [input.OUTPUT_PATH], path.dirname(input.OUTPUT_PATH));
}

export function commandBuilder(): string {
  return `docker run -v "${input.REPO_DIR}":"/scanoss" ghcr.io/scanoss/scanoss-py:v1.9.0 scan . 
                --output ${input.OUTPUT_PATH}  
                ${input.WITH_DEPENDENCIES ? `--dependencies` : ''}  
                ${input.SBOM_INDENTIFY ? `--identify ${input.SBOM_INDENTIFY}` : ''} 
                ${input.SBOM_IGNORE ? `--ignore ${input.SBOM_IGNORE}` : ''} 
                ${input.API_URL ? `--apiurl ${input.API_URL}` : ''} 
                ${input.API_KEY ? `--key ${input.API_KEY}` : ''}`.replace(/\n/gm, '');
}
