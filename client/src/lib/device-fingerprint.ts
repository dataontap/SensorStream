export function generateDeviceFingerprint(): string {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  ctx?.fillText('Device fingerprint', 2, 2);
  
  const fingerprint = [
    navigator.userAgent,
    navigator.language,
    screen.width + 'x' + screen.height,
    new Date().getTimezoneOffset(),
    canvas.toDataURL(),
    navigator.hardwareConcurrency || 'unknown',
    (navigator as any).deviceMemory || 'unknown',
  ].join('|');
  
  // Simple hash function
  let hash = 0;
  for (let i = 0; i < fingerprint.length; i++) {
    const char = fingerprint.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  
  return `DEV-${Math.abs(hash).toString(36).toUpperCase()}-${Date.now().toString(36).toUpperCase()}`;
}

export function getDeviceName(): string {
  const ua = navigator.userAgent;
  console.log('Device User Agent:', ua);
  
  if (/Android/i.test(ua)) {
    const match = ua.match(/Android\s([0-9\.]*)/);
    const version = match ? match[1] : '';
    // Check if it's a tablet
    if (/Tablet|SM-T/i.test(ua) || (!/Mobile/i.test(ua) && /Android/i.test(ua))) {
      return `Android Tablet ${version}`.trim();
    }
    return `Android Phone ${version}`.trim();
  }
  
  if (/iPhone|iPad|iPod/i.test(ua)) {
    return /iPad/i.test(ua) ? 'iPad' : 'iPhone';
  }
  
  if (/Windows/i.test(ua)) {
    return 'Windows PC';
  }
  
  if (/Mac/i.test(ua)) {
    return 'Mac';
  }
  
  if (/Linux/i.test(ua)) {
    return 'Linux PC';
  }
  
  return 'Mobile Device';
}
