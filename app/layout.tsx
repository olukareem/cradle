import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
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
  colorScheme: 'dark',
  themeColor: '#0b0b0f',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} h-full`}>
      <body className="min-h-full">{children}</body>
    </html>
  )
}
