'use client'

import { usePWAStatus } from '@/hooks/usePWAStatus'

export default function PWAStatus() {
  const { isPWA, isIOSPWA, isAndroidPWA, isOnline, isStandalone } = usePWAStatus()

  // Only show in development mode
  if (process.env.NODE_ENV === 'production') return null

  return (
    <div className="fixed top-4 right-4 bg-black bg-opacity-75 text-white text-xs p-2 rounded z-50">
      <div>PWA: {isPWA ? '✅' : '❌'}</div>
      <div>iOS PWA: {isIOSPWA ? '✅' : '❌'}</div>
      <div>Android PWA: {isAndroidPWA ? '✅' : '❌'}</div>
      <div>Standalone: {isStandalone ? '✅' : '❌'}</div>
      <div>Online: {isOnline ? '✅' : '❌'}</div>
    </div>
  )
}
