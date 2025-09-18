'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Loader } from '@googlemaps/js-api-loader'
import { Home, Shield, Clock, TrendingUp } from 'lucide-react'
import { AddressSearch } from '@/components/address-search'
import { MapConfirm } from '@/components/map-confirm'
import { AnalyzeProgress } from '@/components/analyze-progress'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

type FlowStep = 'search' | 'confirm' | 'analyze'

interface AddressData {
  placeId: string
  formattedAddress: string
  lat: number
  lng: number
  county: string
  streetViewUrl?: string
}

export default function HomePage() {
  const [currentStep, setCurrentStep] = useState<FlowStep>('search')
  const [addressData, setAddressData] = useState<AddressData | null>(null)
  const [isGoogleMapsLoaded, setIsGoogleMapsLoaded] = useState(false)
  const [quoteId, setQuoteId] = useState<string | null>(null)
  const router = useRouter()

  // Load Google Maps API
  useEffect(() => {
    const loader = new Loader({
      apiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY!,
      version: 'weekly',
      libraries: ['places', 'geometry']
    })

    loader.load().then(() => {
      setIsGoogleMapsLoaded(true)
    }).catch((error) => {
      console.error('Failed to load Google Maps:', error)
    })
  }, [])

  const handleAddressSelect = async (address: AddressData) => {
    console.log('Address selected:', address) // Debug log
    setAddressData(address)

    try {
      // Create quote
      const response = await fetch('/api/quote/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          address: address.formattedAddress,
          placeId: address.placeId,
          lat: address.lat,
          lng: address.lng,
          county: address.county
        })
      })

      if (response.ok) {
        const data = await response.json()
        console.log('Quote created:', data) // Debug log
        setQuoteId(data.quoteId)
        setCurrentStep('confirm')
      } else {
        const errorData = await response.json()
        console.error('API Error:', errorData) // Debug log
        throw new Error(errorData.error || 'Failed to create quote')
      }
    } catch (error) {
      console.error('Quote creation error:', error)
      // Fallback: proceed without API for testing
      console.log('Using fallback - proceeding without API')
      setQuoteId('mock-quote-' + Date.now())
      setCurrentStep('confirm')
    }
  }

  const handleConfirmAddress = () => {
    setCurrentStep('analyze')
  }

  const handleAnalysisComplete = (result: any) => {
    if (quoteId) {
      router.push(`/estimate/${quoteId}` as any)
    }
  }

  const handleAnalysisError = (error: string) => {
    console.error('Analysis error:', error)
    // Handle error - could show error state or go back to search
    setCurrentStep('search')
  }

  const handleBackToSearch = () => {
    setAddressData(null)
    setQuoteId(null)
    setCurrentStep('search')
  }

  if (!isGoogleMapsLoaded && currentStep !== 'search') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-2">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto" />
          <p className="text-sm text-muted-foreground">Loading map services...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50/50 to-white">
      <div className="container py-8">
        {currentStep === 'search' && (
          <div className="space-y-12">
            {/* Hero Section */}
            <div className="text-center space-y-6 max-w-4xl mx-auto">
              <h1 className="text-4xl md:text-6xl font-bold text-gray-900">
                Instant Roofing Quote
                <span className="block text-primary">for South Florida</span>
              </h1>
              <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                Get an AI-powered roof estimate in minutes. Professional measurements,
                accurate pricing, and financing options tailored for your home.
              </p>
            </div>

            {/* Address Search */}
            <div className="max-w-2xl mx-auto">
              <Card>
                <CardHeader>
                  <CardTitle className="text-center">Enter Your Address</CardTitle>
                  <CardDescription className="text-center">
                    We serve Miami-Dade, Broward, and Palm Beach counties
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <AddressSearch
                    onAddressSelect={handleAddressSelect}
                    disabled={!isGoogleMapsLoaded}
                  />
                  {!isGoogleMapsLoaded && (
                    <p className="text-sm text-muted-foreground text-center mt-2">
                      Loading address search...
                    </p>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Features */}
            <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
              <Card>
                <CardHeader className="text-center">
                  <Clock className="h-8 w-8 text-primary mx-auto mb-2" />
                  <CardTitle className="text-lg">Instant Results</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground text-center">
                    Get your roof estimate in under 2 minutes using advanced AI measurements
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="text-center">
                  <Shield className="h-8 w-8 text-primary mx-auto mb-2" />
                  <CardTitle className="text-lg">Licensed & Insured</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground text-center">
                    Professional roofing contractors with full licensing and insurance coverage
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="text-center">
                  <TrendingUp className="h-8 w-8 text-primary mx-auto mb-2" />
                  <CardTitle className="text-lg">Financing Available</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground text-center">
                    Flexible financing options to fit your budget with competitive rates
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {currentStep === 'confirm' && addressData && (
          <MapConfirm
            address={addressData.formattedAddress}
            lat={addressData.lat}
            lng={addressData.lng}
            streetViewUrl={addressData.streetViewUrl}
            onConfirm={handleConfirmAddress}
            onCancel={handleBackToSearch}
          />
        )}

        {currentStep === 'analyze' && addressData && (
          <AnalyzeProgress
            measurementData={{
              placeId: addressData.placeId,
              lat: addressData.lat,
              lng: addressData.lng,
              address: addressData.formattedAddress
            }}
            onComplete={handleAnalysisComplete}
            onError={handleAnalysisError}
          />
        )}
      </div>
    </div>
  )
}