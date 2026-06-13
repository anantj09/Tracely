require('dotenv').config();

/**
 * Returns a date string "YYYY-MM-DD" relative to today.
 * @param {number} daysFromNow
 * @returns {string} date string
 */
function getMockDate(daysFromNow) {
  const d = new Date();
  d.setDate(d.getDate() + daysFromNow);
  return d.toISOString().split('T')[0];
}

/**
 * Fetches the PNR status from the external API or resolves a realistic mock fallback.
 * @param {string} pnr - 10-digit PNR string
 * @returns {Promise<Object>} normalized journey details
 */
async function fetchPNRStatus(pnr) {
  const apiKey = process.env.NTES_API_KEY;

  if (apiKey && apiKey !== 'optional') {
    try {
      console.log(`Executing active PNR check via IndianRailAPI for PNR: ${pnr}`);
      const url = `https://indianrailapi.com/api/v2/PNRCheck/apikey/${apiKey}/PNRNumber/${pnr}/`;
      
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`IndianRailAPI returned status: ${response.status}`);
      }

      const rawData = await response.json();

      // Normalize the response fields. IndianRailAPI standard fields:
      // TrainNumber, TrainName, BoardingStation, ReservationUpto, DateOfJourney, Class, Passangers[0].Coach, Passangers[0].BookingStatus, etc.
      const firstPassenger = rawData.Passangers && rawData.Passangers[0] ? rawData.Passangers[0] : {};

      // Parse date to YYYY-MM-DD (typically DD-MM-YYYY or YYYYMMDD in IndianRailAPI)
      let travelDate = getMockDate(7); // Default fallback
      if (rawData.DateOfJourney) {
        // e.g. "15-06-2026" or similar
        const parts = rawData.DateOfJourney.split('-');
        if (parts.length === 3) {
          // convert to YYYY-MM-DD
          travelDate = `${parts[2]}-${parts[1]}-${parts[0]}`;
        } else {
          travelDate = rawData.DateOfJourney;
        }
      }

      return {
        train_number: rawData.TrainNumber || 'Unknown',
        train_name: rawData.TrainName || 'Unknown',
        boarding_station: rawData.BoardingStation || 'Unknown',
        destination_station: rawData.ReservationUpto || 'Unknown',
        travel_date: travelDate,
        coach: firstPassenger.Coach || 'GEN',
        berth: firstPassenger.BerthNo || 'N/A',
        class: rawData.Class || 'SL',
        status: firstPassenger.BookingStatus || 'CONFIRMED',
        raw_api_response: rawData
      };
    } catch (apiError) {
      console.error('External PNR API failed. Falling back to mock data:', apiError.message);
      // Fall through to mock logic on failure
    }
  }

  // Hackathon/Demo Mode Mock logic (NTES_API_KEY not set or lookup failed)
  const lastDigit = parseInt(pnr[pnr.length - 1], 10);

  if (lastDigit >= 0 && lastDigit <= 2) {
    return {
      train_number: '12951',
      train_name: 'Mumbai Rajdhani',
      boarding_station: 'NDLS',
      destination_station: 'MMCT',
      travel_date: getMockDate(7),
      coach: 'B4',
      berth: '32',
      class: '3A',
      status: 'CONFIRMED',
      raw_api_response: { mock: true, pnr, lastDigit }
    };
  } else if (lastDigit >= 3 && lastDigit <= 5) {
    return {
      train_number: '12301',
      train_name: 'Howrah Rajdhani',
      boarding_station: 'NDLS',
      destination_station: 'HWH',
      travel_date: getMockDate(14),
      coach: 'A1',
      berth: '15',
      class: '2A',
      status: 'RAC',
      raw_api_response: { mock: true, pnr, lastDigit }
    };
  } else {
    // 6-9
    return {
      train_number: '12627',
      train_name: 'Karnataka Express',
      boarding_station: 'SBC',
      destination_station: 'NDLS',
      travel_date: getMockDate(3),
      coach: 'S5',
      berth: '45',
      class: 'SL',
      status: 'CONFIRMED',
      raw_api_response: { mock: true, pnr, lastDigit }
    };
  }
}

module.exports = {
  fetchPNRStatus
};
