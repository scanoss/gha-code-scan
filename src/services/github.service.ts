import { DefaultArtifactClient, UploadArtifactResponse } from '@actions/artifact';
import path from 'path';

const MAX_GH_API_CONTENT_SIZE = 65534;
const CHARACTERS_BUFFER = 50;
export function isOverMaxCharacterLimitAPI(content: string): boolean {
  return content.length >= MAX_GH_API_CONTENT_SIZE - CHARACTERS_BUFFER;
}

export async function uploadToArtifacts(artifactName: string): Promise<UploadArtifactResponse> {
  const artifact = new DefaultArtifactClient();
  return await artifact.uploadArtifact(path.basename(artifactName), [artifactName], path.dirname(artifactName));
}
