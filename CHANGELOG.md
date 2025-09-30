# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Platform-specific folder structure for better organization
- GitHub Actions workflow for documentation synchronization
- Automated diff generation and analysis scripts
- Platform manager for unified platform handling
- Comprehensive contributing guidelines
- Code of conduct for community standards
- Enhanced test structure for each platform

### Changed
- Restructured codebase for better LLM agent targeting
- Improved platform isolation and modularity
- Enhanced documentation and examples

### Fixed
- Documentation fetching and storage issues
- Serialized workflow for diff generation and analysis

## [1.0.6] - 2024-01-XX

### Added
- Support for Dodo Payments webhook verification
- Enhanced error handling and logging
- Additional test cases for all platforms

### Changed
- Improved TypeScript type definitions
- Enhanced documentation with more examples

### Fixed
- Minor bug fixes and performance improvements

## [1.0.5] - 2024-01-XX

### Added
- Support for Clerk webhook verification
- Token-based authentication for Supabase
- Additional platform configurations

### Changed
- Updated signature verification algorithms
- Enhanced error messages

## [1.0.4] - 2024-01-XX

### Added
- Support for GitHub webhook verification
- Enhanced HMAC-SHA256 implementation
- Additional test cases

### Changed
- Improved platform configuration system
- Better error handling

## [1.0.3] - 2024-01-XX

### Added
- Support for Supabase webhook verification
- Custom algorithm support
- Enhanced documentation

### Changed
- Refactored verification logic
- Improved type safety

## [1.0.2] - 2024-01-XX

### Added
- Support for Stripe webhook verification
- Basic HMAC-SHA256 implementation
- Initial test suite

### Changed
- Improved error handling
- Enhanced documentation

## [1.0.1] - 2024-01-XX

### Added
- Initial release
- Basic webhook verification framework
- TypeScript support
- Core verification algorithms

### Changed
- N/A

### Fixed
- N/A

---

## Version History

- **1.0.6**: Enhanced platform support and documentation
- **1.0.5**: Added Clerk and Supabase support
- **1.0.4**: Added GitHub webhook support
- **1.0.3**: Added Supabase support and custom algorithms
- **1.0.2**: Added Stripe webhook support
- **1.0.1**: Initial release with basic framework

## Migration Guide

### From 1.0.5 to 1.0.6

No breaking changes. All existing code should continue to work without modification.

### From 1.0.4 to 1.0.5

No breaking changes. New platforms added without affecting existing functionality.

### From 1.0.3 to 1.0.4

No breaking changes. Enhanced GitHub support added.

### From 1.0.2 to 1.0.3

No breaking changes. New platforms and algorithms added.

### From 1.0.1 to 1.0.2

No breaking changes. Stripe support added as an enhancement.

## Contributing

To add entries to this changelog:

1. Add your changes under the `[Unreleased]` section
2. Use the appropriate category: `Added`, `Changed`, `Deprecated`, `Removed`, `Fixed`, or `Security`
3. Provide a clear, concise description of the change
4. Reference any related issues or pull requests

When releasing a new version:

1. Move all `[Unreleased]` entries to a new version section
2. Update the version number and date
3. Add a new `[Unreleased]` section at the top
