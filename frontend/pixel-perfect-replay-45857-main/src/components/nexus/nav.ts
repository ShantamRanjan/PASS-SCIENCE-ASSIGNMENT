import {
  Box,
  Cpu,
  Flame,
  Gauge,
  History,
  LayoutGrid,
  Network,
  Settings,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  to: "/" | "/geometry" | "/thermal" | "/performance" | "/hardware" | "/neural" | "/history" | "/settings";
  label: string;
  code: string;
  icon: LucideIcon;
}

export const NAV: NavItem[] = [
  { to: "/", label: "Overview", code: "OVR", icon: LayoutGrid },
  { to: "/geometry", label: "Geometry Workbench", code: "GEO", icon: Box },
  { to: "/thermal", label: "Thermal Analysis", code: "THM", icon: Flame },
  { to: "/performance", label: "Performance Lab", code: "PRF", icon: Gauge },
  { to: "/hardware", label: "Hardware Integration", code: "HW", icon: Cpu },
  { to: "/neural", label: "Neural Network Lab", code: "NN", icon: Network },
  { to: "/history", label: "Experiment History", code: "HIS", icon: History },
  { to: "/settings", label: "Settings", code: "CFG", icon: Settings },
];
