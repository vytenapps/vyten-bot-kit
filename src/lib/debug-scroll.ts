// Debug utility: highlight scrollable containers and log them
// Usage: if (import.meta.env.VITE_DEBUG_SCROLL === '1') highlightScrollContainers();

function getDomPath(el: Element): string {
  const stack: string[] = [];
  let element: Element | null = el;
  while (element && element.nodeType === 1 && stack.length < 20) {
    const tag = element.tagName.toLowerCase();
    let selector = tag;
    if ((element as HTMLElement).id) selector += `#${(element as HTMLElement).id}`;
    if ((element as HTMLElement).className) {
      const cls = (element as HTMLElement).className
        .toString()
        .trim()
        .split(/\s+/)
        .slice(0, 3)
        .join('.');
      if (cls) selector += `.${cls}`;
    }
    stack.unshift(selector);
    element = element.parentElement;
  }
  return stack.join(' > ');
}

export function highlightScrollContainers(options?: { allowedAttr?: string }) {
  const allowedAttr = options?.allowedAttr ?? 'data-allowed-scroll';
  const nodes = Array.from(document.querySelectorAll('*')) as HTMLElement[];
  const scrollers: HTMLElement[] = [];

  nodes.forEach((el) => {
    const cs = getComputedStyle(el);
    const overflowY = cs.overflowY;
    const overflow = cs.overflow;
    const isScrollableProp =
      overflowY === 'auto' || overflowY === 'scroll' || overflow === 'auto' || overflow === 'scroll';
    const isScrollableSize = el.scrollHeight > el.clientHeight + 1; // +1 to account for rounding
    if (isScrollableProp && isScrollableSize) {
      scrollers.push(el);
      const isAllowed = el.hasAttribute(allowedAttr);
      // Visual outline for quick spotting
      el.style.outline = isAllowed ? '2px solid lime' : '2px solid red';
      el.style.outlineOffset = '-2px';
    }
  });

  // Console report
  // Grouped to avoid noise; expand when needed
  // eslint-disable-next-line no-console
  console.groupCollapsed('[ScrollDebug] Scrollable elements found:', scrollers.length);
  scrollers.forEach((el, idx) => {
    const cs = getComputedStyle(el);
    // eslint-disable-next-line no-console
    console.log(`#${idx + 1}`, getDomPath(el), {
      clientHeight: el.clientHeight,
      scrollHeight: el.scrollHeight,
      overflow: cs.overflow,
      overflowY: cs.overflowY,
      allowed: el.hasAttribute(allowedAttr),
    });
  });
  // eslint-disable-next-line no-console
  console.groupEnd();

  const cleanup = () => {
    scrollers.forEach((el) => {
      el.style.outline = '';
      el.style.outlineOffset = '';
    });
  };

  // Re-run on resize for dynamic layouts
  const rerun = () => {
    cleanup();
    highlightScrollContainers(options);
  };
  window.addEventListener('resize', rerun);

  return () => {
    window.removeEventListener('resize', rerun);
    cleanup();
  };
}
