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
| Movies | `data/media.json` → `movies` |
| Music | `data/media.json` → `music` |
| Settings | wallpaper URL + clock format, saved in `localStorage` |

## Adding movies and music

Edit `data/media.json`:

```json
{
  "movies": [{ "title": "Example", "year": "2019", "url": "https://…" }],
  "music": [{ "title": "Example Song", "artist": "Someone", "url": "https://…" }]
}
```

Each entry opens in a Player window (an iframe pointing at `url`).

## Deploying

Any static host works — GitHub Pages, Netlify, Cloudflare Pages. Push the folder and point the host
at the repository root.
