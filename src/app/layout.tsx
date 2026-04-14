import type { Metadata } from 'next'
import { Instrument_Serif, DM_Sans } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import './globals.css'
import HelpButton from '@/components/HelpButton'

const instrumentSerif = Instrument_Serif({
  variable: '--font-instrument-serif',
  subsets: ['latin'],
  weight: '400',
})

const dmSans = DM_Sans({
  variable: '--font-dm-sans',
  subsets: ['latin'],
  weight: ['300', '400', '500', '600'],
})

export const metadata: Metadata = {
  title: 'VaultTrace — Find Your Forgotten 401(k)',
  description: 'Upload your IRS tax transcript to find forgotten retirement accounts across all your past employers.',
}

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      className={`${instrumentSerif.variable} ${dmSans.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-white text-zinc-900" style={{ fontFamily: 'var(--font-dm-sans), sans-serif' }}>
        {children}
        <HelpButton />
        <Analytics />
      </body>
    </html>
  )
}
