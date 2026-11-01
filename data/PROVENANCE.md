# Data Provenance and Schema Specification

## 1. ASCII STL File (`sample.stl`)
- **Provenance**: Self-created canonical 3D unit cube (12 triangular facets, 2 per face across 6 planar faces). Openly licensed under CC0 / Public Domain.
- **Format**: Standard ASCII Stereolithography (STL) format.
- **Dimensional Units**: Meters ($m$).
- **Geometry Bounds**:
  - $X \in [0.0, 1.0]\,m$
  - $Y \in [0.0, 1.0]\,m$
  - $Z \in [0.0, 1.0]\,m$
  - Total Surface Area: $6.0\,m^2$
  - Total Enclosed Volume: $1.0\,m^3$
- **Validation**: Verified by C++ `nexus::geometry::parseStl` without non-finite vertices or degenerate normals.

## 2. Nodal Temperature CSV (`ansys_nodal_temps.csv`)
- **Classification**: **Synthetic test data** (explicitly labeled synthetic per Task B requirements; not an actual proprietary ANSYS proprietary binary/database export).
- **Format**: Comma-Separated Values (RFC 4180 compliant).
- **Schema**:
  | Column Name | Data Type | Units | Description |
  |-------------|-----------|-------|-------------|
  | `node_id` | Integer | - | Unique identifier for discrete FEA node |
  | `x_m` | Floating point | Meters ($m$) | Spatial coordinate along X-axis |
  | `y_m` | Floating point | Meters ($m$) | Spatial coordinate along Y-axis |
  | `z_m` | Floating point | Meters ($m$) | Spatial coordinate along Z-axis |
  | `temperature_C` | Floating point | Celsius ($^\circ\text{C}$) | Steady-state scalar temperature field at node |

- **Physical Context**: Represents steady-state thermal field across the unit cube geometry with high temperature boundary condition ($T = 100^\circ\text{C}$) at $X = 0$ and convective/cooled boundary ($T \approx 20^\circ\text{C}$) at $X = 1$.
- **Validation Rules**:
  - Rejects empty bodies or non-numeric entries.
  - Rejects `NaN`, `+Inf`, `-Inf` values.
  - Tested maximum client-side point cloud threshold: $> 100,000$ points with responsive WebGL / Three.js buffer-geometry rendering.
