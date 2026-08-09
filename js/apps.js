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

const PANIC_URL = 'https://classroom.google.com/';
const DEFAULT_WALLPAPER = 'https://plain-wnam-prod-public.komododecks.com/202608/09/2mq0HYHmjO3qexTDZY9G/image.png';

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

// Sites that send X-Frame-Options / frame-ancestors cannot render inside an
// iframe at all, so they get a launch card instead of a permanently broken frame.
function externalSite(url, label, { embeddable = true } = {}) {
  const root = el('div', { className: 'site-frame' });
  const openTab = () => window.open(url, '_blank', 'noopener');

  const bar = el('div', { className: 'toolbar' }, [
    el('span', { className: 'count', textContent: new URL(url).hostname })
  ]);
  const popOut = el('button', { className: 'btn tab', type: 'button', textContent: 'Open in new tab' });
  popOut.addEventListener('click', openTab);
  bar.append(el('span', { style: 'flex:1' }), popOut);

  if (embeddable) {
    root.append(bar, el('iframe', { src: url, allow: 'autoplay; fullscreen; clipboard-write' }));
    return root;
  }

  const launch = el('button', { className: 'btn', type: 'button', textContent: `Open ${label}` });
  launch.addEventListener('click', openTab);
  root.append(bar, el('div', { className: 'empty-state blocked' }, [
    el('p', { textContent: `${label} blocks being embedded in another page, so it opens in its own tab.` }),
    launch
  ]));
  return root;
}

function tabbedApp(tabs) {
  const root = el('div', { className: 'tabbed' });
  const bar = el('div', { className: 'toolbar' });
  const body = el('div', { className: 'tab-body' });
  root.append(bar, body);

  const buttons = tabs.map((tab, index) => {
    const btn = el('button', { className: 'btn tab', type: 'button', textContent: tab.title });
    btn.addEventListener('click', () => {
      buttons.forEach(other => other.classList.remove('active'));
      btn.classList.add('active');
      body.replaceChildren(tab.render());
    });
    if (index === 0) btn.classList.add('active');
    bar.append(btn);
    return btn;
  });

  body.append(tabs[0].render());
  return root;
}

// Drive blocks the normal UI in an iframe, but the embedded folder view renders
// fine for anyone-with-the-link folders.
function driveFolder(id, label) {
  const root = el('div', { className: 'site-frame' });
  const shareURL = `https://drive.google.com/drive/folders/${id}`;

  const bar = el('div', { className: 'toolbar' }, [
    el('span', { className: 'count', textContent: label }),
    el('span', { style: 'flex:1' })
  ]);
  const openTab = el('button', { className: 'btn tab', type: 'button', textContent: 'Open in Drive' });
  openTab.addEventListener('click', () => window.open(shareURL, '_blank', 'noopener'));
  bar.append(openTab);

  root.append(bar, el('iframe', {
    src: `https://drive.google.com/embeddedfolderview?id=${id}#grid`
  }));
  return root;
}

function audioPlayer() {
  const root = el('div', { className: 'app player-app' });
  const audio = el('audio', { controls: true, className: 'audio' });
  const now = el('p', { className: 'now-playing', textContent: 'Nothing loaded yet.' });

  const url = el('input', { className: 'field', type: 'url', placeholder: 'Paste an audio URL or Drive file link' });
  const play = el('button', { className: 'btn', type: 'button', textContent: 'Play' });
  play.addEventListener('click', () => {
    const value = url.value.trim();
    if (!value) return;
    audio.src = driveDirectURL(value);
    audio.play().catch(() => { now.textContent = 'That link could not be played directly.'; });
    now.textContent = value;
  });

  const picker = el('input', { type: 'file', accept: 'audio/*', multiple: true, className: 'field' });
  const queue = el('div', { className: 'tile-grid' });
  picker.addEventListener('change', () => {
    queue.replaceChildren();
    Array.from(picker.files).forEach(file => {
      const tile = el('button', { className: 'tile', type: 'button', textContent: file.name });
      tile.addEventListener('click', () => {
        audio.src = URL.createObjectURL(file);
        audio.play();
        now.textContent = file.name;
      });
      queue.append(tile);
    });
  });

  root.append(
    el('h2', { textContent: 'Player' }),
    audio,
    now,
    el('div', { className: 'settings-row' }, [
      el('label', { textContent: 'Stream a link' }),
      el('div', { style: 'display:flex; gap:8px;' }, [url, play])
    ]),
    el('div', { className: 'settings-row' }, [
      el('label', { textContent: 'Or play files from this device' }),
      picker
    ]),
    queue
  );
  return root;
}

