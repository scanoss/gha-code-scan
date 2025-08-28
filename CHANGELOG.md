# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
