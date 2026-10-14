'use strict';

const fs = require('node:fs');
const fsp = require('node:fs/promises');
const path = require('node:path');
const zlib = require('node:zlib');
const { execFile } = require('node:child_process');
const { promisify } = require('node:util');
const yaml = require('js-yaml');

const execFileAsync = promisify(execFile);
const DEPLOYMENTS_DIR = path.join(__dirname, 'data', 'deployments');
const MAX_ARCHIVE_BYTES = 150 * 1024 * 1024;
const MAX_EXTRACTED_BYTES = 250 * 1024 * 1024;
const MAX_ARCHIVE_FILES = 10000;
const RESERVED_SUBDOMAINS = new Set(['www', 'admin', 'api', 'mail', 'ftp', 'localhost']);

function validateSubdomain(value) {
  const slug = String(value || '').trim().toLowerCase();
  if (!/^[a-z0-9](?:[a-z0-9-]{0,48}[a-z0-9])?$/.test(slug) || RESERVED_SUBDOMAINS.has(slug)) {
    throw Object.assign(new Error('Use a valid subdomain label (letters, numbers and hyphens).'), { status: 400 });
  }
  return slug;
}

function crc32(buffer) {
  let crc = 0xffffffff;
  for (const byte of buffer) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function safeArchivePath(rawName) {
  const name = rawName.replace(/\\/g, '/');
  if (!name || name.startsWith('/') || /^[a-z]:/i.test(name) || name.includes('\0')) return null;
  const parts = name.split('/').filter((part) => part && part !== '.');
  if (!parts.length || parts.some((part) => part === '..' || part.includes(':'))) return null;
  return parts.join('/');
}

async function extractZip(buffer, destination) {
  if (!Buffer.isBuffer(buffer) || buffer.length < 22 || buffer.length > MAX_ARCHIVE_BYTES || buffer.readUInt32LE(0) !== 0x04034b50) {
    throw Object.assign(new Error('Upload a valid ZIP source archive (maximum 150 MB).'), { status: 400 });
  }
  let endOffset = -1;
  const searchStart = Math.max(0, buffer.length - 65557);
  for (let offset = buffer.length - 22; offset >= searchStart; offset -= 1) {
    if (buffer.readUInt32LE(offset) === 0x06054b50) { endOffset = offset; break; }
  }
  if (endOffset < 0) throw Object.assign(new Error('The ZIP archive index is invalid.'), { status: 400 });
  const disk = buffer.readUInt16LE(endOffset + 4);
  const directoryDisk = buffer.readUInt16LE(endOffset + 6);
  const entries = buffer.readUInt16LE(endOffset + 10);
  const directorySize = buffer.readUInt32LE(endOffset + 12);
  let cursor = buffer.readUInt32LE(endOffset + 16);
  if (disk || directoryDisk || entries > MAX_ARCHIVE_FILES || cursor + directorySize > buffer.length) {
    throw Object.assign(new Error('This ZIP format is not supported.'), { status: 400 });
  }
  await fsp.mkdir(destination, { recursive: true });
  let extractedBytes = 0;
  const seen = new Set();
  for (let index = 0; index < entries; index += 1) {
    if (cursor + 46 > buffer.length || buffer.readUInt32LE(cursor) !== 0x02014b50) throw Object.assign(new Error('The ZIP archive index is invalid.'), { status: 400 });
    const creator = buffer.readUInt16LE(cursor + 4) >>> 8;
    const flags = buffer.readUInt16LE(cursor + 8);
    const method = buffer.readUInt16LE(cursor + 10);
    const checksum = buffer.readUInt32LE(cursor + 16);
    const compressedSize = buffer.readUInt32LE(cursor + 20);
    const uncompressedSize = buffer.readUInt32LE(cursor + 24);
    const nameLength = buffer.readUInt16LE(cursor + 28);
    const extraLength = buffer.readUInt16LE(cursor + 30);
    const commentLength = buffer.readUInt16LE(cursor + 32);
    const externalAttributes = buffer.readUInt32LE(cursor + 38);
    const localOffset = buffer.readUInt32LE(cursor + 42);
    const end = cursor + 46 + nameLength + extraLength + commentLength;
    if (end > buffer.length) throw Object.assign(new Error('The ZIP archive index is invalid.'), { status: 400 });
    const rawName = buffer.subarray(cursor + 46, cursor + 46 + nameLength).toString((flags & 0x800) ? 'utf8' : 'latin1');
    const relative = safeArchivePath(rawName);
    if (!relative) throw Object.assign(new Error('The archive contains an unsafe file path.'), { status: 400 });
    if (relative.split('/').includes('.git')) { cursor = end; continue; }
    const unixMode = creator === 3 ? (externalAttributes >>> 16) & 0xf000 : 0;
    if (unixMode === 0xa000 || (flags & 1) || ![0, 8].includes(method)) throw Object.assign(new Error('Use an unencrypted ZIP with regular files only.'), { status: 400 });
    const directory = rawName.endsWith('/') || unixMode === 0x4000;
    if (seen.has(relative)) throw Object.assign(new Error('The archive contains duplicate file paths.'), { status: 400 });
    seen.add(relative);
    if (directory) {
      await fsp.mkdir(path.join(destination, relative), { recursive: true });
      cursor = end;
      continue;
    }
    extractedBytes += uncompressedSize;
    if (extractedBytes > MAX_EXTRACTED_BYTES || uncompressedSize > MAX_EXTRACTED_BYTES || localOffset + 30 > buffer.length) {
      throw Object.assign(new Error('The extracted project is too large (maximum 250 MB).'), { status: 413 });
    }
    if (buffer.readUInt32LE(localOffset) !== 0x04034b50) throw Object.assign(new Error('The ZIP archive contains an invalid file entry.'), { status: 400 });
    const localNameLength = buffer.readUInt16LE(localOffset + 26);
    const localExtraLength = buffer.readUInt16LE(localOffset + 28);
    const dataStart = localOffset + 30 + localNameLength + localExtraLength;
    const dataEnd = dataStart + compressedSize;
    if (dataEnd > buffer.length) throw Object.assign(new Error('The ZIP archive contains an incomplete file.'), { status: 400 });
    const compressed = buffer.subarray(dataStart, dataEnd);
    const contents = method === 0 ? Buffer.from(compressed) : zlib.inflateRawSync(compressed, { maxOutputLength: Math.max(1, MAX_EXTRACTED_BYTES - extractedBytes + uncompressedSize) });
    if (contents.length !== uncompressedSize || crc32(contents) !== checksum) throw Object.assign(new Error('A ZIP file failed its integrity check.'), { status: 400 });
    const target = path.resolve(destination, relative);
    if (!target.startsWith(`${path.resolve(destination)}${path.sep}`)) throw Object.assign(new Error('The archive contains an unsafe file path.'), { status: 400 });
    await fsp.mkdir(path.dirname(target), { recursive: true });
    await fsp.writeFile(target, contents, { flag: 'wx' });
    cursor = end;
  }
}

async function docker(args, options = {}) {
  try {
    const result = await execFileAsync('docker', args, { cwd: options.cwd, timeout: options.timeout || 10 * 60 * 1000, maxBuffer: 3 * 1024 * 1024, windowsHide: true });
    return String(result.stdout || '').trim();
  } catch (error) {
    const detail = String(error.stderr || error.stdout || error.message || 'Docker command failed').trim().slice(-1200);
    throw Object.assign(new Error(detail || 'Docker is unavailable. Start Docker Desktop and try again.'), { status: 503 });
  }
}

function validateCompose(compose, root) {
  if (!compose || !compose.services || typeof compose.services !== 'object' || Array.isArray(compose.services)) throw Object.assign(new Error('The Compose file must define services.'), { status: 400 });
  for (const volume of Object.values(compose.volumes || {})) {
    if (volume?.external || volume?.driver_opts) throw Object.assign(new Error('External Compose volumes and custom volume drivers are blocked for isolation.'), { status: 400 });
  }
  for (const kind of ['configs', 'secrets']) {
    for (const item of Object.values(compose[kind] || {})) {
      if (item?.external) throw Object.assign(new Error('External Compose configs and secrets are blocked for isolation.'), { status: 400 });
      if (item?.file) {
        const filePath = path.resolve(root, item.file);
        if (filePath !== root && !filePath.startsWith(`${root}${path.sep}`)) throw Object.assign(new Error('Compose files must stay inside the uploaded source.'), { status: 400 });
      }
    }
  }
  for (const [name, service] of Object.entries(compose.services)) {
    if (!/^[a-zA-Z0-9_-]{1,63}$/.test(name) || !service || typeof service !== 'object') throw Object.assign(new Error('The Compose file has an invalid service.'), { status: 400 });
    if (service.privileged || ['host'].includes(service.network_mode) || ['host'].includes(service.pid) || ['host'].includes(service.ipc) || service.devices || service.cap_add) throw Object.assign(new Error('For local isolation, Compose projects cannot request host access, devices or extra capabilities.'), { status: 400 });
    if (service.ports?.length) throw Object.assign(new Error('Remove published ports from the Compose file; the selected web service is exposed through the project subdomain.'), { status: 400 });
    for (const volume of service.volumes || []) {
      if (typeof volume === 'string') {
        const source = volume.split(':')[0];
        if (source.startsWith('.') || source.startsWith('/') || source.startsWith('~') || /^[a-z]:/i.test(source)) throw Object.assign(new Error('Compose bind mounts from the host are blocked for isolation.'), { status: 400 });
      } else if (volume?.type === 'bind') throw Object.assign(new Error('Compose bind mounts from the host are blocked for isolation.'), { status: 400 });
    }
    for (const envFile of [].concat(service.env_file || [])) {
      const filename = typeof envFile === 'string' ? envFile : envFile?.path;
      if (filename) {
        const filePath = path.resolve(root, filename);
        if (filePath !== root && !filePath.startsWith(`${root}${path.sep}`)) throw Object.assign(new Error('Compose environment files must stay inside the uploaded source.'), { status: 400 });
      }
    }
    if (service.build) {
      const context = typeof service.build === 'string' ? service.build : service.build.context || '.';
      const resolved = path.resolve(root, context);
      if (resolved !== root && !resolved.startsWith(`${root}${path.sep}`)) throw Object.assign(new Error('Compose build contexts must stay inside the uploaded source.'), { status: 400 });
    }
  }
}

async function removeRuntime(project) {
  const deployment = project?.deployment;
  if (!deployment?.runtimeName) return;
  if (deployment.runtimeKind === 'static') return;
  if (deployment.runtimeKind === 'compose') {
    await docker(['compose', '--project-name', deployment.runtimeName, '-f', deployment.composeFile, 'down', '--remove-orphans'], { cwd: path.dirname(deployment.composeFile) }).catch(() => {});
  } else {
    await docker(['rm', '-f', deployment.runtimeName]).catch(() => {});
  }
}

async function deployProject(project, port) {
  const deployment = project.deployment;
  const archiveFile = deployment?.archiveFile ? path.resolve(__dirname, '..', deployment.archiveFile) : '';
  if (!archiveFile || !archiveFile.startsWith(`${DEPLOYMENTS_DIR}${path.sep}`) || !fs.existsSync(archiveFile)) throw Object.assign(new Error('Upload a ZIP source project first.'), { status: 400 });
  const baseDir = path.join(DEPLOYMENTS_DIR, project.id);
  const sourceDir = path.join(baseDir, 'source');
  await removeRuntime(project);
  await fsp.rm(sourceDir, { recursive: true, force: true });
  await extractZip(await fsp.readFile(archiveFile), sourceDir);
  const rootEntries = await fsp.readdir(sourceDir, { withFileTypes: true });
  const buildRoot = rootEntries.length === 1 && rootEntries[0].isDirectory() ? path.join(sourceDir, rootEntries[0].name) : sourceDir;
  const composeName = ['compose.yaml', 'compose.yml', 'docker-compose.yaml', 'docker-compose.yml'].find((name) => fs.existsSync(path.join(buildRoot, name)));
  let runtimeName = `rohani-${project.id.replace(/[^a-z0-9]/gi, '').slice(0, 18).toLowerCase()}`;
  let localPort = 0;
  let runtimeKind = 'image';
  if (composeName) {
    const composeFile = path.join(buildRoot, composeName);
    const config = yaml.safeLoad(await fsp.readFile(composeFile, 'utf8'));
    validateCompose(config, buildRoot);
    const requestedService = deployment.serviceName;
    const serviceName = requestedService || (Object.keys(config.services).length === 1 ? Object.keys(config.services)[0] : '');
    if (!serviceName || !config.services[serviceName]) throw Object.assign(new Error('Enter the web service name from your Compose file.'), { status: 400 });
    const overrideFile = path.join(buildRoot, '.rohani-compose.override.yml');
    await fsp.writeFile(overrideFile, `services:\n  ${serviceName}:\n    ports:\n      - "127.0.0.1::${port}"\n`);
    await docker(['compose', '--project-name', runtimeName, '-f', composeFile, '-f', overrideFile, 'up', '-d', '--build'], { cwd: buildRoot });
    runtimeKind = 'compose';
    deployment.composeFile = composeFile;
    const output = await docker(['compose', '--project-name', runtimeName, '-f', composeFile, '-f', overrideFile, 'port', serviceName, String(port)], { cwd: buildRoot });
    localPort = Number(output.trim().split(':').pop());
    deployment.serviceName = serviceName;
  } else {
    if (fs.existsSync(path.join(buildRoot, 'Dockerfile'))) {
      const imageName = `${runtimeName}:latest`;
      await docker(['build', '--tag', imageName, '.'], { cwd: buildRoot });
      await docker(['run', '--detach', '--name', runtimeName, '--restart', 'unless-stopped', '--memory', '512m', '--cpus', '0.5', '--pids-limit', '128', '--publish', `127.0.0.1::${port}`, '--env', `PORT=${port}`, imageName]);
      const output = await docker(['port', runtimeName, `${port}/tcp`]);
      localPort = Number(output.trim().split(':').pop());
      deployment.imageName = imageName;
    } else if (fs.existsSync(path.join(buildRoot, 'index.html')) && !fs.existsSync(path.join(buildRoot, 'package.json'))) {
      runtimeKind = 'static';
      runtimeName = '';
    } else {
      throw Object.assign(new Error('This project needs a Dockerfile or Compose file. Plain static sites can be uploaded with a root index.html and no package.json.'), { status: 400 });
    }
  }
  if (runtimeKind !== 'static' && (!Number.isInteger(localPort) || localPort < 1 || localPort > 65535)) throw Object.assign(new Error('The container started, but its local port could not be detected.'), { status: 500 });
  return { runtimeKind, runtimeName, localPort, sourceDir: buildRoot, composeFile: deployment.composeFile || '' };
}

function proxyRequest(req, res, localPort) {
  const upstream = require('node:http').request({
    hostname: '127.0.0.1', port: localPort, method: req.method, path: req.url,
    headers: { ...req.headers, host: `127.0.0.1:${localPort}`, 'x-forwarded-host': req.headers.host || '', 'x-forwarded-proto': req.headers['x-forwarded-proto'] || 'http' }
  }, (response) => {
    res.writeHead(response.statusCode || 502, response.headers);
    response.pipe(res);
  });
  upstream.on('error', () => { if (!res.headersSent) { res.writeHead(502, { 'Content-Type': 'text/plain; charset=utf-8' }); res.end('This demo is temporarily unavailable.'); } else res.destroy(); });
  req.pipe(upstream);
}

function deploymentForHost(host, projects, baseDomain = 'localhost') {
  const hostname = String(host || '').split(':')[0].toLowerCase();
  for (const project of projects || []) {
    const deployment = project.deployment;
    if (!deployment || deployment.status !== 'running' || (deployment.runtimeKind !== 'static' && !deployment.localPort) || (deployment.runtimeKind === 'static' && !deployment.sourceDir)) continue;
    if (hostname === deployment.customDomain?.toLowerCase()) return deployment;
    if (hostname === `${project.demoSubdomain || deployment.subdomain}.${baseDomain}`.toLowerCase()) return deployment;
  }
  return null;
}

module.exports = { DEPLOYMENTS_DIR, MAX_ARCHIVE_BYTES, validateSubdomain, extractZip, deployProject, removeRuntime, proxyRequest, deploymentForHost };
