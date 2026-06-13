import { useState, useCallback } from 'react'
import { getStationData } from '../services/stationService'

export function useStation() {
  const [stationData, setStationData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const loadStation = useCallback(async (stationCode) => {
    setLoading(true)
    setError(null)
    try {
      const data = await getStationData(stationCode)
      setStationData(data)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  return { stationData, loading, error, loadStation }
}
