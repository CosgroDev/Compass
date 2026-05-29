import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'FoodRisk Compass',
  description: 'Find Requirements. Understand Impact. Prove Compliance.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
