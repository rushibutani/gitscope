/**
 * Get contribution level color for heatmap
 */
export function getLevelColor(level: 0 | 1 | 2 | 3 | 4): string {
  const colors = {
    0: "#151b23",
    1: "#0e4429",
    2: "#006d32",
    3: "#26a641",
    4: "#39d353",
  };
  return colors[level];
}
