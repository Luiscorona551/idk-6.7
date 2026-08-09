const GAME_CDN = 'https://cdn.jsdelivr.net/gh/bubbls/ugs-singlefile/UGS-Files/';

const store = {
  get(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      return raw === null ? fallback : JSON.parse(raw);
    } catch (e) {
      return fallback;
    }
  },
  set(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (e) { /* storage unavailable */ }
  }
};

const DEFAULT_WALLPAPER = 'https://images.unsplash.com/photo-1587202372775-e229f172b9d7?auto=format&fit=crop&w=2400&q=80';

function applyWallpaper(url) {
  const value = url ? `url("${url}")` : 'linear-gradient(135deg, #16224a, #2b1748)';
  document.documentElement.style.setProperty('--wallpaper', value);
}

async function loadJSON(path) {
  const res = await fetch(path, { cache: 'no-cache' });
  if (!res.ok) throw new Error(`Failed to load ${path} (${res.status})`);
  return res.json();
}

function gameFileName(name) {
  return name.includes('.') && name.lastIndexOf('.') > 0 ? name : `${name}.html`;
}

function gameTitle(name) {
  const base = name.replace(/^cl/i, '').replace(/\.[a-z0-9]+$/i, '');
  return base.replace(/[-_]+/g, ' ').trim() || name;
}

async function gameBlobURL(name) {
  const url = `${GAME_CDN}${encodeURIComponent(gameFileName(name))}?t=${Date.now()}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Could not fetch "${name}" (${res.status})`);
  const html = await res.text();
  return URL.createObjectURL(new Blob([html], { type: 'text/html' }));
}

function el(tag, props = {}, children = []) {
  const node = Object.assign(document.createElement(tag), props);
  children.forEach(child => node.append(child));
  return node;
}

function emptyState(message) {
  return el('div', { className: 'empty-state', innerHTML: message });
}

function listApp({ items, placeholder, empty, onOpen, subtitle }) {
  const root = el('div');
  const search = el('input', { type: 'search', placeholder });
  const count = el('span', { className: 'count' });
  const grid = el('div', { className: 'tile-grid' });
  root.append(el('div', { className: 'toolbar' }, [search, count]), grid);

  if (!items.length) {
    grid.append(emptyState(empty));
    return root;
  }

  const render = () => {
    const query = search.value.trim().toLowerCase();
    const matches = query
      ? items.filter(item => item.search.includes(query))
      : items;
    grid.replaceChildren();
    count.textContent = `${matches.length} of ${items.length}`;
    matches.slice(0, 400).forEach(item => {
      const tile = el('button', { className: 'tile', type: 'button' });
      tile.append(el('span', { textContent: item.title }));
      const sub = subtitle && subtitle(item);
      if (sub) tile.append(el('span', { className: 'sub', textContent: sub }));
      tile.addEventListener('click', () => onOpen(item, tile));
      grid.append(tile);
    });
    if (matches.length > 400) {
      grid.append(emptyState('Showing the first 400 results — keep typing to narrow it down.'));
    }
    if (!matches.length) grid.append(emptyState('Nothing matched that search.'));
  };

  search.addEventListener('input', render);
  render();
  return root;
}

const APPS = {
  games: {
    title: 'Games',
    glyph: '🎮',
    desktop: true,
    width: 900,
    height: 620,
    async render() {
      const names = await loadJSON('data/games.json');
      const items = names.map(name => ({
        id: name,
        title: gameTitle(name),
        search: `${name} ${gameTitle(name)}`.toLowerCase()
      }));
      return listApp({
        items,
        placeholder: 'Search games…',
        empty: 'No games found.',
        async onOpen(item, tile) {
          const label = tile.firstChild.textContent;
          tile.firstChild.textContent = 'Loading…';
          try {
            const src = await gameBlobURL(item.id);
            OS.open('player', { title: item.title, src });
          } catch (err) {
            alert(err.message);
          } finally {
            tile.firstChild.textContent = label;
          }
        }
      });
    }
  },

  movies: {
    title: 'Movies',
    glyph: '🎬',
    desktop: true,
    width: 860,
    height: 600,
    async render() {
      const media = await loadJSON('data/media.json');
      const items = (media.movies || []).map(entry => ({
        ...entry,
        search: `${entry.title} ${entry.year || ''} ${entry.tags || ''}`.toLowerCase()
      }));
      return listApp({
        items,
        placeholder: 'Search movies…',
        empty: 'No movies yet. Add them to <code>data/media.json</code>.',
        subtitle: item => item.year || '',
        onOpen(item) {
          OS.open('player', { title: item.title, src: item.url });
        }
      });
    }
  },

  music: {
    title: 'Music',
    glyph: '🎵',
    desktop: true,
    width: 760,
    height: 560,
    async render() {
      const media = await loadJSON('data/media.json');
      const items = (media.music || []).map(entry => ({
        ...entry,
        search: `${entry.title} ${entry.artist || ''}`.toLowerCase()
      }));
      return listApp({
        items,
        placeholder: 'Search music…',
        empty: 'No music yet. Add tracks to <code>data/media.json</code>.',
        subtitle: item => item.artist || '',
        onOpen(item) {
          OS.open('player', { title: item.title, src: item.url });
        }
      });
    }
  },

  settings: {
    title: 'Settings',
    glyph: '⚙️',
    desktop: true,
    width: 520,
    height: 380,
    render() {
      const root = el('div', { className: 'app' });
      const input = el('input', {
        className: 'field',
        type: 'url',
        placeholder: 'https://example.com/wallpaper.jpg',
        value: store.get('wallpaper', DEFAULT_WALLPAPER) || ''
      });
      const clock24 = el('input', { type: 'checkbox', checked: store.get('clock24', false) });

      const save = el('button', { className: 'btn', type: 'button', textContent: 'Apply' });
      save.addEventListener('click', () => {
        store.set('wallpaper', input.value.trim());
        store.set('clock24', clock24.checked);
        applyWallpaper(input.value.trim());
        OS.tickClock();
      });

      const reset = el('button', { className: 'btn', type: 'button', textContent: 'Reset wallpaper' });
      reset.addEventListener('click', () => {
        input.value = DEFAULT_WALLPAPER;
        store.set('wallpaper', DEFAULT_WALLPAPER);
        applyWallpaper(DEFAULT_WALLPAPER);
      });

      root.append(
        el('h2', { textContent: 'Settings' }),
        el('div', { className: 'settings-row' }, [
          el('label', { textContent: 'Wallpaper URL' }),
          input
        ]),
        el('div', { className: 'settings-row' }, [
          el('label', { textContent: '24-hour clock' }),
          clock24
        ]),
        el('div', { style: 'display:flex; gap:8px;' }, [save, reset])
      );
      return root;
    }
  },

  player: {
    title: 'Player',
    glyph: '▶️',
    desktop: false,
    dock: false,
    width: 960,
    height: 640,
    multi: true,
    render(opts = {}) {
      if (!opts.src) return emptyState('Nothing to play.');
      const frame = el('iframe', {
        src: opts.src,
        allow: 'autoplay; fullscreen; gamepad; clipboard-write',
        allowFullscreen: true
      });
      return frame;
    }
  }
};
