# Changelog

All notable changes to this project will be documented here.

## [Released & Production-Ready]

## [1.5.10] - 2025-09-27
### Added
- Switched JSON parser to **SIMD-JSON** for faster performance.
- Benchmarked ~20–50% throughput improvement vs `serde_json`.

### Changed
- Updated internal benchmarks (`wrk`, `autocannon`) for new results.

### Fixed
- Reduced latency spikes under load due to parser optimizations.

## [1.5.8] - 2025-09-20
### Added
- Previous stable release (serde_json-based).
