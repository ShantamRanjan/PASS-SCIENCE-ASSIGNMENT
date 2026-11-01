# Task E: Embedded-System Integration Design

## 1. Modular Workbench Architecture & Block Diagram

The NEXUS Engineering Workbench connects a host development PC (Windows 11 x64) to three distinct hardware targets:
1. **Microcontroller Board (MCU)**: High-speed control loop, sensor telemetry acquisition, and system health monitoring.
2. **FPGA Board**: Hardware-accelerated numerical compute, high-throughput DSP pipeline, and reconfigurable digital logic.
3. **JTAG Debug Adapter**: Hardware-level debug, Boundary-Scan chain testing, in-system programming (ISP), and CPU register inspection.

```
       +-------------------------------------------------------------------------+
       |                           HOST PC (WINDOWS 11 x64)                     |
       |  NEXUS Unified Workbench (Launch.exe / WebGL UI / C++17 Core Engine)     |
       +-------------------------------------------------------------------------+
                                          |
                        +-----------------+-----------------+
                        |                 |                 |
                 USB 2.0 High-Speed  USB 2.0 FS        USB 2.0 High-Speed
                 (FTDI FT2232HL /    (CDC-ACM VCP)     (FTDI FT4232H /
                  Native USB-C)       COM3 @ 115200     JTAG Interface)
                        |                 |                 |
                        v                 v                 v
           +---------------------+ +---------------+ +-----------------------+
           |     FPGA BOARD      | |   MCU BOARD   | |  JTAG DEBUG ADAPTER   |
           | (e.g. Xilinx Artix) | | (STM32H7 / G4)| | (Segger J-Link / FTDI)|
           +---------------------+ +---------------+ +-----------------------+
                      ^                                      |
                      |          JTAG TAP Bus (Dedicated)    |
                      +======================================+
                         TCK, TMS, TDI (Driven by Adapter)
                         TDO (Driven by FPGA Target)
                         VREF / V_TARGET (Sensed by Adapter)
                         nTRST / nSRST (Open-drain reset)
```

---

## 2. Interface, Voltage Domains, and Pin-Voltage Specification

| Signal / Pin Group | Target / Device | Connector Type | Voltage Domain | Level Shifting Required? | Signal Ownership & Protocol |
|--------------------|-----------------|----------------|----------------|--------------------------|-----------------------------|
| **VBUS / Power** | MCU Board | USB-C (5.0V) | 5.0 V in -> 3.3 V reg | Integrated on-board LDO | Host supplies 5.0V; 3.3V board rail |
| **VBUS / Power** | FPGA Board | 2.1mm DC Jack | 12.0 V / 5.0 V ext | Dedicated multi-rail PMIC | External DC brick (1.0V core, 1.8V aux, 3.3V I/O) |
| **GND / Common** | All Devices | Common Ground | 0 V Reference | Star Grounding Plane | Common chassis & signal return ground plane |
| **UART TX / RX** | MCU Board | Pin Header / USB VCP | 3.3 V LVCMOS | No (Native 3.3V) | MCU TX -> Host RX; Asynchronous 115200 baud |
| **SPI (SCK, MOSI, MISO, CS)** | MCU to FPGA | 0.1" 6-pin Header | 3.3 V LVCMOS | Bidirectional TXB0104 | MCU is SPI Master; FPGA is SPI Slave |
| **JTAG TCK** | JTAG to FPGA | 2x7 14-pin 2.0mm | $V_{\text{target}}$ (1.8V - 3.3V)| Auto-sensing buffer | Driven strictly by JTAG Adapter (Clock output) |
| **JTAG TMS** | JTAG to FPGA | 2x7 14-pin 2.0mm | $V_{\text{target}}$ (1.8V - 3.3V)| Auto-sensing buffer | Driven strictly by JTAG Adapter (TAP state select) |
| **JTAG TDI** | JTAG to FPGA | 2x7 14-pin 2.0mm | $V_{\text{target}}$ (1.8V - 3.3V)| Auto-sensing buffer | Driven strictly by JTAG Adapter (Serial data in) |
| **JTAG TDO** | FPGA to JTAG | 2x7 14-pin 2.0mm | $V_{\text{target}}$ (1.8V - 3.3V)| Auto-sensing buffer | Driven strictly by Target FPGA (Serial data out) |
| **JTAG VREF** | JTAG Adapter | Pin 1 of JTAG | $V_{\text{target}}$ (Sense)| High-impedance input | Provided by Target board to set adapter I/O threshold |
| **nSRST / Reset** | JTAG to Target | Open-Drain pin | Pull-up to 3.3V | Open-drain with pullup | Open-drain active-low system reset |

---

## 3. Why a JTAG Adapter is a Debug Interface, NOT a Compute Board

It is a critical electrical and architectural error to assume that a JTAG adapter is an interchangeable generic computing node alongside microcontrollers or FPGAs:
1. **Master-Slave TAP State Machine**: JTAG (IEEE 1149.1 standard) operates via a 16-state Test Access Port (TAP) finite state machine. The adapter controls the clock (`TCK`) and state transitions (`TMS`). It does not execute application workloads or autonomous computing firmware; it shifts bit streams into Instruction Registers (IR) and Data Registers (DR).
2. **Dedicated Role**: The adapter exists solely for in-circuit emulation (ICE), non-volatile memory programming, and boundary-scan hardware diagnostics.
3. **No Uniform Connector or Voltage Protocol**: Different boards and semiconductor families employ radically different JTAG headers (e.g., 20-pin ARM standard, 10-pin Cortex CoreSight, 14-pin Xilinx, 10-pin Altera). Furthermore, target voltages vary from 1.2V to 3.3V. The adapter must dynamically sense `VREF` from the target to set its output drivers; attempting to treat it as a peer computing board sharing fixed 3.3V or UART/USB protocols risks electrical bus contention or latch-up damage.

---

## 4. Software Implementation: C++ Mock Adapters & Fault Recovery

The C++ backend (`nexus::hardware`) implements modular adapters:
- **Device Discovery & Registry**: Auto-detects virtual devices (`mcu-01`, `fpga-01`, `jtag-01`).
- **Telemetry Reporting**:
  - `mcu-01`: Core Temperature (34.2 °C), Supply Voltage (3.30 V), Control Loop Rate (1000 Hz).
  - `fpga-01`: Fabric Temperature (41.0 °C), Clock Frequency (100 MHz), LUT Logic Utilization (12%).
  - `jtag-01`: TCK Clock Rate (20 MHz), Tap State (IDLE), Devices in Chain (1), Reference Voltage (3.30 V).
- **Simulated Fault Injection & Recovery**:
  The system includes an automatic recovery mechanism when communication timeouts occur (e.g., cable disconnection or framing loss). When a timeout is simulated, the UI safely catches the exception, updates device status to `TIMED_OUT`, and enables a one-click **"Reconnect / Recover"** action without corrupting background physics solvers or terminating the workbench.

---

## 5. Safe Integration Plan & Physical Limitations
- **Current Prototype Scope**: Software mock simulation verified in unit tests and web UI.
- **Hardware Integration Steps (Future Physical Deployment)**:
  1. *Power Sequencing*: Ensure host ground and board ground are bonded before applying VBUS.
  2. *Level Shifting Verification*: Confirm that JTAG VREF matches FPGA Bank 0 I/O voltage before driving JTAG signals.
  3. *Galvanic Isolation*: Deploy optical / digital capacitive isolators (e.g. ADuM1401) on USB and UART lines in high-noise experimental testbenches.
