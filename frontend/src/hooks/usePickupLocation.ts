import { useState, useEffect } from 'react'
import { api } from '../lib/api'

export function usePickupLocation() {
  const [pickupLocation, setPickupLocation] = useState('')
  useEffect(() => {
    api.settings.get().then((s) => setPickupLocation(s.pickupLocation)).catch(() => {})
  }, [])
  return pickupLocation
}
