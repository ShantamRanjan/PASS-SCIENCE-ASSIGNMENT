# NEXUS C++17 Backend

This backend provides a local HTTP API and C++ modules for thermal FEM, geometry file parsing, benchmarking, simulated hardware, and a small neural network.

See `docs/BUILD_INSTRUCTIONS.md` before building. The first CMake configure downloads pinned dependencies and therefore requires network access.

**Scope notes:** hardware adapters are simulated. STL and CSV parsing are implemented as C++ library functions; this initial API does not expose file-upload endpoints. Experiment persistence, production authentication, Tauri sidecar packaging, and full training endpoints are not included yet. Do not present these as completed features.
