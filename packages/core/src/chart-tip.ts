import { formatDataValue } from './format';

export type ChartTipContent = {
  title: string;
  value: string;
  series?: string;
};

const TIP_CLASS = 'vizzy-tip';

export function chartTipText(content: ChartTipContent): string {
  const series = content.series?.trim();
  if (series && series !== content.title) {
    return `${content.title} · ${series}: ${content.value}`;
  }
  return `${content.title}: ${content.value}`;
}

export function formatTipNumber(value: unknown, domain: [number, number]): string {
  const n = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(n)) {
    return String(value ?? '');
  }
  return formatDataValue(n, domain);
}

export function seriesTipLabel(value: unknown): string | undefined {
  const text = String(value ?? '').trim();
  if (!text || /^#([\da-f]{3}|[\da-f]{6}|[\da-f]{8})$/i.test(text)) {
    return undefined;
  }
  return text;
}

export function bindChartTip(
  container: HTMLElement,
  node: Element,
  content: (event: MouseEvent) => ChartTipContent | null
): void {
  const host = tipHost(container);

  const show = (event: Event) => {
    if (!(event instanceof MouseEvent)) {
      return;
    }
    if ('pointerType' in event && event.pointerType === 'touch') {
      return;
    }
    const next = content(event);
    if (!next) {
      hideTip(host);
      return;
    }
    host.textContent = chartTipText(next);
    host.hidden = false;
    moveTip(container, host, event);
  };

  const hide = () => hideTip(host);

  node.addEventListener('pointerenter', show);
  node.addEventListener('pointermove', show);
  node.addEventListener('pointerleave', hide);
  node.addEventListener('pointerover', show);
  node.addEventListener('mouseenter', show);
  node.addEventListener('mousemove', show);
  node.addEventListener('mouseleave', hide);
  node.addEventListener('mouseover', show);
  node.addEventListener('blur', hide);
}

export function pointHitTarget(node: SVGCircleElement, radius = 14): SVGCircleElement {
  const parent = node.parentNode;
  const hit = node.ownerDocument.createElementNS('http://www.w3.org/2000/svg', 'circle');
  hit.setAttribute('class', 'point-hit');
  hit.setAttribute('cx', node.getAttribute('cx') ?? '0');
  hit.setAttribute('cy', node.getAttribute('cy') ?? '0');
  hit.setAttribute('r', String(radius));
  hit.setAttribute('fill', 'transparent');
  hit.setAttribute('stroke', 'none');
  hit.setAttribute('pointer-events', 'all');
  parent?.insertBefore(hit, node);
  return hit;
}

function tipHost(container: HTMLElement): HTMLDivElement {
  const existing = container.querySelector<HTMLDivElement>(`.${TIP_CLASS}`);
  if (existing) {
    return existing;
  }
  container.style.position = container.style.position || 'relative';
  const tip = document.createElement('div');
  tip.className = TIP_CLASS;
  tip.hidden = true;
  tip.setAttribute('role', 'status');
  container.appendChild(tip);
  return tip;
}

function hideTip(host: HTMLDivElement): void {
  host.hidden = true;
}

function moveTip(container: HTMLElement, host: HTMLDivElement, event: MouseEvent): void {
  const box = container.getBoundingClientRect();
  const x = event.clientX - box.left + 12;
  const y = event.clientY - box.top - 8;
  const maxX = Math.max(8, box.width - host.offsetWidth - 8);
  const maxY = Math.max(8, box.height - host.offsetHeight - 8);
  host.style.left = `${Math.min(Math.max(8, x), maxX)}px`;
  host.style.top = `${Math.min(Math.max(8, y - host.offsetHeight), maxY)}px`;
}
