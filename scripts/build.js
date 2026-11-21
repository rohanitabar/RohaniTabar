const { spawn } = require('node:child_process');
const fs = require('node:fs/promises');
const path = require('node:path');
const zlib = require('node:zlib');
const { promisify } = require('node:util');
const gzip = promisify(zlib.gzip);

async function compressAssets(directory) {
  for (const entry of await fs.readdir(directory, { withFileTypes: true })) {
    const file = path.join(directory, entry.name);
    if (entry.isDirectory()) await compressAssets(file);
    else if (/\.(?:js|css|svg|json)$/.test(entry.name)) {
      const source = await fs.readFile(file);
      if (source.length < 1024) continue;
      const compressed = await gzip(source, { level: 9 });
      if (compressed.length < source.length) await fs.writeFile(`${file}.gz`, compressed);
    }
  }
}

// Keep the runtime in an external file so the production CSP can reject inline scripts.
const child = spawn(process.execPath, [require.resolve('react-scripts/scripts/build')], {
  cwd: require('node:path').resolve(__dirname, '..'),
  env: { ...process.env, INLINE_RUNTIME_CHUNK: 'false' },
  stdio: 'inherit'
});
child.on('error', (error) => { console.error(error); process.exitCode = 1; });
child.on('exit', async (code) => {
  process.exitCode = code || 0;
  if (code) return;
  try { await compressAssets(path.resolve(__dirname, '..', 'build')); }
  catch (error) { console.error('Could not compress production assets:', error); process.exitCode = 1; }
});
