import * as input from '../app.input';

export function commandBuilder(): string {
  return `docker run -v "${input.REPO_DIR}":"/scanoss" ghcr.io/scanoss/scanoss-py:v1.9.0 scan . 
                --output ${input.OUTPUT_PATH}  
                ${input.WITH_DEPENDENCIES ? `--dependencies` : ''}  
                ${input.SBOM_INDENTIFY ? `--identify ${input.SBOM_INDENTIFY}` : ''} 
                ${input.SBOM_IGNORE ? `--ignore ${input.SBOM_IGNORE}` : ''} 
                ${input.API_URL ? `--apiurl ${input.API_URL}` : ''} 
                ${input.API_KEY ? `--key ${input.API_KEY}` : ''}`.replace(/\n/gm, '');
}
