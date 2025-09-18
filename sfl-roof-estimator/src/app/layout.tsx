import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'SFL Roof Estimator - Instant Roofing Quotes for South Florida',
  description: 'Get instant roofing quotes for Miami-Dade, Broward, and Palm Beach counties. Professional roof estimates with AI-powered measurements.',
  keywords: 'roof estimate, South Florida roofing, Miami roof quote, Broward roofing, Palm Beach roof estimate',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <header className="border-b bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/60">
          <div className="container flex h-16 items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="h-8 w-8 rounded-full bg-primary" />
              <h1 className="text-xl font-bold">SFL Roof Estimator</h1>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-muted-foreground">
                Serving Miami-Dade, Broward & Palm Beach
              </span>
              <span className="text-sm font-medium">
                📞 (305) 555-0123
              </span>
            </div>
          </div>
        </header>

        <main className="min-h-screen">
          {children}
        </main>

        <footer className="border-t bg-muted/30 py-12">
          <div className="container">
            <div className="grid gap-8 md:grid-cols-3">
              <div>
                <h3 className="font-semibold mb-4">SFL Roof Estimator</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Professional roofing estimates powered by advanced AI measurement technology.
                  Serving South Florida homeowners with accurate, instant quotes.
                </p>
                <p className="text-xs text-muted-foreground">
                  Licensed & Insured • Free Inspections
                </p>
              </div>
              <div>
                <h4 className="font-semibold mb-4">Service Areas</h4>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li>Miami-Dade County</li>
                  <li>Broward County</li>
                  <li>Palm Beach County</li>
                </ul>
              </div>
              <div>
                <h4 className="font-semibold mb-4">Services</h4>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li>Shingle Roofing</li>
                  <li>Metal Roofing</li>
                  <li>Flat Roof Systems</li>
                  <li>Roof Repairs</li>
                </ul>
              </div>
            </div>
            <div className="border-t mt-8 pt-8 text-center text-xs text-muted-foreground">
              © 2024 SFL Roof Estimator. All rights reserved.
              <span className="mx-2">•</span>
              Estimates are preliminary and subject to on-site inspection.
            </div>
          </div>
        </footer>
      </body>
    </html>
  )
}