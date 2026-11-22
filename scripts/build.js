const { spawn } = require('node:child_process');
const fs = require('node:fs/promises');
const path = require('node:path');
const zlib = require('node:zlib');
const { promisify } = require('node:util');
const webpack = require('webpack');
const gzip = promisify(zlib.gzip);
const root = path.resolve(__dirname, '..');
const buildDir = path.join(root, 'build');

async function buildServerRenderer() {
  const { files } = JSON.parse(await fs.readFile(path.join(buildDir, 'asset-manifest.json'), 'utf8'));
  await promisify(webpack)({
    context: root,
    mode: 'production',
    target: 'node18',
    entry: './src/app/renderPortfolio.jsx',
    output: {
      path: path.join(buildDir, '.server'),
      filename: 'render.cjs',
      chunkFilename: '[id].cjs',
      library: { type: 'commonjs2', export: 'default' }
    },
    resolve: { extensions: ['.js', '.jsx'] },
    externals: [
      ({ request }, callback) => {
        if (!request) return callback();
        if (/^(?:react(?:-dom)?(?:\/|$)|react-router$)/.test(request)) return callback(null, `commonjs ${request}`);
        if (/\.css$/.test(request)) return callback(null, 'var ""');
        const asset = files[`static/media/${path.basename(request)}`];
        return asset ? callback(null, `var ${JSON.stringify(asset)}`) : callback();
      }
    ],
    module: {
      rules: [{
        test: /\.jsx?$/,
        include: path.join(root, 'src'),
        loader: require.resolve('babel-loader'),
        options: { babelrc: false, configFile: false, presets: [[require.resolve('@babel/preset-react'), { runtime: 'automatic' }]] }
      }]
    },
    optimization: { minimize: false }
  }).then((stats) => {
    if (stats.hasErrors()) throw new Error(stats.toString({ all: false, errors: true }));
  });
}

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
  cwd: root,
  env: { ...process.env, INLINE_RUNTIME_CHUNK: 'false' },
  stdio: 'inherit'
});
child.on('error', (error) => { console.error(error); process.exitCode = 1; });
child.on('exit', async (code) => {
  process.exitCode = code || 0;
  if (code) return;
  try { await Promise.all([compressAssets(buildDir), buildServerRenderer()]); }
  catch (error) { console.error('Could not finalize the production build:', error); process.exitCode = 1; }
});
