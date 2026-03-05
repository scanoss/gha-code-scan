export class DefaultArtifactClient {
  async uploadArtifact(): Promise<UploadArtifactResponse> {
    return { size: 0, id: 1 };
  }

  async downloadArtifact(): Promise<{ downloadPath: string }> {
    return { downloadPath: '' };
  }

  async listArtifacts(): Promise<{ artifacts: [] }> {
    return { artifacts: [] };
  }

  async getArtifact(): Promise<{ artifact: { name: string; id: number } }> {
    return { artifact: { name: '', id: 0 } };
  }

  async deleteArtifact(): Promise<void> {
    return;
  }
}

export interface UploadArtifactResponse {
  size: number;
  id?: number;
}
