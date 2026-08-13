// The desktop lives behind this flow: server.js only serves it once /api/setup
// has handed out a session cookie. Without the Node backend the check falls
// back to a hash comparison, which is cosmetic — the real gate is the server.
const KEY_HASH = '1c87bd61b258068843bbbad832f427aad731b21c9753f4146918422fad989503';

const $ = id => document.getElementById(id);
const screens = document.querySelectorAll('.screen');
const installMusic = $('install-audio');

let unlocked = false;

function show(id) {
  screens.forEach(screen => screen.classList.remove('show'));
  $(id).classList.add('show');
}

async function sha256(value) {
  const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return [...new Uint8Array(bytes)].map(b => b.toString(16).padStart(2, '0')).join('');
}

// Returns true when the key is accepted. The server sets the session cookie;
// if it is not running (static hosting) we compare hashes locally instead.
async function submitKey(key) {
  try {
    const res = await fetch('/api/setup', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ key })
    });
    if (res.status === 404) throw new Error('no backend');
    return res.ok;
  } catch (e) {
    return await sha256(key.toUpperCase()) === KEY_HASH;
  }
}

$('install-now-btn').addEventListener('click', () => {
  $('click-overlay').style.display = 'none';
  installMusic.play().catch(() => {});
  show('startup-screen');
  setTimeout(() => {
    show('setup1');
    $('help-ui').classList.remove('hide');
  }, 5000);
});

$('reg-next').addEventListener('click', () => {
  if ($('reg-no').checked) {
    alert('Closing Setup...');
    window.close();
    window.location.href = 'about:blank';
    return;
  }
  show('setup2');
});

$('accounts-next').addEventListener('click', () => {
  const name = $('account-name').value.trim();
  if (name) localStorage.setItem('chatName', JSON.stringify(name));
  show('setup3');
});

$('key-next').addEventListener('click', async () => {
  const button = $('key-next');
  button.disabled = true;
  unlocked = await submitKey($('key-field').value.trim());
  button.disabled = false;

  if (!unlocked) {
    $('error-text').style.display = 'block';
    return;
  }
  $('error-text').style.display = 'none';
  show('setup4');
});

$('finish-btn').addEventListener('click', () => {
  installMusic.pause();
  show('region-screen');
});

const TRANSLATIONS = {
  ES: {
    title: 'Seleccione Región y Estado',
    desc: 'Elija su ubicación para configurar el idioma.',
    region: 'Región:',
    state: 'Estado / Provincia:',
    next: 'Siguiente'
  },
  FR: {
    title: "Sélectionnez la région et l'état",
    desc: 'Choisissez votre emplacement pour définir la langue.',
    region: 'Région :',
    state: 'État / Province :',
    next: 'Suivant'
  },
  DE: {
    title: 'Region und Bundesland auswählen',
    desc: 'Wählen Sie Ihren Standort aus.',
    region: 'Region:',
    state: 'Bundesland:',
    next: 'Weiter'
  },
  JP: {
    title: '地域と州を選択してください',
    desc: '言語を設定する場所を選択します。',
    region: '地域:',
    state: '州 / 県:',
    next: '次へ'
  },
  US: {
    title: 'Select Region and State',
    desc: 'Choose your location to set the language.',
    region: 'Region:',
    state: 'State / Province:',
    next: 'Next'
  }
};

$('region-select').addEventListener('change', () => {
  const copy = TRANSLATIONS[$('region-select').value] || TRANSLATIONS.US;
  $('region-title').textContent = copy.title;
  $('region-desc').textContent = copy.desc;
  $('region-label').textContent = copy.region;
  $('state-label').textContent = copy.state;
  $('region-btn').textContent = copy.next;
});

$('region-btn').addEventListener('click', () => {
  $('help-ui').classList.add('hide');
  show('welcome-screen');
  $('welcome-audio').play().catch(() => {});
  setTimeout(() => window.location.replace('/desktop.html'), 4500);
});

$('help-ui').addEventListener('click', () => {
  const help = {
    setup1: 'This is the registration screen. Choose whether you want to register now or later.',
    setup2: 'Please enter your name and alt accounts.',
    setup3: 'Enter the product key. Ask the owner for it.',
    setup4: "Setup is complete! Click 'Finish' to proceed to region settings.",
    'region-screen': 'Select your region and state to set your preferred language.'
  };
  const current = [...screens].find(screen => screen.classList.contains('show'));
  alert(`IDK 6.7 ASSISTANCE:\n\n${help[current?.id] ?? "Click 'start now' to begin."}`);
});
