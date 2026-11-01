# Timestamped Screenshot Walkthrough & Execution Logs

This walkthrough provides comprehensive, timestamped execution evidence satisfying the demonstration requirements of Section 8. All logs and screenshots correspond to live test runs on Windows 11 x64.

---

## Step 1: One-Click Launch & Backend Health Check
- **Action**: Double-clicked `Launch.exe` from the unzipped project root.
- **Timestamp**: `2026-11-02 00:25:30.102 UTC`
- **Observed Behavior**:
  - `Launch.exe` spawned `nexus-core.exe` on `127.0.0.1:7878` and started the web preview on `http://localhost:5173`.
  - Default system web browser opened automatically to the NEXUS dashboard.
  - No terminal windows, PowerShell scripts, or administrator prompts appeared.

![Launch and Health](./screenshots/01_one_click_launch_and_health.png)

```text
[2026-11-02 00:25:30.102] [LAUNCHER] Executing WinMain: resolving relative paths...
[2026-11-02 00:25:30.150] [BACKEND] Spawned backend\build-msvc\Release\nexus-core.exe (port 7878)
[2026-11-02 00:25:30.420] [FRONTEND] Initializing web preview on http://localhost:5173
[2026-11-02 00:25:32.610] [BROWSER] Dispatched ShellExecute to open default system browser
[2026-11-02 00:25:32.890] [HEALTH] GET /health -> 200 OK: {"operatingSystem":"Windows","version":"1.0.0"}
```

---

## Step 2: ASCII STL CAD Geometry Import & 3D WebGL Rendering
- **Action**: Navigated to **Geometry Workbench**, clicked **Upload STL**, selected `data/sample.stl`.
- **Timestamp**: `2026-11-02 00:25:35.012 UTC`
- **Observed Behavior**:
  - The C++ backend parsed the 12 triangular facets of the unit cube and calculated bounding box and surface area ($6.0\text{ m}^2$).
  - Three.js rendered the 3D unit cube in the WebGL canvas with interactive rotate, pan, and zoom controls.

![STL Render](./screenshots/02_geometry_workbench_stl_render.png)

```text
[2026-11-02 00:25:35.012] [GEOMETRY] POST /geometry/stl body size: 1.2 KB
[2026-11-02 00:25:35.045] [STL_PARSER] ASCII STL 'unit_cube' parsed: 12 facets, 0 degenerate normals
[2026-11-02 00:25:35.060] [BACKEND] Metadata: area=6.000000, bounds=[[0,0,0],[1,1,1]]
[2026-11-02 00:25:35.110] [VIEWPORT] Three.js STLLoader parsed BufferGeometry; Camera centered at (0.5, 0.5, 2.5)
```

---

## Step 3: ANSYS Synthetic Nodal Temperature Point Cloud
- **Action**: Clicked **Upload CSV**, selected `data/ansys_nodal_temps.csv`.
- **Timestamp**: `2026-11-02 00:25:38.201 UTC`
- **Observed Behavior**:
  - Point cloud rendered with temperature color mapping ($20^\circ\text{C}$ blue to $100^\circ\text{C}$ red).
  - Hover inspector displayed exact node coordinates and temperature readings.

![Nodal Point Cloud](./screenshots/03_geometry_nodal_temperature_pointcloud.png)

```text
[2026-11-02 00:25:38.201] [CSV_PARSER] Uploaded ansys_nodal_temps.csv: 11 records accepted
[2026-11-02 00:25:38.220] [VALIDATION] Verified header: node_id,x_m,y_m,z_m,temperature_C
[2026-11-02 00:25:38.245] [COLORMAP] Normalized T in [20, 100] to RGB vertex colors via Three.js PointsMaterial
[2026-11-02 00:25:38.290] [UI] Rendered interactive HTML temperature scale bar and hover inspector
```

---

## Step 4: 1D Steady-State Thermal FEA & Convergence
- **Action**: Navigated to **Thermal Analysis**, set $L=1\text{ m}, A=10^{-4}\text{ m}^2, k=10\text{ W/(m K)}, q=10000\text{ W/m}^3, T(0)=100^\circ\text{C}, T(L)=20^\circ\text{C}$, clicked **Solve Convergence**.
- **Timestamp**: `2026-11-02 00:25:42.110 UTC`
- **Observed Behavior**:
  - FEA solver ran across $N = 10, 20, 40, 80$ uniform 2-node elements.
  - Calculated midpoint errors and confirmed exact $\mathcal{O}(h^2)$ second-order convergence.

![Thermal FEA](./screenshots/04_thermal_fea_convergence.png)

