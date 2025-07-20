'use client'

import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

export default function DashboardRedirect() {
  const router = useRouter()

  useEffect(() => {
    // Redirect to home page (which now contains the dashboard)
    router.replace('/')
  }, [router])

  return (
    <div className="min-h-screen bg-gradient-to-br from-stone-50 via-amber-50 to-orange-100 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-slate-600 font-medium">Redirecting to dashboard...</p>
      </div>
    </div>
  )
}
