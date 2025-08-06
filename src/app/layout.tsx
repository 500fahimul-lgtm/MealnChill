import ClientOnlyPWAInstallPrompt from '@/components/ClientOnlyPWAInstallPrompt'
import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'MealNChill - Meal Management System',
  description: 'A comprehensive meal management system for mess facilities',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'MealNChill',
  },
  formatDetection: {
    telephone: false,
  },
  openGraph: {
    type: 'website',
    siteName: 'MealNChill',
    title: 'MealNChill - Meal Management System',
    description: 'A comprehensive meal management system for mess facilities',
  },
  twitter: {
    card: 'summary',
    title: 'MealNChill - Meal Management System',
    description: 'A comprehensive meal management system for mess facilities',
  },
}

export const viewport: Viewport = {
  themeColor: '#3b82f6',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" href="/icons/icon-192x192.png" />
        <link rel="apple-touch-icon" href="/icons/icon-192x192.png" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="application-name" content="MealNChill" />
        <meta name="apple-mobile-web-app-title" content="MealNChill" />
        <meta name="msapplication-starturl" content="/" />
      </head>
      <body className={inter.className} suppressHydrationWarning={true}>
        {children}
        <ClientOnlyPWAInstallPrompt />
      </body>
    </html>
  )
}
