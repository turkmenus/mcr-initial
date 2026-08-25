/**
 * Script helper embedded or imported by OGraf templates.
 * Listens for window postMessage from MCR Studio or direct CasparCG global calls.
 */
export const OGRAF_BRIDGE_INLINE_SCRIPT = `
(function() {
  window.__OGRAF_BRIDGE_READY__ = true;

  // Listen to postMessage from MCR web host
  window.addEventListener('message', function(event) {
    if (!event.data || typeof event.data !== 'object') return;
    var type = event.data.type;
    var data = event.data.data;

    try {
      if (type === 'PLAY' && typeof window.play === 'function') {
        window.play();
      } else if (type === 'STOP' && typeof window.stop === 'function') {
        window.stop();
      } else if (type === 'NEXT' && typeof window.next === 'function') {
        window.next();
      } else if (type === 'UPDATE' && typeof window.update === 'function') {
        window.update(data);
      }
    } catch(err) {
      console.error('[OGraf Runtime Bridge] Execution error:', err);
    }
  });

  // Notify parent that template has mounted and is ready
  if (window.parent && window.parent !== window) {
    window.parent.postMessage({ type: 'TEMPLATE_MOUNTED' }, '*');
  }
})();
`;

export interface TemplateHandlers {
  play: () => void;
  stop: () => void;
  update: (data: any) => void;
  next?: () => void;
}

/**
 * Attaches standard CasparCG/OGraf lifecycle functions to window
 */
export function registerOGrafHandlers(handlers: TemplateHandlers): void {
  if (typeof window === "undefined") return;

  (window as any).play = handlers.play;
  (window as any).stop = handlers.stop;
  (window as any).update = handlers.update;
  if (handlers.next) {
    (window as any).next = handlers.next;
  }
}
