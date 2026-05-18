# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [1.6.3] - 2026-05-18
### Changed
- Upgraded Node.js to 24
- Upgraded eslint-plugin jest to 29.15.2
- Upgraded @types/node to 25.3.5
- Upgraded @actions/core to 3.0.0
- Upgraded globals to 17.4.0
- Upgraded actions/upload-artifact to 7
- Added __mocks__/@actions/core.ts to mock @actions/core for tests
- Updated actions/checkout to v6 in README.md
### Fixed
- Changed 'code-scan-action' to 'gha-code-scan' in README.md

## [1.6.2] - 2026-05-11
### Changed
- Upgraded `scanoss.py` runtime container to v1.52.1

## [1.6.1] - 2026-03-30
### Fixed
- Fixed policy check runs remaining in "queued" status when the workflow fails before policy execution

## [1.6.0] - 2026-03-05
### Changed
- Replaced `vercel/ncc` by `esbuild` to support ESM modules
- Migrated ESLint 8 to ESLint 9 with flat config (`eslint.config.mjs`)
- Upgraded `@typescript-eslint` from v6 to v8 for TypeScript 5.9 compatibility
- Upgraded `eslint-plugin-github` from v4 to v5 and `eslint-plugin-jest` from v27 to v28
- Removed redundant `linter.yml` workflow (linting already covered by `ci.yml`)
- Upgraded `scanoss.py` runtime container to v1.46.0

### Fixed
- Fixed corrupted artifact files
- Fixed `@actions/artifact` ESM module resolution in Jest tests

## [1.5.0] - 2026-02-09
### Added
- Added support for scan tuning parameters
### Changed
- Upgraded scanoss-py version to v1.45.0

## [1.4.0] - 2025-12-09
### Added
- Added basic subfolder scanning
- Added input scanPath to specify a folder to scan
- Added [MONOREPO_SETUP.md](MONOREPO_SETUP.md) to guide workflow setup for individual folder scanning
### Changed
- Upgraded scanoss-py version to v1.41.0

## [1.3.1] - 2025-10-21
### Added
- Added results conversion to spdxlite and csv
### Changed
- Upgraded scanoss-py version to v1.37.1

## [1.3.0] - 2025-10-17
### Added
- Added delta scanning for pushes and pull requests
- Added input scanMode to toggle delta/full scan
### Changed
- Upgraded scanoss-py version to v1.37.0 

## [1.2.5] - 2025-10-02
### Fixed
- Missing brackets when initialising scanoss.json with link

## [1.2.4] - 2025-10-01
### Fixed
- Fixed commit comment creation location
- All usages of repo and sha are now fork safe

## [1.2.3] - 2025-09-18
### Added
- Added annotations for file and snippet matches
- Added commit comment for each match
- Added link to auto create scanoss.json file

## [1.2.2] - 2025-09-09
### Added
- Added policies input trimming
### Fixed
- Fixed workflow erroring out if no policies were specified

## [1.2.1] - 2025-08-28
### Added
- Added url sanitisation
### Fixed
- Fixed misleading link in status check
### Changed
- Updated scanoss-py version to v1.31.5

## [1.2.0] - 2025-08-21
### Added
- Added dependency track policy check
- Added extra configuration validation
- Added status check summary
### Changed
- Updated scanoss-py version to v1.31.4

## [1.1.0] - 2025-07-22
### Added
- Added dependency track upload
### Changed
- Updated scanoss-py version to v1.29.0

## [1.0.6] - 2025-06-26
### Fixed
- Fixed bug on the runtime container 
### Changed
- Upgraded scanoss-py version to v1.26.3

## [1.0.5] - 2025-06-24
### Changed
- Upgraded scanoss-py image to v1.26.2

## [1.0.4] - 2025-06-23
### Added
- Updated scanoss-py version to v1.26.1
### Changed
- Improved SCANOSS GHA summary with enhanced component and license reporting including:
    - Component statistics (detected, declared, undeclared)
    - File-level component detection summary
    - Added summary for total detected licenses
    - Added summary for total copyleft licenses

## [1.0.3] - 2025-06-12
### Added
- Added debug flag
- Updated scanoss-py version to v1.25.1
- Updated @actions/artifact to v2.3.2

