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
}

export function AddressSearch({ onAddressSelect, disabled = false }: AddressSearchProps) {
  const [query, setQuery] = useState('')
  const [suggestions, setSuggestions] = useState<AddressSuggestion[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isResolving, setIsResolving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const autocompleteService = useRef<any>(null)

  useEffect(() => {
    if (typeof window !== 'undefined' && (window as any).google) {
      autocompleteService.current = new (window as any).google.maps.places.AutocompleteService()
    }
  }, [])

  const getSuggestions = useCallback(
    debounce(async (searchQuery: string) => {
      if (!searchQuery.trim() || !autocompleteService.current) {
        setSuggestions([])
        return
      }

      setIsLoading(true)
      setError(null)

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
          setIsLoading(false)

          if (status === (window as any).google.maps.places.PlacesServiceStatus.OK && predictions) {
            const floridaResults = predictions
              .filter((prediction: any) =>
                prediction.description.toLowerCase().includes('fl') ||
                prediction.description.toLowerCase().includes('florida')
              )
              .slice(0, 5)

            setSuggestions(floridaResults.map((p: any) => ({
              placeId: p.place_id,
              description: p.description,
              structuredFormatting: p.structured_formatting
            })))
          } else {
            setSuggestions([])
          }
        })
      } catch (err) {
        console.error('Address autocomplete error:', err)
        setIsLoading(false)
        setError('Unable to search addresses. Please try again.')
      }
    }, 300),
    []
  )

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setQuery(value)
    getSuggestions(value)
  }

  const handleAddressSelect = async (suggestion: AddressSuggestion) => {
    setIsResolving(true)
    setError(null)
    setSuggestions([])

    try {
      const response = await fetch('/api/geo/resolve-address', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: suggestion.description })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to resolve address')
      }

      setQuery(suggestion.structuredFormatting.mainText)
      onAddressSelect(data)
    } catch (err) {
      console.error('Address resolution error:', err)
      setError(err instanceof Error ? err.message : 'Failed to resolve address')
    } finally {
      setIsResolving(false)
    }
  }

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!query.trim()) return

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

  return (
    <div className="space-y-4">
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

      {suggestions.length > 0 && (
        <Card className="absolute z-10 w-full mt-1 max-h-60 overflow-y-auto">
          <div className="p-2">
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