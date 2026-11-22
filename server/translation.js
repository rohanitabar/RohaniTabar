'use strict';

const path = require('node:path');
const { spawn } = require('node:child_process');

const root = path.resolve(__dirname, '..');
const previousDefault = 'http://127.0.0.1:5001/translate';
const maximumResponseBytes = 1024 * 1024;
const invalidResponse = 'The local translation service returned an invalid response.';
const unavailable = 'The local translation service is unavailable. Start it with docker compose up -d libretranslate.';
const containerRequest = `import http.client
import sys

connection = http.client.HTTPConnection('127.0.0.1', 5000, timeout=85)
connection.request('POST', '/translate', sys.stdin.buffer.read(), {'Content-Type': 'application/json'})
response = connection.getresponse()
if not 200 <= response.status < 300:
    sys.exit(1)
sys.stdout.buffer.write(response.read(${maximumResponseBytes + 1}))`;

async function readBody(stream) {
  const chunks = [];
  let bytes = 0;
  for await (const chunk of stream) {
    bytes += chunk.length;
    if (bytes > maximumResponseBytes) throw new Error(invalidResponse);
    chunks.push(chunk);
  }
  return Buffer.concat(chunks).toString('utf8');
}

async function requestThroughCompose(body, signal) {
  const child = spawn('docker', ['compose', 'exec', '-T', 'libretranslate', 'python', '-c', containerRequest], {
    cwd: root,
    signal,
    stdio: ['pipe', 'pipe', 'ignore'],
    windowsHide: true,
  });
  const completed = new Promise((resolve, reject) => {
    const fail = (cause) => reject(new Error(unavailable, { cause }));
    child.once('error', fail);
    child.stdin.once('error', fail);
    child.once('close', (code) => {
      if (code === 0) resolve();
      else fail();
    });
  });

  child.stdin.end(body);
  try {
    const [result] = await Promise.all([readBody(child.stdout), completed]);
    return result;
  } catch (error) {
    if (child.exitCode === null && child.signalCode === null) child.kill();
    throw error;
  }
}

async function requestThroughHttp(endpoint, body, signal) {
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body,
    signal,
  });
  if (!response.ok || !response.body) {
    await response.body?.cancel();
    throw new Error(invalidResponse);
  }
  return readBody(response.body);
}

async function translateToEnglish(texts) {
  const endpoint = process.env.LIBRETRANSLATE_URL?.trim();
  const body = JSON.stringify({ q: texts, source: 'fa', target: 'en', format: 'text' });
  const signal = AbortSignal.timeout(90000);
  const output = endpoint && endpoint !== previousDefault
    ? await requestThroughHttp(endpoint, body, signal)
    : await requestThroughCompose(body, signal);

  let result;
  try { result = JSON.parse(output); }
  catch (cause) { throw new Error(invalidResponse, { cause }); }
  const translated = result?.translatedText;
  const translations = typeof translated === 'string' && texts.length === 1 ? [translated] : translated;
  if (!Array.isArray(translations) || translations.length !== texts.length || translations.some((value) => typeof value !== 'string')) {
    throw new Error(invalidResponse);
  }
  return translations;
}

module.exports = { translateToEnglish };