## [1.0.2] - 2025-03-11
### Fixed
- Fixed bug on API key parameter

## [1.0.1] - 2024-12-20
### Added
- Added support to SCANOSS settings file
### Removed
- Removed support for sbom.json file

## [0.2.2] - 2024-09-24
### Added
- Added dependency scope filtering

## [0.2.1] - 2024-08-23
### Fixed
- Fixed policy check reporting

## [0.2.0] - 2024-08-21
### Added
- Get license details from OSADL 
- Added Copyleft license option

## [0.1.5] - 2024-08-16
### Added
- Published policy results to artifacts

## [0.1.4] - 2024-08-15
### Fixed
- Fixed GitHub API upload size limit

## [0.1.3] - 2024-08-14
### Updated
- Updated copyleft policy

## [0.1.2] - 2024-08-14
### Updated
- Update container dependency version

## [0.1.1] - 2024-05-02
### Fixed
- Fixed the bug when the SBOM format is not valid

## [0.1.0] - 2024-03-25
### Added
- Initial release

[0.1.0]: https://github.com/scanoss/gha-code-scan/releases/tag/v0.1.0
[0.1.1]: https://github.com/scanoss/gha-code-scan/compare/v0.1.0...v0.1.1
[0.1.2]: https://github.com/scanoss/gha-code-scan/compare/v0.1.1...v0.1.2
[0.1.3]: https://github.com/scanoss/gha-code-scan/compare/v0.1.2...v0.1.3
[0.1.4]: https://github.com/scanoss/gha-code-scan/compare/v0.1.3...v0.1.4
[0.1.5]: https://github.com/scanoss/gha-code-scan/compare/v0.1.4...v0.1.5
[0.2.0]: https://github.com/scanoss/gha-code-scan/compare/v0.1.5...v0.2.0
[0.2.1]: https://github.com/scanoss/gha-code-scan/compare/v0.2.0...v0.2.1
[0.2.2]: https://github.com/scanoss/gha-code-scan/compare/v0.2.1...v0.2.2
[1.0.1]: https://github.com/scanoss/gha-code-scan/compare/v0.2.1...v1.0.1
[1.0.2]: https://github.com/scanoss/gha-code-scan/compare/v1.0.1...v1.0.2
[1.0.3]: https://github.com/scanoss/gha-code-scan/compare/v1.0.2...v1.0.3
[1.0.4]: https://github.com/scanoss/gha-code-scan/compare/v1.0.3...v1.0.4
[1.0.5]: https://github.com/scanoss/gha-code-scan/compare/v1.0.4...v1.0.5
[1.0.6]: https://github.com/scanoss/gha-code-scan/compare/v1.0.5...v1.0.6
[1.1.0]: https://github.com/scanoss/gha-code-scan/compare/v1.0.6...v1.1.0
[1.2.0]: https://github.com/scanoss/gha-code-scan/compare/v1.1.0...v1.2.0
[1.2.1]: https://github.com/scanoss/gha-code-scan/compare/v1.2.0...v1.2.1
[1.2.2]: https://github.com/scanoss/gha-code-scan/compare/v1.2.1...v1.2.2
[1.2.3]: https://github.com/scanoss/gha-code-scan/compare/v1.2.2...v1.2.3
[1.2.4]: https://github.com/scanoss/gha-code-scan/compare/v1.2.3...v1.2.4
[1.2.5]: https://github.com/scanoss/gha-code-scan/compare/v1.2.4...v1.2.5
[1.3.0]: https://github.com/scanoss/gha-code-scan/compare/v1.2.5...v1.3.0
[1.3.1]: https://github.com/scanoss/gha-code-scan/compare/v1.3.0...v1.3.1
[1.4.0]: https://github.com/scanoss/gha-code-scan/compare/v1.3.1...v1.4.0
[1.5.0]: https://github.com/scanoss/gha-code-scan/compare/v1.4.0...v1.5.0
[1.6.0]: https://github.com/scanoss/gha-code-scan/compare/v1.5.0...v1.6.0
[1.6.1]: https://github.com/scanoss/gha-code-scan/compare/v1.6.0...v1.6.1
[1.6.2]: https://github.com/scanoss/gha-code-scan/compare/v1.6.1...v1.6.2