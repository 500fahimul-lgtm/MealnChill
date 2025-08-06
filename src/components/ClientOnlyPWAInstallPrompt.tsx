'use client'

import { Suspense } from 'react'
import PWAInstallPrompt from './PWAInstallPrompt'

export default function ClientOnlyPWAInstallPrompt() {
  return (
    <Suspense fallback={null}>
      <PWAInstallPrompt />
    </Suspense>
  )
}
