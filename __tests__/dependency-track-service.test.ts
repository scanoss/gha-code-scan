import { RUNTIME_CONTAINER } from '../src/app.input';
import { DependencyTrackService } from '../src/services/dependency-track.service';

jest.mock('../src/app.input', () => ({
  ...jest.requireActual('../src/app.input'),
  REPO_DIR: '',
  OUTPUT_FILEPATH: 'results.json',
  COPYLEFT_LICENSE_EXCLUDE: '',
  COPYLEFT_LICENSE_EXPLICIT: '',
  COPYLEFT_LICENSE_INCLUDE: ''
}));

describe('Dependency track service', () => {
  let dependencyTrackProjectName = 'dependency-track-project-name';
  let dependencyTrackProjectVersion = '1.2.4';
  let dependencyTrackProjectID = 'asttvsd2346gfy';
  let dependencyTrackURL = 'https://dependencytrack.com';
  let dependencyTrackAPIKey = 'tgtresetryokjgvcb';
  beforeEach(() => {
    dependencyTrackProjectName = 'dependency-track-project-name';
    dependencyTrackProjectVersion = '1.2.4';
    dependencyTrackProjectID = 'asttvsd2346gfy';
    dependencyTrackURL = 'https://dependencytrack.com';
    dependencyTrackAPIKey = 'tgtresetryokjgvcb';
  });

  it('should fail due to missing Dependency Track API Key', () => {
    dependencyTrackAPIKey = '';
    const service = new DependencyTrackService({
      enabled: true,
      url: dependencyTrackURL,
      apiKey: dependencyTrackAPIKey,
      projectId: dependencyTrackProjectID,
      projectName: dependencyTrackProjectName,
      projectVersion: dependencyTrackProjectVersion
    });

    expect(() => {
      (service as any).validateConfiguration();
    }).toThrow('Dependency Track is enabled but required parameters are missing: dependencytrack.apikey');
  });

  it('should fail due to missing project version', () => {
    // Project id has more priority than project version
    dependencyTrackProjectID = '';
    // Set dependency track project version to empty string
    dependencyTrackProjectVersion = '';
    const service = new DependencyTrackService({
      enabled: true,
      url: dependencyTrackURL,
      apiKey: dependencyTrackAPIKey,
      projectId: dependencyTrackProjectID,
      projectName: dependencyTrackProjectName,
      projectVersion: dependencyTrackProjectVersion
    });

    expect(() => {
      (service as any).validateConfiguration();
    }).toThrow(
      `Dependency Track is enabled but project identification is incomplete. ` +
        `Either provide 'dependencytrack.projectId' OR both 'dependencytrack.projectName' and 'dependencytrack.projectVersion'. ` +
        `Missing: dependencytrack.projectVersion`
    );
  });

  it('should fail due to missing project name', () => {
    // Project id has more priority than project version
    dependencyTrackProjectID = '';
    // Set dependency track project version to empty string
    dependencyTrackProjectName = '';
    const service = new DependencyTrackService({
      enabled: true,
      url: dependencyTrackURL,
      apiKey: dependencyTrackAPIKey,
      projectId: dependencyTrackProjectID,
      projectName: dependencyTrackProjectName,
      projectVersion: dependencyTrackProjectVersion
    });

    expect(() => {
      (service as any).validateConfiguration();
    }).toThrow(
      `Dependency Track is enabled but project identification is incomplete. ` +
        `Either provide 'dependencytrack.projectId' OR both 'dependencytrack.projectName' and 'dependencytrack.projectVersion'. ` +
        `Missing: dependencytrack.projectName`
    );
  });

  it('should fail due to missing dependency track URL', () => {
    dependencyTrackURL = '';
    const service = new DependencyTrackService({
      enabled: true,
      url: dependencyTrackURL,
      apiKey: dependencyTrackAPIKey,
      projectId: dependencyTrackProjectID,
      projectName: dependencyTrackProjectName,
      projectVersion: dependencyTrackProjectVersion
    });
    expect(() => {
      (service as any).validateConfiguration();
    }).toThrow('Dependency Track is enabled but required parameters are missing: dependencytrack.url');
  });

  it('should correctly return the scanoss-py Dependency Track upload command', () => {
    const service = new DependencyTrackService({
      enabled: true,
      url: dependencyTrackURL,
      apiKey: dependencyTrackAPIKey,
      projectId: dependencyTrackProjectID,
      projectName: dependencyTrackProjectName,
      projectVersion: dependencyTrackProjectVersion
    });
    const command = (service as any).buildDependencyTrackUploadParameters();
    expect(command).toEqual([
      'run',
      '-v',
      ':/scanoss',
      RUNTIME_CONTAINER,
      'export',
      '--input',
      './cyclonedx.json',
      '--dt-apikey',
      dependencyTrackAPIKey,
      '--dt-url',
      dependencyTrackURL,
      '--dt-projectid',
      dependencyTrackProjectID,
      '--dt-projectname',
      dependencyTrackProjectName,
      '--dt-projectversion',
      dependencyTrackProjectVersion
    ]);
  });
});
