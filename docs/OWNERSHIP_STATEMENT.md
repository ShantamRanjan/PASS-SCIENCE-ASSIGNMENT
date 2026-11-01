# Statement of Ownership & Attribution

**Candidate Name**: Shantam Ashish Ranjan  
**Project**: NEXUS Unified Engineering Workbench  
**Assessment**: PASS Science Works R&D Internship 2026-2027  
**GitHub Repository**: [https://github.com/ShantamRanjan/PASS-SCIENCE-ASSIGNMENT](https://github.com/ShantamRanjan/PASS-SCIENCE-ASSIGNMENT)

---

## 1. Original Engineering Work
The following components and implementations were authored specifically for this project:
- **C++17 Numerical Physics Kernels**:
  - `nexus::thermal::solve`: 1D steady-state finite element stiffness matrix assembly, Dirichlet boundary condition enforcement via DOF elimination, and Gaussian elimination linear solver.
  - `nexus::performance::run`: Bounded multithreaded CPU parallel workload with deterministic seed, warm-up iteration, and serial/parallel agreement verification.
  - `nexus::ml::NeuralNetwork`: Forward evaluation, analytical backpropagation chain-rule gradients, and numerical central finite-difference verification.
  - `nexus::hardware`: Device discovery, telemetry reporting, and simulated fault injection/recovery state machine for MCU, FPGA, and JTAG devices.
  - `nexus::geometry`: Fast ASCII Stereolithography (STL) parsing, surface area calculation, and bounding box computation.
- **Frontend 3D Visualizer & User Interface**:
  - Integration of Three.js interactive WebGL viewport in `geometry.tsx` with orbit controls, camera centering, solid/wireframe rendering, and temperature colormap point cloud visualization.
  - Reactive status indicators, error handling toast notifications, and telemetry dashboard cards.
- **Standalone One-Click Orchestrator**:
  - `launcher.cpp` / `Launch.exe`: Native Windows 11 Win32 process launcher orchestrating backend and frontend without external dependencies or terminal commands.
- **Documentation and Verification Artifacts**:
  - Complete engineering report, handwritten backpropagation derivation, embedded architecture design, and automated test suites.

---

## 2. Reused Open-Source Libraries and Licenses
All reused libraries are openly licensed and permissible under academic and commercial development standards:

| Library / Tool | Version | License | Usage in NEXUS |
|----------------|---------|---------|----------------|
| **cpp-httplib** | v0.18.3 | MIT License | C++ header-only HTTP REST server |
| **nlohmann/json**| v3.11.3 | MIT License | Modern C++ JSON serialization and parsing |
| **GoogleTest** | v1.14.0 | BSD-3-Clause | C++ unit testing and assertion framework |
| **Three.js** | 0.166.0 | MIT License | Client-side WebGL 3D rendering in browser |
| **React** | 18.2.0 | MIT License | Declarative reactive UI framework |
| **Vite** | 8.1.5 | MIT License | Frontend build tool and local preview server |
| **Tailwind CSS**| 3.4.1 | MIT License | Utility-first CSS layout and theme styling |
| **Lucide Icons**| 0.344.0 | MIT License | Modern SVG icons for workbench navigation |
| **Matplotlib** | 3.11.2 | PSF License | Automated generation of submission verification plots |

No proprietary solver licenses, commercial CAD software, or confidential third-party code were used.
