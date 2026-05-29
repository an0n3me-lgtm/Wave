/**
 * WiFi Direct wrapper — uses the native WifiDirectPlugin on Android (Capacitor),
 * falls back to LAN WebRTC discovery in the browser/Electron.
 */

let CapacitorWifiDirect = null;

async function getPlugin() {
  if (CapacitorWifiDirect) return CapacitorWifiDirect;
  try {
    const { Plugins } = await import('@capacitor/core');
    if (Plugins && Plugins.WifiDirect) {
      CapacitorWifiDirect = Plugins.WifiDirect;
    }
  } catch {}
  return CapacitorWifiDirect;
}

export const isNativeWifiDirect = () =>
  typeof window !== 'undefined' && !!window.Capacitor && window.Capacitor.isNativePlatform?.();

export async function startWifiDirectDiscovery() {
  const plugin = await getPlugin();
  if (!plugin) throw new Error('WiFi Direct not available (web mode)');
  return plugin.startDiscovery();
}

export async function stopWifiDirectDiscovery() {
  const plugin = await getPlugin();
  if (plugin) return plugin.stopDiscovery();
}

export async function connectWifiDirect(address) {
  const plugin = await getPlugin();
  if (!plugin) throw new Error('WiFi Direct not available');
  return plugin.connect({ address });
}

export async function disconnectWifiDirect() {
  const plugin = await getPlugin();
  if (plugin) return plugin.disconnect();
}

export function addWifiDirectListener(event, callback) {
  // event: 'peersChanged' | 'connectionChanged'
  if (typeof window === 'undefined') return () => {};
  const handler = (e) => callback(e.detail || e);
  document.addEventListener(`capacitor:WifiDirect:${event}`, handler);
  return () => document.removeEventListener(`capacitor:WifiDirect:${event}`, handler);
}
