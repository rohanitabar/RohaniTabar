const tunnelHost = /^([a-z0-9][a-z0-9-]*)-(\d{1,5})(\.[a-z0-9-]+\.devtunnels\.ms)$/i;

function demoTunnelHostname(hostname, port) {
  const match = tunnelHost.exec(hostname || '');
  if (!match || !Number.isInteger(port) || port < 1 || port > 65535) return '';
  return `${match[1]}-${port}${match[3]}`.toLowerCase();
}

function demoTunnelPath(slug) {
  return /^[a-z0-9](?:[a-z0-9-]{0,48}[a-z0-9])?$/.test(slug || '') ? `/demo/${slug}/` : '';
}

module.exports = { demoTunnelHostname, demoTunnelPath };
