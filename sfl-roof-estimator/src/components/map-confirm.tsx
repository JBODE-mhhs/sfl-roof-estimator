'use client'

import { useEffect, useRef, useState } from 'react'
import { MapPin, CheckCircle, XCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'

interface MapConfirmProps {
  address: string
  lat: number
  lng: number
  onConfirm: () => void
  onCancel: () => void
  onLocationChange?: (lat: number, lng: number) => void
  disabled?: boolean
}

export function MapConfirm({
  address,
  lat,
  lng,
  onConfirm,
  onCancel,
  onLocationChange,
  disabled = false
}: MapConfirmProps) {
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<any>(null)

  useEffect(() => {
    if (!mapRef.current || !(window as any).google) return

    const map = new (window as any).google.maps.Map(mapRef.current, {
      center: { lat, lng },
      zoom: 19,
      mapTypeId: 'satellite',
      disableDefaultUI: false,
      zoomControl: true,
      mapTypeControl: true,
      scaleControl: true,
      streetViewControl: false,
      rotateControl: true,
      fullscreenControl: false
    })

    // Add draggable marker
    const marker = new (window as any).google.maps.Marker({
      position: { lat, lng },
      map,
      title: address,
      draggable: true,
      icon: {
        path: (window as any).google.maps.SymbolPath.CIRCLE,
        scale: 10,
        fillColor: '#3b82f6',
        fillOpacity: 1,
        strokeWeight: 2,
        strokeColor: '#ffffff'
      }
    })

    // Listen for marker drag events
    marker.addListener('dragend', () => {
      const newPosition = marker.getPosition()
      const newLat = newPosition.lat()
      const newLng = newPosition.lng()
      
      console.log('Marker moved to:', { lat: newLat, lng: newLng })
      
      if (onLocationChange) {
        onLocationChange(newLat, newLng)
      }
    })

    // Add property boundary highlight (simulated)
    const bounds = new (window as any).google.maps.LatLngBounds()
    const offsetLat = 0.0002
    const offsetLng = 0.0002

    const rectangle = new (window as any).google.maps.Rectangle({
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

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold">Confirm Your Property</h2>
        <p className="text-muted-foreground">
          Please verify this is your property before we analyze your roof
        </p>
      </div>

      <Card>
        <CardContent className="p-4">
          {/* Satellite Map */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">Property Location</h3>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <MapPin className="h-4 w-4" />
                Satellite View
              </div>
            </div>

            <div
              ref={mapRef}
              className="map-container border rounded-lg w-full"
              style={{ height: '400px' }}
            />
            <p className="text-sm text-muted-foreground">
              <strong>{address}</strong>
            </p>
            <p className="text-xs text-blue-600">
              💡 Drag the blue marker to adjust the exact location if needed
            </p>
          </div>

          {/* Confirmation Question */}
          <div className="border-t pt-6 mt-6">
            <div className="text-center space-y-4">
              <h3 className="text-lg font-semibold">Is this your home?</h3>
              <p className="text-sm text-muted-foreground">
                Our AI will analyze the roof structure visible in satellite imagery
                to provide your instant estimate.
              </p>

              <div className="flex flex-col sm:flex-row justify-center gap-4">
                <Button
                  variant="outline"
                  onClick={onCancel}
                  disabled={disabled}
                  className="w-full sm:min-w-32"
                >
                  <XCircle className="h-4 w-4 mr-2" />
                  No, Go Back
                </Button>
                <Button
                  onClick={onConfirm}
                  disabled={disabled}
                  className="w-full sm:min-w-32"
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