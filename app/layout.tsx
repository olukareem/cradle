import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import { ToastProvider } from '@/components/ui/toast'
import { ConnectionBanner } from '@/components/shell/ConnectionBanner'
import './globals.css'

const inter = Inter({
  variable: '--font-inter',
  subsets: ['latin'],
  display: 'swap',
})

export const metadata: Metadata = {
  title: {
    default: 'Cradle',
    template: '%s · Cradle',
  },
  description: 'Real-time chat, built to hold conversations.',
  applicationName: 'Cradle',
  authors: [{ name: 'Olu Kareem' }],
}

// `colorScheme` and `themeColor` moved to the `viewport` export in Next 14+
// (warning surfaced in Next 16 build). See:
// node_modules/next/dist/docs/01-app/03-api-reference/04-functions/generate-viewport.md
export const viewport: Viewport = {
  colorScheme: 'dark',
  themeColor: '#0b0b0f',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} h-full`}>
      <body className="min-h-full">
        <ToastProvider>
          <ConnectionBanner />
          {children}
        </ToastProvider>
      </body>
    </html>
  )
}