// Turn a Drive share link into something an <audio> element can stream.
function driveDirectURL(value) {
  const match = value.match(/drive\.google\.com\/file\/d\/([^/]+)/) || value.match(/[?&]id=([^&]+)/);
  return match ? `https://drive.google.com/uc?export=download&id=${match[1]}` : value;
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
    glyph: '<img src="assets/ugs-icon.jpeg" alt="">',
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
    width: 1000,
    height: 660,
    render() {
      return externalSite('https://popcornmovies.io/', 'Popcorn Movies', { embeddable: false });
    }
  },

  soundboard: {
    title: 'Soundboard',
    glyph: '🔊',
    desktop: true,
    width: 1000,
    height: 660,
    render() {
      const sites = [
        { title: 'SoundboardMax', url: 'https://soundboardmax.com/' },
        { title: 'Realm of Darkness', url: 'https://www.realmofdarkness.net/sb/soundboards/' },
        { title: 'iMyFone Soundboards', url: 'https://filme.imyfone.com/soundboards/?search=csgo', embeddable: false }
      ];

      return tabbedApp(sites.map(site => ({
        title: site.title,
        render: () => externalSite(site.url, site.title, { embeddable: site.embeddable !== false })
      })));
    }
  },

  music: {
    title: 'Music',
    glyph: '🎵',
    desktop: true,
    width: 1000,
    height: 660,
    render() {
      const folders = [
        { title: 'Library 1', id: '1P6Vco6iRavlUZy___wDNXNjYHoPWORUH' },
        { title: 'Library 2', id: '1Q-m97t5_WKaSQzj8FYB3H0GYLsnnaReb' },
        { title: 'Library 3', id: '1SLPMQ8c9PZInb8xviLJmyiGXXh_FYFa0' }
      ];

      const tabs = folders.map(folder => ({
        title: folder.title,
        render: () => driveFolder(folder.id, folder.title)
      }));
      tabs.push({ title: 'Player', render: audioPlayer });

      return tabbedApp(tabs);
    }
  },

  cheats: {
    title: 'Blooket',
    glyph: '<span class="binary">01<br>10</span>',
    desktop: true,
    width: 1000,
    height: 660,
    render() {
      return externalSite('https://blooketbot.schoolcheats.net/', 'Blooket Bot', { embeddable: false });
    }
  },

  panic: {
    title: 'Panic — close this tab',
    glyph: '🛑',
    desktop: false,
    danger: true,
    action() {
      // window.close() only works for script-opened tabs; fall back to navigating away.
      window.open('', '_self');
      window.close();
      window.location.replace(store.get('panicURL', PANIC_URL) || PANIC_URL);
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
      const panic = el('input', {
        className: 'field',
        type: 'url',
        placeholder: PANIC_URL,
        value: store.get('panicURL', PANIC_URL) || ''
      });

      const save = el('button', { className: 'btn', type: 'button', textContent: 'Apply' });
      save.addEventListener('click', () => {
        store.set('wallpaper', input.value.trim());
        store.set('clock24', clock24.checked);
        store.set('panicURL', panic.value.trim());
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
        el('div', { className: 'settings-row' }, [
          el('label', { textContent: 'Panic button goes to' }),
          panic
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
