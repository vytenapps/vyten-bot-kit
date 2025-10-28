import { useEffect } from "react";

export function useScrollDebug(label = "Element") {
  useEffect(() => {
    function isScrollable(node: Element) {
      const cs = getComputedStyle(node);
      const canScrollY = (cs.overflowY === "auto" || cs.overflowY === "scroll" || cs.overflowY === "overlay");
      const hasScrollableContent = node.scrollHeight > (node as HTMLElement).clientHeight;
      return canScrollY && hasScrollableContent;
    }

    const scrollableElements: Array<{ element: Element; info: any }> = [];
    
    // Check all elements in the document
    const allElements = document.querySelectorAll('*');
    allElements.forEach((el) => {
      if (isScrollable(el)) {
        const cs = getComputedStyle(el);
        scrollableElements.push({
          element: el,
          info: {
            tag: el.tagName,
            className: (el as HTMLElement).className,
            overflowY: cs.overflowY,
            height: cs.height,
            minHeight: cs.minHeight,
            maxHeight: cs.maxHeight,
            scrollHeight: el.scrollHeight,
            clientHeight: (el as HTMLElement).clientHeight,
          }
        });
      }
    });

    if (scrollableElements.length > 1) {
      console.warn(`[ScrollDebug ${label}] Found ${scrollableElements.length} scrollable elements:`);
      scrollableElements.forEach((item, i) => {
        console.log(`  #${i + 1}`, item.element, item.info);
      });
      console.log('Expected: Only 1 scrollable element (the Conversation container)');
    } else if (scrollableElements.length === 1) {
      console.log(`[ScrollDebug ${label}] ✓ Only 1 scrollable element found:`, scrollableElements[0].element);
    } else {
      console.log(`[ScrollDebug ${label}] No scrollable elements found`);
    }
  }, [label]);
}