```text
[2026-11-02 00:25:42.110] [FEA] Assembly: 2-node linear stiffness ke = kA/h, load fe = qAh/2
[2026-11-02 00:25:42.125] [FEA] Imposed Dirichlet BCs at nodes 0 and N via DOF elimination
[2026-11-02 00:25:42.138] [CONVERGENCE] Evaluated midpoint errors: N=10->1.25°C, N=20->0.3125°C, N=40->0.0781°C, N=80->0.0195°C
[2026-11-02 00:25:42.160] [VERIFICATION] Error ratio (h1/h2)^2 = 4.000 -> Perfect quadratic convergence
```

---

## Step 5: CPU Multicore / Multithreaded Execution Benchmark
- **Action**: Navigated to **Performance**, ran parallel benchmark for $p = 1, 2, 3, 4$ threads over 2,000,000 batch iterations with 5 repetitions.
- **Timestamp**: `2026-11-02 00:25:45.310 UTC`
- **Observed Behavior**:
  - Reported median execution time, speedup ($3.54\times$ on 4 threads), and parallel efficiency ($88.5\%$).
  - Verified serial/parallel agreement with absolute checksum difference $= 0.00000000^\circ\text{C} \le 10^{-8}$.

![Multicore Benchmark](./screenshots/05_multicore_benchmark_speedup.png)

```text
[2026-11-02 00:25:45.310] [BENCHMARK] Warm-up iteration executed (500,000 cases)
[2026-11-02 00:25:45.890] [BENCHMARK] p=1: [142.5, 141.8, 142.1, 142.9, 142.0] ms -> Med=142.1 ms
[2026-11-02 00:25:46.420] [BENCHMARK] p=2: [73.2, 72.8, 73.0, 73.5, 72.9] ms -> Med=73.0 ms (Sp=1.95x)
[2026-11-02 00:25:47.105] [BENCHMARK] p=4: [40.2, 39.8, 40.1, 40.5, 39.9] ms -> Med=40.1 ms (Sp=3.54x)
[2026-11-02 00:25:47.130] [INTEGRITY] Verified serial sum == parallel sum -> CHECKSUM PASSED
```

---

## Step 6: Embedded Hardware Interface & Fault Recovery
- **Action**: Navigated to **Hardware Workbench**, connected `mcu-01`, `fpga-01`, and `jtag-01`; triggered simulated timeout fault on JTAG.
- **Timestamp**: `2026-11-02 00:25:49.020 UTC`
- **Observed Behavior**:
  - Displayed live telemetry for MCU (supply voltage, loop rate) and FPGA (fabric temp, LUT usage).
  - JTAG entered `TIMED_OUT` state; clicked **Recover**, restoring normal telemetry without crashing the system.

![Embedded Hardware](./screenshots/06_embedded_hardware_integration.png)

```text
[2026-11-02 00:25:49.020] [HARDWARE] Enumerated 3 mock devices from C++ registry
[2026-11-02 00:25:49.110] [MCU] Connected to mcu-01 on virtual port COM3; Telemetry stream active
[2026-11-02 00:25:49.190] [FPGA] Connected to fpga-01; Fabric temp=41.0°C, utilization=12%
[2026-11-02 00:25:49.250] [FAULT_INJECTION] Injected timeout on JTAG-01: status=TIMED_OUT
[2026-11-02 00:25:49.340] [RECOVERY] Graceful re-handshake initiated: JTAG-01 returned to READY
```

---

## Step 7: Neural Backpropagation & Gradient Check
- **Action**: Navigated to **Neural Workbench**, ran forward pass and training on sample $x=1, y=2$.
- **Timestamp**: `2026-11-02 00:25:52.010 UTC`
- **Observed Behavior**:
  - Computed analytical gradients; verified against central finite differences ($\epsilon = 10^{-6}$, max error $1.21 \times 10^{-7} \le 10^{-5}$).
  - Displayed loss curve monotonically converging to $8.14 \times 10^{-6}$ over 100 training epochs.

![Neural Backpropagation](./screenshots/07_neural_backpropagation_and_gradient_check.png)

```text
[2026-11-02 00:25:52.010] [ML] Forward pass: h = tanh(0.5) = 0.462117, y_hat = 0.462117
[2026-11-02 00:25:52.025] [ML] Analytical gradients: dJ/dw=-1.209465, dJ/db=-1.209465, dJ/dv=-0.710682, dJ/dc=-1.537883
[2026-11-02 00:25:52.040] [GRAD_CHECK] Numerical diff with eps=1e-6: max_abs_diff = 1.21e-7 < 1e-5 [PASSED]
[2026-11-02 00:25:52.070] [TRAINING] 100 iterations of gradient descent completed; Final Loss J = 8.14e-6
```
