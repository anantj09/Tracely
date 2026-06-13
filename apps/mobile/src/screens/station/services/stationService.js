import apiClient from '../../../services/apiClient'
import { API_BASE_URL } from '../../../constants'

export const declareIntent = (data) =>
  apiClient.post('/amenities/intent', data)

export const predictIntent = (data) =>
  apiClient.post('/amenities/intent/predict', data)

export const getMyIntents = () =>
  apiClient.get('/amenities/intents')

export const getStationData = async (stationCode) => {
  const response = await fetch(`${API_BASE_URL}/amenities/station/${stationCode}`)
  const json = await response.json()
  if (!response.ok) throw new Error(json.error || 'Failed to load station data')
  return json.data
}

export const voteAmenity = (data) =>
  apiClient.post('/amenities/vote', data)

export const submitVendorReview = (data) =>
  apiClient.post('/amenities/vendor-review', data)

export const reportHawker = (data) =>
  apiClient.post('/amenities/hawker-report', data)

export const checkIn = (data) =>
  apiClient.post('/amenities/checkin', data)

export const getDemandForecast = async () => {
  const response = await fetch(`${API_BASE_URL}/amenities/demand/forecast`)
  const json = await response.json()
  if (!response.ok) throw new Error(json.error || 'Failed to load forecast')
  return json.data
}
