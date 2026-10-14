const { spawn } = require('node:child_process');
const http = require('node:http');
const net = require('node:net');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const apiPort = 5000;
const expectedApiVersion = 21;
const uiPort = Number(process.env.UI_PORT || 3000);
let ownedApi = null;
let ui = null;
let stopping = false;

function probeApi() {
  return new Promise((resolve) => {
    const request = http.get({ hostname: '127.0.0.1', port: apiPort, path: '/api/health', timeout: 1000 }, (response) => {
      let body = '';
      response.on('data', (chunk) => { body += chunk.toString(); });
      response.on('end', () => {
        let result = {};
        try { result = JSON.parse(body); } catch (_) { /* An unrelated process may own this port. */ }
        resolve({ running: response.statusCode === 200 && result.ok === true, compatible: result.apiVersion === expectedApiVersion });
      });
    });
    request.on('timeout', () => request.destroy());
    request.on('error', () => resolve({ running: false, compatible: false }));
  });
}

function portIsOpen(port) {
  return new Promise((resolve) => {
    const socket = net.createConnection({ host: '127.0.0.1', port });
    socket.setTimeout(1000);
    socket.on('connect', () => { socket.destroy(); resolve(true); });
    socket.on('timeout', () => socket.destroy());
    socket.on('error', () => resolve(false));
  });
}

function stop(code = 0) {
  if (stopping) return;
  stopping = true;
  if (ui && !ui.killed) ui.kill();
  if (ownedApi && !ownedApi.killed) ownedApi.kill();
  process.exitCode = code;
}

process.on('SIGINT', () => stop());
process.on('SIGTERM', () => stop());

async function main() {
  const existing = await probeApi();
  if (existing.running && !existing.compatible) {
    throw new Error('An older portfolio API is still running on port 5000. Stop that API process, then run npm start again.');
  }
  if (await portIsOpen(uiPort)) {
    throw new Error(`A website is already running on port ${uiPort}. Stop the previous development server, then run npm start again.`);
  }
  if (existing.running) {
    console.log(`Using the API already running on port ${apiPort}.`);
  } else {
    ownedApi = spawn(process.execPath, [path.join(root, 'server', 'index.js')], {
      cwd: root,
      env: { ...process.env, PORT: String(apiPort), NODE_ENV: 'development' },
      stdio: 'inherit'
    });
    ownedApi.on('exit', (code) => {
      if (!stopping) { console.error(`The API stopped (exit ${code}).`); stop(1); }
    });
    let ready = false;
    for (let attempt = 0; attempt < 50; attempt += 1) {
      const probe = await probeApi();
      if (probe.running && probe.compatible) { ready = true; break; }
      if (ownedApi.exitCode !== null) break;
      await new Promise((resolve) => setTimeout(resolve, 200));
    }
    if (!ready) throw new Error(`The API could not start on port ${apiPort}.`);
  }

  console.log(`Starting the website on http://localhost:${uiPort}`);
  ui = spawn(process.execPath, [path.join(root, 'node_modules', 'react-scripts', 'scripts', 'start.js')], {
    cwd: root,
    env: { ...process.env, PORT: String(uiPort) },
    stdio: 'inherit'
  });
  ui.on('exit', (code) => { if (!stopping) stop(code || 0); });
}

main().catch((error) => { console.error(error.message); stop(1); });
