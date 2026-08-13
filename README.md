# UGS Desktop

A desktop-style front end for the UGS file collection: wallpaper, desktop icons, a dock,
and draggable windows. Nothing loads until you click an app. A small Node server serves the
page and runs an Ultraviolet proxy.

## Run locally

```bash
npm install
npm start          # PORT=8000 npm start to change the port
# open http://localhost:8080
```

The UI also works from any static host (`python3 -m http.server`), just without the Proxy app,
the Chat app, and the server-side half of the setup gate.

## Apps

| App | Data source |
| --- | --- |
| Games | `data/games.json`, fetched from the jsDelivr mirror of `bubbls/ugs-singlefile` |
| Movies | https://popcornmovies.io/ |
| Soundboard | SoundboardMax, Realm of Darkness, iMyFone (tabs) |
| Music | three Google Drive folders + a built-in audio player |
| Blooket | https://blooketbot.schoolcheats.net/ |
| Proxy | Ultraviolet + Wisp, served by `server.js` |
| Chat | rooms over WebSockets (`chat.js`), no account needed |
| Panic | closes the tab, or navigates to the panic URL if the browser refuses |
| Settings | wallpaper URL, clock format, panic URL — saved in `localStorage` |

## Setup gate

`index.html` is the IDK 6.7 setup flow; the desktop lives at `desktop.html`. `setup-gate.js` refuses
every request except the setup page and its assets until `POST /api/setup` is given the product key,
which sets a signed, HttpOnly session cookie — so the games, the proxy and the chat sockets are
unreachable without finishing setup, not just hidden.

| Variable | Default | Purpose |
| --- | --- | --- |
| `SETUP_KEY` | `IDK67-PRO-2026` | the product key |
| `SESSION_SECRET` | random per boot | signs session cookies; set it so restarts don't log everyone out |

On a static host there is no server to enforce this, so the key check falls back to a hash comparison
in the browser — cosmetic only.

## Music

The Drive tabs use `embeddedfolderview`, which only renders folders shared as "anyone with the link".
The Player tab streams a pasted URL (Drive `file/d/…` links are rewritten to their direct-download form)
or plays audio files picked from the device.

## External sites

Sites that send `X-Frame-Options` / `frame-ancestors` (popcornmovies.io, filme.imyfone.com,
blooketbot.schoolcheats.net) cannot be
embedded in an iframe by any page. Those windows show a launch card that opens the site in a new tab —
plus an "Open here through the proxy" button when the backend is running, since Ultraviolet strips those
headers. The rest render inline. Mark one in `js/apps.js` with `embeddable: false`.

## Chat

`chat.js` keeps rooms in memory: pick a name and a room, and everyone typing the same room name
lands in the same conversation. The last 50 messages per room are replayed on join and rooms disappear
when the last person leaves — nothing is written to disk.

## Proxy

`server.js` (Express) serves the site plus the Ultraviolet, BareMux and Epoxy assets, and routes
WebSocket upgrades on `/wisp/` to the Wisp server. `js/proxy.js` registers the Ultraviolet service
worker at `/uv/service/` and points BareMux at `wss://<host>/wisp/`.

Service workers need a secure context, so the proxy only works over HTTPS or on `localhost`.
An open proxy will relay anything anyone points at it — put it behind auth, a rate limiter or a
private URL if it is reachable from the internet.

## Deploying

Needs a Node host for the proxy. `render.yaml` deploys it on Render as-is (`npm install` / `npm start`,
binds `$PORT`); the `Dockerfile` covers Railway, Fly, or anything else that takes a container.

Without the proxy, the folder still works on any static host (GitHub Pages, Netlify, Cloudflare Pages);
the Proxy app then reports that the backend is unavailable.
