import type { Device } from "./types";

export interface DeviceHealthSummary {
  total: number;
  online: number;
  offline: number;
  fault: number;
}

/** Pure aggregation — no I/O, so it's trivial to test and reusable from both the /iot list page and the Building IoT section. */
export function summarizeDeviceHealth(devices: Device[]): DeviceHealthSummary {
  return {
    total: devices.length,
    online: devices.filter((d) => d.status === "ONLINE").length,
    offline: devices.filter((d) => d.status === "OFFLINE").length,
    fault: devices.filter((d) => d.status === "FAULT").length,
  };
}
