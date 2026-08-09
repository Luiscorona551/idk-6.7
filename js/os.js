const OS = (() => {
  const desktop = document.getElementById('desktop');
  const iconLayer = document.getElementById('icons');
  const windowLayer = document.getElementById('windows');
  const dock = document.getElementById('dock');
  const template = document.getElementById('window-template');

  const open = new Map();
  let zIndex = 10;
  let spawnOffset = 0;

  function focus(win) {
    win.style.zIndex = ++zIndex;
    win.classList.remove('minimized');
  }

  function place(win, width, height) {
    const maxW = Math.min(width, desktop.clientWidth - 40);
    const maxH = Math.min(height, desktop.clientHeight - 120);
    win.style.width = `${maxW}px`;
    win.style.height = `${maxH}px`;
    win.style.left = `${Math.max(12, (desktop.clientWidth - maxW) / 2 + spawnOffset)}px`;
    win.style.top = `${Math.max(12, (desktop.clientHeight - maxH) / 2 - 30 + spawnOffset)}px`;
    spawnOffset = (spawnOffset + 26) % 104;
  }

  function drag(win, handle) {
    handle.addEventListener('pointerdown', event => {
      if (event.target.closest('.ctrl')) return;
      focus(win);
      const rect = win.getBoundingClientRect();
      const offsetX = event.clientX - rect.left;
      const offsetY = event.clientY - rect.top;
      const move = e => {
        win.classList.remove('maximized');
        win.style.left = `${Math.min(Math.max(0, e.clientX - offsetX), desktop.clientWidth - 60)}px`;
        win.style.top = `${Math.min(Math.max(0, e.clientY - offsetY), desktop.clientHeight - 40)}px`;
      };
      const up = () => {
        window.removeEventListener('pointermove', move);
        window.removeEventListener('pointerup', up);
      };
      window.addEventListener('pointermove', move);
      window.addEventListener('pointerup', up);
    });
  }

  function resize(win, handle) {
    handle.addEventListener('pointerdown', event => {
      event.preventDefault();
      focus(win);
      const rect = win.getBoundingClientRect();
      const move = e => {
        win.style.width = `${Math.max(320, e.clientX - rect.left)}px`;
        win.style.height = `${Math.max(220, e.clientY - rect.top)}px`;
      };
      const up = () => {
        window.removeEventListener('pointermove', move);
        window.removeEventListener('pointerup', up);
      };
      window.addEventListener('pointermove', move);
      window.addEventListener('pointerup', up);
    });
  }

  function markDock() {
    dock.querySelectorAll('.dock-btn').forEach(btn => {
      btn.classList.toggle('running', open.has(btn.dataset.app));
    });
  }

  async function launch(appId, opts = {}) {
    const app = APPS[appId];
    if (!app) return;

    if (!app.multi && open.has(appId)) {
      focus(open.get(appId));
      return;
    }

    const win = template.content.firstElementChild.cloneNode(true);
    const titlebar = win.querySelector('.titlebar');
    const content = win.querySelector('.content');
    win.querySelector('.title').textContent = opts.title || app.title;
    place(win, opts.width || app.width || 720, opts.height || app.height || 520);
    windowLayer.append(win);
    focus(win);
    drag(win, titlebar);
    resize(win, win.querySelector('.resizer'));

    const key = app.multi ? `${appId}:${Date.now()}` : appId;
    open.set(key, win);
    markDock();

    win.addEventListener('pointerdown', () => focus(win), true);
    win.querySelector('.close').addEventListener('click', () => {
      const frame = content.querySelector('iframe');
      if (frame && frame.src.startsWith('blob:')) URL.revokeObjectURL(frame.src);
      win.remove();
      open.delete(key);
      markDock();
    });
    win.querySelector('.min').addEventListener('click', () => win.classList.add('minimized'));
    win.querySelector('.max').addEventListener('click', () => win.classList.toggle('maximized'));

    content.append(Object.assign(document.createElement('div'), {
      className: 'empty-state',
      textContent: 'Loading…'
    }));

    try {
      const view = await app.render(opts);
      content.replaceChildren(view);
    } catch (err) {
      content.replaceChildren(Object.assign(document.createElement('div'), {
        className: 'empty-state',
        textContent: err.message
      }));
    }
  }

  function tickClock() {
    const now = new Date();
    const use24 = store.get('clock24', false);
    document.getElementById('clock-time').textContent = now.toLocaleTimeString([], {
      hour: use24 ? '2-digit' : 'numeric',
      minute: '2-digit',
      hour12: !use24
    });
    document.getElementById('clock-date').textContent = now.toLocaleDateString([], {
      weekday: 'long', month: 'long', day: 'numeric'
    });
  }

  function build() {
    Object.entries(APPS).forEach(([id, app]) => {
      if (app.desktop) {
        const icon = document.createElement('button');
        icon.className = 'desktop-icon';
        icon.type = 'button';
        icon.dataset.app = id;
        icon.innerHTML = `<span class="glyph">${app.glyph}</span><span class="label">${app.title}</span>`;
        icon.addEventListener('click', () => launch(id));
        iconLayer.append(icon);
      }

      if (app.dock === false) return;

      const btn = document.createElement('button');
      btn.className = 'dock-btn';
      btn.type = 'button';
      btn.dataset.app = id;
      btn.title = app.title;
      btn.textContent = app.glyph;
      btn.addEventListener('click', () => launch(id));
      dock.append(btn);
    });

    applyWallpaper(store.get('wallpaper', DEFAULT_WALLPAPER));
    tickClock();
    setInterval(tickClock, 1000);
  }

  build();
  return { open: launch, tickClock };
})();
