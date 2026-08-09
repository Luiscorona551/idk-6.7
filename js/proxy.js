// Client half of the Ultraviolet proxy. Everything here is a no-op unless the
// site is served by server.js, which supplies /uv/, /baremux/, /epoxy/ and /wisp/.
const PROXY = (() => {
  let ready = null;

  function loadScript(src) {
    return new Promise((resolve, reject) => {
      const existing = document.querySelector(`script[src="${src}"]`);
      if (existing) return resolve();
      const tag = document.createElement('script');
      tag.src = src;
      tag.onload = resolve;
      tag.onerror = () => reject(new Error(`Could not load ${src}`));
      document.head.append(tag);
    });
  }

  async function backendAvailable() {
    try {
      const res = await fetch('/uv/uv.config.js', { method: 'HEAD' });
      return res.ok;
    } catch (e) {
      return false;
    }
  }

  async function init() {
    if (!window.isSecureContext) {
      throw new Error('The proxy needs HTTPS (or localhost) to register its service worker.');
    }
    if (!('serviceWorker' in navigator)) {
      throw new Error('This browser has no service worker support.');
    }

    await loadScript('/uv/uv.bundle.js');
    await loadScript('/uv/uv.config.js');
    await loadScript('/baremux/index.js');

    await navigator.serviceWorker.register('/uv/sw.js', { scope: __uv$config.prefix });

    const connection = new BareMux.BareMuxConnection('/baremux/worker.js');
    const wisp = `${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}/wisp/`;
    await connection.setTransport('/epoxy/index.mjs', [{ wisp }]);
  }

  function normalize(input) {
    const value = input.trim();
    if (/^https?:\/\//i.test(value)) return value;
    if (/^[^\s.]+\.[^\s]{2,}$/.test(value)) return `https://${value}`;
    return `https://duckduckgo.com/?q=${encodeURIComponent(value)}`;
  }

  async function encode(input) {
    ready = ready || init();
    await ready;
    return __uv$config.prefix + __uv$config.encodeUrl(normalize(input));
  }

  return { encode, backendAvailable };
})();
