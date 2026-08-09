import { createServer } from 'node:http';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import express from 'express';
import { server as wisp } from '@mercuryworkshop/wisp-js/server';
import { createRequire } from 'node:module';
import { uvPath } from '@titaniumnetwork-dev/ultraviolet';
import { baremuxPath } from '@mercuryworkshop/bare-mux/node';
import { chat } from './chat.js';
import { hasSession, setupRoutes } from './setup-gate.js';

const require = createRequire(import.meta.url);
// resolve() lands on the Node build (lib/); the browser build lives in dist/.
const epoxyPath = join(
  dirname(require.resolve('@mercuryworkshop/epoxy-transport')),
  '../dist'
);
const root = dirname(fileURLToPath(import.meta.url));
const app = express();

app.use(express.json({ limit: '4kb' }));
setupRoutes(app);

// Ultraviolet's own uv.config.js is overridden by ours so the service worker
// lives under /uv/ instead of the site root.
app.use('/uv/uv.config.js', express.static(join(root, 'public/uv/uv.config.js')));
app.use('/uv/', express.static(uvPath));
app.use('/baremux/', express.static(baremuxPath));
app.use('/epoxy/', express.static(epoxyPath));
const PRIVATE = /^\/(node_modules|public|package(-lock)?\.json|server\.js|chat\.js|setup-gate\.js|Dockerfile|render\.yaml)/;
app.use((req, res, next) => (PRIVATE.test(req.path) ? res.sendStatus(404) : next()));
app.use(express.static(root, { extensions: ['html'], dotfiles: 'ignore' }));

const server = createServer(app);

server.on('upgrade', (req, socket, head) => {
  if (!hasSession(req)) {
    socket.destroy();
  } else if (req.url.startsWith('/wisp/')) {
    wisp.routeRequest(req, socket, head);
  } else if (req.url.startsWith('/chat')) {
    chat.handleUpgrade(req, socket, head, ws => chat.emit('connection', ws, req));
  } else {
    socket.destroy();
  }
});

const port = Number(process.env.PORT) || 8080;
server.listen(port, () => console.log(`UGS listening on http://localhost:${port}`));
