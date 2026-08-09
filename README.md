# UGS Desktop

A static, desktop-style front end for the UGS file collection: wallpaper, desktop icons, a dock,
and draggable windows. Nothing loads until you click an app.

## Run locally

```bash
python3 -m http.server 8000
# open http://localhost:8000
```

A server is required (the apps `fetch` the JSON data files).

## Apps

| App | Data source |
| --- | --- |
| Games | `data/games.json`, fetched from the jsDelivr mirror of `bubbls/ugs-singlefile` |
| Movies | https://popcornmovies.io/ |
| Soundboard | SoundboardMax, Realm of Darkness, iMyFone (tabs) |
| Music | three Google Drive folders + a built-in audio player |
| Blooket | https://blooketbot.schoolcheats.net/ |
| Panic | closes the tab, or navigates to the panic URL if the browser refuses |
| Settings | wallpaper URL, clock format, panic URL — saved in `localStorage` |

## Music

The Drive tabs use `embeddedfolderview`, which only renders folders shared as "anyone with the link".
The Player tab streams a pasted URL (Drive `file/d/…` links are rewritten to their direct-download form)
or plays audio files picked from the device.

## External sites

Sites that send `X-Frame-Options` / `frame-ancestors` (popcornmovies.io, filme.imyfone.com,
blooketbot.schoolcheats.net) cannot be
embedded in an iframe by any page. Those windows show a launch card that opens the site in a new tab;
the rest render inline. Mark one in `js/apps.js` with `embeddable: false`.

## Deploying

Any static host works — GitHub Pages, Netlify, Cloudflare Pages. Push the folder and point the host
at the repository root.
