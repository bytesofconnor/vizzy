export function freeChartsLeft(ipCount: number, deviceCount: number, cap: number): number {
  const ip = Number.isFinite(ipCount) ? ipCount : cap;
  const device = Number.isFinite(deviceCount) ? deviceCount : cap;
  return Math.max(0, cap - Math.max(ip, device));
}
