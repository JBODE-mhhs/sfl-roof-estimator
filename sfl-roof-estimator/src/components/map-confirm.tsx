'use client'

import { useEffect, useRef, useState } from 'react'
import { MapPin, Eye, CheckCircle, XCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'

interface MapConfirmProps {
  address: string
  lat: number
  lng: number
  streetViewUrl?: string
  onConfirm: () => void
  onCancel: () => void
  disabled?: boolean
}

export function MapConfirm({
  address,
  lat,
  lng,
  streetViewUrl,
  onConfirm,
  onCancel,
  disabled = false
}: MapConfirmProps) {
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<google.maps.Map | null>(null)
  const [streetViewVisible, setStreetViewVisible] = useState(false)

  useEffect(() => {
    if (!mapRef.current || !window.google) return

    const map = new window.google.maps.Map(mapRef.current, {
      center: { lat, lng },
      zoom: 18,
      mapTypeId: 'satellite',
      disableDefaultUI: false,
      zoomControl: true,
      mapTypeControl: true,
      scaleControl: true,
      streetViewControl: true,
      rotateControl: true,
      fullscreenControl: false
    })

    // Add marker
    new window.google.maps.Marker({
      position: { lat, lng },
      map,
      title: address,
      icon: {
        path: window.google.maps.SymbolPath.CIRCLE,
        scale: 10,
        fillColor: '#3b82f6',
        fillOpacity: 1,
        strokeWeight: 2,
        strokeColor: '#ffffff'
      }
    })

    // Add property boundary highlight (simulated)
    const bounds = new window.google.maps.LatLngBounds()
    const offsetLat = 0.0002
    const offsetLng = 0.0002

    const rectangle = new window.google.maps.Rectangle({
      bounds: {
        north: lat + offsetLat,
        south: lat - offsetLat,
        east: lng + offsetLng,
        west: lng - offsetLng
      },
      editable: false,
      draggable: false,
      fillColor: '#3b82f6',
      fillOpacity: 0.1,
      strokeColor: '#3b82f6',
      strokeOpacity: 0.8,
      strokeWeight: 2,
      map
    })

    mapInstanceRef.current = map
  }, [lat, lng, address])

  const handleStreetViewToggle = () => {
    setStreetViewVisible(!streetViewVisible)
  }

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold">Confirm Your Property</h2>
        <p className="text-muted-foreground">
          Please verify this is your property before we analyze your roof
        </p>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Satellite Map */}
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 pb-0">
                <h3 className="font-semibold">Satellite View</h3>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <MapPin className="h-4 w-4" />
                  Property Location
                </div>
              </div>

              <div className="px-4 pb-4">
                <div
                  ref={mapRef}
                  className="map-container border rounded-lg"
                  style={{ height: '300px' }}
                />
                <p className="text-sm text-muted-foreground mt-2">
                  <strong>{address}</strong>
                </p>
              </div>
            </div>

            {/* Street View */}
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 pb-0">
                <h3 className="font-semibold">Street View</h3>
                {streetViewUrl && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleStreetViewToggle}
                    className="text-xs"
                  >
                    <Eye className="h-3 w-3 mr-1" />
                    {streetViewVisible ? 'Hide' : 'Show'} Street
                  </Button>
                )}
              </div>

              <div className="px-4 pb-4">
                {streetViewUrl && streetViewVisible ? (
                  <div className="border rounded-lg overflow-hidden">
                    <img
                      src={streetViewUrl}
                      alt="Street view of property"
                      className="w-full h-[300px] object-cover"
                    />
                  </div>
                ) : (
                  <div className="border rounded-lg h-[300px] flex items-center justify-center bg-muted/30">
                    <div className="text-center space-y-2">
                      <Eye className="h-8 w-8 mx-auto text-muted-foreground" />
                      <p className="text-sm text-muted-foreground">
                        {streetViewUrl ? 'Click "Show Street" to view' : 'Street view not available'}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Confirmation Question */}
          <div className="border-t p-6">
            <div className="text-center space-y-4">
              <h3 className="text-lg font-semibold">Is this your home?</h3>
              <p className="text-sm text-muted-foreground">
                Our AI will analyze the roof structure visible in satellite imagery
                to provide your instant estimate.
              </p>

              <div className="flex justify-center gap-4">
                <Button
                  variant="outline"
                  onClick={onCancel}
                  disabled={disabled}
                  className="min-w-32"
                >
                  <XCircle className="h-4 w-4 mr-2" />
                  No, Go Back
                </Button>
                <Button
                  onClick={onConfirm}
                  disabled={disabled}
                  className="min-w-32"
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Yes, Analyze Roof
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="text-center text-xs text-muted-foreground max-w-2xl mx-auto">
        <p>
          By confirming, you agree to our analysis of publicly available satellite imagery.
          Final measurements will be verified during your free on-site inspection.
        </p>
      </div>
    </div>
  )
}