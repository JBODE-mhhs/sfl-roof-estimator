'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Home, MapPin, Phone, Mail, Calendar, DollarSign, Square, TrendingUp } from 'lucide-react'

interface QuoteData {
  id: string
  address: string
  county: string
  status: string
  totalPrice?: number
  monthlyMin?: number
  monthlyMax?: number
  sections: RoofSection[]
  createdAt: string
}

interface RoofSection {
  id: string
  kind: 'SLOPED' | 'FLAT'
  planAreaSqFt: number
  pitchRisePer12?: number
  selectedSystem: string
  priceCents?: number
  finalSquares: number
}

export default function EstimatePage() {
  const params = useParams()
  const quoteId = params.id as string
  const [quote, setQuote] = useState<QuoteData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (quoteId) {
      fetchQuote(quoteId)
    }
  }, [quoteId])

  const fetchQuote = async (id: string) => {
    try {
      setLoading(true)
      // For now, we'll use mock data since the API might not be fully set up
      const mockQuote: QuoteData = {
        id: id,
        address: '1065 SW 141st Ct, Miami, FL 33184',
        county: 'Miami-Dade',
        status: 'DRAFT',
        totalPrice: 45000, // $450.00 in cents
        monthlyMin: 15000, // $150.00 in cents
        monthlyMax: 25000, // $250.00 in cents
        sections: [
          {
            id: '1',
            kind: 'SLOPED',
            planAreaSqFt: 1200,
            pitchRisePer12: 6,
            selectedSystem: 'SHINGLE',
            priceCents: 30000,
            finalSquares: 12
          },
          {
            id: '2',
            kind: 'FLAT',
            planAreaSqFt: 300,
            selectedSystem: 'FLAT_TPO',
            priceCents: 15000,
            finalSquares: 3
          }
        ],
        createdAt: new Date().toISOString()
      }
      
      setQuote(mockQuote)
    } catch (err) {
      setError('Failed to load quote details')
      console.error('Quote fetch error:', err)
    } finally {
      setLoading(false)
    }
  }

  const formatPrice = (cents: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(cents / 100)
  }

  const getSystemDisplayName = (system: string) => {
    const systemNames: Record<string, string> = {
      'SHINGLE': 'Asphalt Shingles',
      'METAL': 'Metal Roofing',
      'FLAT_TPO': 'TPO Membrane',
      'FLAT_MODBIT': 'Modified Bitumen',
      'FLAT_BUR': 'Built-Up Roofing'
    }
    return systemNames[system] || system
  }

  const getPitchDescription = (pitch?: number) => {
    if (!pitch) return 'Flat'
    if (pitch <= 4) return 'Low Pitch'
    if (pitch <= 7) return 'Medium Pitch'
    return 'Steep Pitch'
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-2">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto" />
          <p className="text-sm text-muted-foreground">Loading your estimate...</p>
        </div>
      </div>
    )
  }

  if (error || !quote) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-destructive">Error</CardTitle>
            <CardDescription>
              {error || 'Quote not found'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              onClick={() => window.location.href = '/'}
              className="w-full"
            >
              Start New Estimate
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50/50 to-white">
      <div className="container py-8">
        <div className="max-w-4xl mx-auto space-y-8">
          {/* Header */}
          <div className="text-center space-y-4">
            <h1 className="text-3xl md:text-4xl font-bold text-gray-900">
              Your Roof Estimate
            </h1>
            <p className="text-lg text-muted-foreground">
              Professional estimate for your South Florida property
            </p>
          </div>

          {/* Quote Summary */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Home className="h-5 w-5" />
                  Property Details
                </CardTitle>
                <Badge variant="outline">{quote.status}</Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-2 text-sm">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                <span>{quote.address}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Badge variant="secondary">{quote.county} County</Badge>
              </div>
            </CardContent>
          </Card>

          {/* Pricing Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                Estimate Summary
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-3 gap-6">
                <div className="text-center space-y-2">
                  <div className="text-3xl font-bold text-primary">
                    {formatPrice(quote.totalPrice || 0)}
                  </div>
                  <div className="text-sm text-muted-foreground">Total Project Cost</div>
                </div>
                <div className="text-center space-y-2">
                  <div className="text-2xl font-semibold">
                    {formatPrice(quote.monthlyMin || 0)}
                  </div>
                  <div className="text-sm text-muted-foreground">Monthly Payment (Min)</div>
                </div>
                <div className="text-center space-y-2">
                  <div className="text-2xl font-semibold">
                    {formatPrice(quote.monthlyMax || 0)}
                  </div>
                  <div className="text-sm text-muted-foreground">Monthly Payment (Max)</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Roof Sections */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Square className="h-5 w-5" />
                Roof Analysis
              </CardTitle>
              <CardDescription>
                Detailed breakdown of your roof sections and materials
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {quote.sections.map((section, index) => (
                  <div key={section.id}>
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-semibold">
                        Section {index + 1} - {section.kind === 'SLOPED' ? 'Sloped' : 'Flat'}
                      </h4>
                      <Badge variant="outline">
                        {getSystemDisplayName(section.selectedSystem)}
                      </Badge>
                    </div>
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <div className="text-muted-foreground">Area</div>
                        <div className="font-medium">{section.planAreaSqFt} sq ft</div>
                      </div>
                      <div>
                        <div className="text-muted-foreground">Squares</div>
                        <div className="font-medium">{section.finalSquares}</div>
                      </div>
                      {section.pitchRisePer12 && (
                        <div>
                          <div className="text-muted-foreground">Pitch</div>
                          <div className="font-medium">
                            {section.pitchRisePer12}/12 ({getPitchDescription(section.pitchRisePer12)})
                          </div>
                        </div>
                      )}
                      <div>
                        <div className="text-muted-foreground">Cost</div>
                        <div className="font-medium">
                          {section.priceCents ? formatPrice(section.priceCents) : 'TBD'}
                        </div>
                      </div>
                    </div>
                    
                    {index < quote.sections.length - 1 && <Separator className="mt-4" />}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Financing Options */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Financing Options
              </CardTitle>
              <CardDescription>
                Flexible payment plans to fit your budget
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-3 gap-4">
                <div className="p-4 border rounded-lg">
                  <h4 className="font-semibold mb-2">12-Month Plan</h4>
                  <div className="text-2xl font-bold text-primary mb-1">
                    {formatPrice(Math.round((quote.totalPrice || 0) / 12))}
                  </div>
                  <div className="text-sm text-muted-foreground">per month</div>
                </div>
                <div className="p-4 border rounded-lg">
                  <h4 className="font-semibold mb-2">24-Month Plan</h4>
                  <div className="text-2xl font-bold text-primary mb-1">
                    {formatPrice(Math.round((quote.totalPrice || 0) / 24))}
                  </div>
                  <div className="text-sm text-muted-foreground">per month</div>
                </div>
                <div className="p-4 border rounded-lg">
                  <h4 className="font-semibold mb-2">36-Month Plan</h4>
                  <div className="text-2xl font-bold text-primary mb-1">
                    {formatPrice(Math.round((quote.totalPrice || 0) / 36))}
                  </div>
                  <div className="text-sm text-muted-foreground">per month</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Call to Action */}
          <Card>
            <CardHeader>
              <CardTitle>Ready to Get Started?</CardTitle>
              <CardDescription>
                Contact us to schedule your free on-site inspection and finalize your roofing project.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col sm:flex-row gap-4">
                <Button size="lg" className="flex-1">
                  <Phone className="h-4 w-4 mr-2" />
                  Call (305) 555-0123
                </Button>
                <Button size="lg" variant="outline" className="flex-1">
                  <Mail className="h-4 w-4 mr-2" />
                  Email Us
                </Button>
                <Button size="lg" variant="outline" className="flex-1">
                  <Calendar className="h-4 w-4 mr-2" />
                  Schedule Inspection
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Disclaimer */}
          <Card className="bg-muted/50">
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground text-center">
                This estimate is based on remote measurements and satellite imagery. 
                Final pricing may be adjusted after on-site inspection. 
                All work performed by licensed and insured contractors.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
