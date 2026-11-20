import type * as d3 from 'd3';

export function paintHalo(
  selection: d3.Selection<d3.BaseType, unknown, d3.BaseType, unknown>,
  halo: string
): void {
  selection
    .attr('paint-order', 'stroke')
    .attr('stroke', halo)
    .attr('stroke-width', 3)
    .attr('stroke-linejoin', 'round');
}
