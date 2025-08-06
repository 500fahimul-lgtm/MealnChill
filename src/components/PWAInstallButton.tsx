'use client'

import { useEffect, useState } from 'react'

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

interface PWAInstallButtonProps {
  className?: string
  children?: React.ReactNode
}

export default function PWAInstallButton({ className, children }: PWAInstallButtonProps) {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [canInstall, setCanInstall] = useState(false)

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
      setCanInstall(true)
    }

    window.addEventListener('beforeinstallprompt', handler)

    // Check if app is already installed
    const isInstalled = window.matchMedia('(display-mode: standalone)').matches

    if (isInstalled) {
      setCanInstall(false)
    }

    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  const handleInstallClick = async () => {
    if (!deferredPrompt) return

    deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice
    
    if (outcome === 'accepted') {
      setDeferredPrompt(null)
      setCanInstall(false)
    }
  }

  if (!canInstall) return null

  return (
    <button
      onClick={handleInstallClick}
      className={className || "bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"}
    >
      {children || (
        <>
          <span className="mr-2">📱</span>
          Install App
        </>
      )}
    </button>
  )
}
