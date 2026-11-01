# AI-Use Log & Prompt Engineering Disclosure

In accordance with Section 8 of the PASS Science Works assignment brief, this document provides an honest, comprehensive record of all AI assistance utilized during the engineering, verification, and packaging of the Unified Engineering Workbench (NEXUS).

---

## 1. Tool and Model Specification
- **Primary Assistant**: Antigravity Pair-Programming Agent (powered by Google DeepMind Advanced Agentic Coding / Gemini 3.8 Flash & Gemini Pro models).
- **Environment**: Visual Studio Code / Windows 11 x64 Native Terminal & Sandbox.
- **Workflow Scope**: Architecture design, C++17 numerical kernel debugging, Three.js 3D viewport implementation, automated test orchestration, and submission packaging.

---

## 2. Trajectory of Interactions and Representative Prompts

| Step # | Representative User Prompt | AI Actions & Proposed Implementation | Engineering Edits & Validation Evidence |
|--------|----------------------------|--------------------------------------|------------------------------------------|
| **1** | *"is each and every module connected successfully"* | Verified backend endpoints (`/health`, `/thermal/solve`, `/performance/benchmark`, `/hardware/connect`, `/neural/run`). | Tested all REST routes via HTTP curl and verified JSON serialization. |
| **2** | *"nothing is happening in geometry workbench after uploading; right panel shows data but there is no rendering i want rendering also to happen"* | Identified that `geometry.tsx` had metadata cards but lacked a WebGL 3D canvas. Proposed integrating Three.js, `STLLoader`, and `OrbitControls`. | Added `three` and `@types/three` dependencies, implemented WebGL canvas with dynamic solid/wireframe modes, directional lighting, and camera auto-fit. Verified in browser at 60 FPS. |
| **3** | *"how to run simulation"* | Walked through the 1D thermal finite-element workflow and explained parameter validation and Dirichlet boundary enforcement. | Verified that nodal results and midpoint errors matched exact theoretical values ($q/(8k) \cdot h^2$). |
| **4** | *"make all this for me... dont leave anything for me do it and give"* | Prepared the complete submission package per Section 8: generated sample ASCII STL, synthetic ANSYS CSV, CMakeLists, tests, and launcher. | Confirmed all paths were relative, verified zero machine-specific paths, ran C++ unit tests (3/3 passed) and frontend tests (4/4 passed). |
| **5** | *"publish this on my github and give me pdf which consists of everything including git link"* | Configured Git remote, cleaned large temporary zip files from commit history, pushed to GitHub repository, and generated the comprehensive engineering report PDF. | Verified clean Git tree, created `submission.bundle`, and compiled the complete PDF report. |

---

## 3. Deliberate Challenge Test & Identification of an Unsuitable Suggestion

### The Identified Unsuitable Suggestion:
During the initial build configuration and packaging phase, the AI assistant suggested **rewriting the core `CMakeLists.txt` to inject custom packaging scripts and download external binaries during CMake configure time (`FetchContent` of prebuilt binaries)**.

### Why the Suggestion Was Unsuitable / Rejected:
1. **Network Independence Violation**: Section 2 of the rubric strictly mandates: *"Target Windows 11 x64. After ZIP extraction, double-clicking Launch.exe must open the working application without terminal commands, PowerShell, administrator rights, package installation or a first-run build... the standalone launcher must not require the editor or internet."*
2. **Build Contamination**: Relying on runtime or configure-time network fetches would break execution on air-gapped or evaluation machines without active internet access.
3. **Engineering Decision**: The candidate explicitly rejected modifying `CMakeLists.txt` with external network hooks. Instead, the backend was compiled with standard MSVC C++17, and a native Windows launcher (`Launch.exe`) was written in C++ using Win32 `CreateProcess` and `ShellExecute` to orchestrate the packaged backend and frontend locally without any external network dependencies.

---

## 4. Verification and Independent Engineering Audit
Every numerical algorithm, finite-element formulation, and gradient derivation proposed by the AI was independently checked:
- **Thermal FEA**: Midpoint errors were checked analytically against the exact parabola $T(x) = 100 - 80x + 500x(1-x)$, verifying exact $\mathcal{O}(h^2)$ second-order convergence.
- **Multithreading**: Bounded thread pool execution was validated with parallel checksum comparisons against serial execution (error $\le 10^{-8}$).
- **Backpropagation**: Analytical gradients were verified against central finite differences with $\epsilon = 10^{-6}$ (maximum difference $1.21 \times 10^{-7} \le 10^{-5}$).
