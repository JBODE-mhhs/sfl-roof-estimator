'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { MapPin, Search, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import { debounce } from '@/lib/utils'

interface AddressSuggestion {
  placeId: string
  description: string
  structuredFormatting: {
    mainText: string
    secondaryText: string
  }
}

interface AddressSearchProps {
  onAddressSelect: (address: {
    placeId: string
    formattedAddress: string
    lat: number
    lng: number
    county: string
    streetViewUrl?: string
  }) => void
  disabled?: boolean
  isGoogleMapsLoaded?: boolean
}

export function AddressSearchDebug({ onAddressSelect, disabled = false, isGoogleMapsLoaded = false }: AddressSearchProps) {
  const [query, setQuery] = useState('')
  const [suggestions, setSuggestions] = useState<AddressSuggestion[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isResolving, setIsResolving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const autocompleteService = useRef<any>(null)

  // Debug suggestions state changes
  useEffect(() => {
    console.log('🔍 Suggestions state updated:', suggestions.length, suggestions)
  }, [suggestions])

  useEffect(() => {
    console.log('🔍 AddressSearch: Checking for Google Maps API...')
    console.log('🔍 isGoogleMapsLoaded prop:', isGoogleMapsLoaded)
    console.log('🔍 window.google:', !!(window as any).google)
    console.log('🔍 window.google.maps:', !!(window as any).google?.maps)
    console.log('🔍 window.google.maps.places:', !!(window as any).google?.maps?.places)
    
    if (isGoogleMapsLoaded && typeof window !== 'undefined' && (window as any).google?.maps?.places) {
      console.log('🔍 AddressSearch: Initializing AutocompleteService')
      autocompleteService.current = new (window as any).google.maps.places.AutocompleteService()
    } else {
      console.log('🔍 AddressSearch: Google Places API not available yet')
    }
  }, [isGoogleMapsLoaded])

  const getSuggestions = useCallback(
    debounce(async (searchQuery: string) => {
      console.log('🔍 getSuggestions called with:', searchQuery)
      
      if (!searchQuery || !searchQuery.trim()) {
        console.log('🔍 Empty query, clearing suggestions')
        setSuggestions([])
        return
      }

      // Check if Google Maps API is available
      if (!autocompleteService.current) {
        console.log('🔍 Google Places API not available, checking API key...')
        const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
        console.log('🔍 API Key available:', !!apiKey)
        
        if (!apiKey) {
          console.error('🔍 Google Maps API key not found in environment')
          setError('Address search temporarily unavailable. Please try again later.')
          setIsLoading(false)
          return
        }
        
        // Try to initialize the service again
        if (typeof window !== 'undefined' && (window as any).google?.maps?.places) {
          autocompleteService.current = new (window as any).google.maps.places.AutocompleteService()
        } else {
          console.log('🔍 Google Places API still not available, using mock suggestions')
          const mockSuggestions = [
            {
              placeId: 'mock-1',
              description: `${searchQuery}, Miami, FL, USA`,
              structuredFormatting: {
                mainText: searchQuery,
                secondaryText: 'Miami, FL, USA'
              }
            }
          ]
          console.log('🔍 Setting mock suggestions:', mockSuggestions)
          setTimeout(() => {
            setIsLoading(false)
            setSuggestions(mockSuggestions)
          }, 500)
          return
        }
      }

      setIsLoading(true)
      setError(null)
      console.log('🔍 Making Places API request...')

      try {
        const request = {
          input: searchQuery,
          types: ['address'],
          componentRestrictions: { country: 'us' },
          bounds: new (window as any).google.maps.LatLngBounds(
            new (window as any).google.maps.LatLng(25.0, -81.0), // SW Florida
            new (window as any).google.maps.LatLng(27.0, -79.8)  // NE Florida
          )
        }

        autocompleteService.current.getPlacePredictions(request, (predictions: any, status: any) => {
          console.log('🔍 Places API response:', { status, predictionsCount: predictions?.length })
          setIsLoading(false)

          if (status === (window as any).google.maps.places.PlacesServiceStatus.OK && predictions) {
            const floridaResults = predictions
              .filter((prediction: any) =>
                prediction.description.toLowerCase().includes('fl') ||
                prediction.description.toLowerCase().includes('florida')
              )
              .slice(0, 5)

            console.log('🔍 Filtered Florida results:', floridaResults)
            const mappedSuggestions = floridaResults.map((p: any) => ({
              placeId: p.place_id,
              description: p.description,
              structuredFormatting: p.structured_formatting
            }))
            console.log('🔍 Mapped suggestions:', mappedSuggestions)
            console.log('🔍 About to call setSuggestions with:', mappedSuggestions)
            setSuggestions(mappedSuggestions)
            console.log('🔍 setSuggestions called')
          } else {
            console.error('🔍 Places API error:', status)
            // Fallback to mock suggestions on API error
            const mockSuggestions = [
              {
                placeId: 'mock-1',
                description: `${searchQuery}, Miami, FL, USA`,
                structuredFormatting: {
                  mainText: searchQuery,
                  secondaryText: 'Miami, FL, USA'
                }
              }
            ]
            console.log('🔍 Setting fallback mock suggestions:', mockSuggestions)
            setSuggestions(mockSuggestions)
          }
        })
      } catch (err) {
        console.error('🔍 Address autocomplete error:', err)
        setIsLoading(false)
        setError('Unable to search addresses. Please try again.')
      }
    }, 300),
    []
  )

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    console.log('🔍 Input changed to:', value)
    setQuery(value)
    getSuggestions(value)
  }

  const handleAddressSelect = async (suggestion: AddressSuggestion) => {
    console.log('🔍 Suggestion clicked:', suggestion)
    setIsResolving(true)
    setError(null)
    setSuggestions([])

    try {
      // Mock data for testing
      const mockData = {
        placeId: suggestion.placeId,
        formattedAddress: suggestion.description,
        lat: 25.75738,
        lng: -80.42396,
        county: 'Miami-Dade',
        streetViewUrl: undefined
      }
      
      console.log('🔍 Using mock data:', mockData)
      setTimeout(() => {
        setQuery(suggestion.structuredFormatting.mainText)
        onAddressSelect(mockData)
        setIsResolving(false)
      }, 1000)
    } catch (err) {
      console.error('🔍 Address resolution error:', err)
      setError(err instanceof Error ? err.message : 'Failed to resolve address')
    } finally {
      setIsResolving(false)
    }
  }

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!query || !query.trim()) return

    // Try to find exact match in suggestions
    const exactMatch = suggestions.find(s =>
      s.description.toLowerCase().includes(query.toLowerCase())
    )

    if (exactMatch) {
      handleAddressSelect(exactMatch)
    } else if (suggestions.length > 0) {
      handleAddressSelect(suggestions[0])
    }
  }

  console.log('🔍 Render - suggestions.length:', suggestions.length)
  console.log('🔍 Render - suggestions:', suggestions)

  return (
    <div className="space-y-4 relative">
      <form onSubmit={handleManualSubmit} className="relative">
        <div className="relative">
          <MapPin className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Enter your address in South Florida..."
            value={query}
            onChange={handleInputChange}
            disabled={disabled || isResolving}
            className="pl-10 pr-12"
            autoComplete="address-line1"
          />
          <div className="absolute right-2 top-2">
            {(isLoading || isResolving) ? (
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            ) : (
              <Button
                type="submit"
                size="sm"
                variant="ghost"
                className="h-6 w-6 p-0"
                disabled={!query.trim() || disabled}
              >
                <Search className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>

        {error && (
          <p className="text-sm text-destructive mt-2">{error}</p>
        )}
      </form>

      {/* Debug info */}
      <div className="text-xs text-gray-500">
        Debug: suggestions.length = {suggestions.length}
      </div>

      {/* Force show suggestions for testing */}
      {suggestions.length > 0 && (
        <div className="mt-2 p-2 bg-yellow-100 border border-yellow-300 rounded">
          <div className="text-sm font-bold">TEST: Suggestions should appear below this box</div>
          <div className="text-xs">Count: {suggestions.length}</div>
        </div>
      )}

      {suggestions.length > 0 && (
        <Card className="absolute z-50 w-full mt-1 max-h-60 overflow-y-auto bg-white border shadow-lg">
          <div className="p-2">
            <div className="text-xs text-gray-500 mb-2">
              Debug: Rendering {suggestions.length} suggestions
            </div>
            {suggestions.map((suggestion) => (
              <button
                key={suggestion.placeId}
                onClick={() => handleAddressSelect(suggestion)}
                disabled={disabled || isResolving}
                className="w-full text-left p-3 rounded-md hover:bg-muted transition-colors disabled:opacity-50"
              >
                <div className="font-medium text-sm">
                  {suggestion.structuredFormatting.mainText}
                </div>
                <div className="text-sm text-muted-foreground">
                  {suggestion.structuredFormatting.secondaryText}
                </div>
              </button>
            ))}
          </div>
        </Card>
      )}
    </div>
  )
}

