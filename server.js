import { createServer } from 'node:http';
import { readFile, realpath } from 'node:fs/promises';
import { dirname, extname, isAbsolute, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(fileURLToPath(import.meta.url));
const types = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.obj': 'text/plain; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
};

export function createAppServer() {
  return createServer(async (request, response) => {
    if (request.method !== 'GET' && request.method !== 'HEAD') {
      response.writeHead(405, { Allow: 'GET, HEAD' });
      response.end('Method not allowed');
      return;
    }

    try {
      const pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
      const requested = pathname === '/' ? '/index.html' : pathname;
      const publicPath = requested === '/index.html' || requested === '/styles.css'
        || requested === '/favicon.svg' || requested.startsWith('/src/')
        || requested.startsWith('/shaders/') || requested.startsWith('/assets/');
      if (!publicPath || requested.split('/').some(part => part.startsWith('.'))) {
        response.writeHead(404);
        response.end('Not found');
        return;
      }

      const filename = await realpath(resolve(root, `.${requested}`));
      const localPath = relative(root, filename);
      if (localPath.startsWith('..') || isAbsolute(localPath)) {
        response.writeHead(403);
        response.end('Forbidden');
        return;
      }
      const content = await readFile(filename);
      response.writeHead(200, {
        'Content-Type': types[extname(filename)] ?? 'application/octet-stream',
        'Cache-Control': 'no-store',
        'X-Content-Type-Options': 'nosniff',
      });
      response.end(request.method === 'HEAD' ? undefined : content);
    } catch (error) {
      response.writeHead(error instanceof URIError ? 400 : 404);
      response.end(error instanceof URIError ? 'Invalid URL' : 'Not found');
    }
  });
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const port = Number(process.env.PORT ?? 4173);
  const server = createAppServer();
  server.on('error', error => {
    console.error(`Cannot start the server: ${error.message}`);
    process.exitCode = 1;
  });
  server.listen(port, '127.0.0.1', () => {
    console.log(`Solar Explorer — http://127.0.0.1:${server.address().port}`);
    console.log('Press Ctrl+C to stop.');
  });
}
