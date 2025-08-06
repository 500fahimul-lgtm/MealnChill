'use client'

import { isAndroidPWA, isIOSPWA, isPWA } from '@/lib/pwaUtils'
import { useEffect, useState } from 'react'

interface PWAStatus {
  isPWA: boolean
  isIOSPWA: boolean
  isAndroidPWA: boolean
  isOnline: boolean
  canInstall: boolean
  isStandalone: boolean
}

export function usePWAStatus(): PWAStatus {
  const [status, setStatus] = useState<PWAStatus>({
    isPWA: false,
    isIOSPWA: false,
    isAndroidPWA: false,
    isOnline: true,
    canInstall: false,
    isStandalone: false,
  })

  useEffect(() => {
    const updateStatus = () => {
      setStatus({
        isPWA: isPWA(),
        isIOSPWA: isIOSPWA(),
        isAndroidPWA: isAndroidPWA(),
        isOnline: navigator.onLine,
        canInstall: 'serviceWorker' in navigator && 'BeforeInstallPromptEvent' in window,
        isStandalone: window.matchMedia('(display-mode: standalone)').matches,
      })
    }

    // Initial status
    updateStatus()

    // Listen for online/offline changes
    const handleOnlineStatusChange = () => {
      setStatus(prev => ({ ...prev, isOnline: navigator.onLine }))
    }

    // Listen for display mode changes
    const standaloneQuery = window.matchMedia('(display-mode: standalone)')
    const handleDisplayModeChange = () => {
      setStatus(prev => ({ 
        ...prev, 
        isStandalone: standaloneQuery.matches,
        isPWA: standaloneQuery.matches || (navigator as any).standalone 
      }))
    }

    window.addEventListener('online', handleOnlineStatusChange)
    window.addEventListener('offline', handleOnlineStatusChange)
    standaloneQuery.addEventListener('change', handleDisplayModeChange)

    return () => {
      window.removeEventListener('online', handleOnlineStatusChange)
      window.removeEventListener('offline', handleOnlineStatusChange)
      standaloneQuery.removeEventListener('change', handleDisplayModeChange)
    }
  }, [])

  return status
}
