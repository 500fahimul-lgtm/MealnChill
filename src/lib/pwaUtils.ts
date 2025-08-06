export function isPWA(): boolean {
  if (typeof window === 'undefined') return false
  
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as any).standalone ||
    document.referrer.includes('android-app://')
  )
}

export function isIOSPWA(): boolean {
  if (typeof window === 'undefined') return false
  
  return (
    (window.navigator as any).standalone === true
  )
}

export function isAndroidPWA(): boolean {
  if (typeof window === 'undefined') return false
  
  return (
    window.matchMedia('(display-mode: standalone)').matches &&
    /Android/.test(window.navigator.userAgent)
  )
}

export function canInstallPWA(): boolean {
  if (typeof window === 'undefined') return false
  
  // Check if the app is already installed
  if (isPWA()) return false
  
  // Check if browser supports PWA installation
  return 'serviceWorker' in navigator && 'beforeinstallprompt' in window
}
