const supabase = require('./supabase-client');

/**
 * Retrieve all journeys for a user, sorted by travel date descending.
 * @param {string} userId
 * @returns {Promise<Array>} list of journeys
 */
async function getJourneysByUserId(userId) {
  try {
    if (!userId) return [];
    const { data, error } = await supabase
      .from('journeys')
      .select('*')
      .eq('user_id', userId)
      .order('travel_date', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error in getJourneysByUserId:', error);
    throw error;
  }
}

/**
 * Retrieve the single most recent upcoming journey (travel_date >= today).
 * @param {string} userId
 * @returns {Promise<Object|null>} active journey or null
 */
async function getActiveJourney(userId) {
  try {
    if (!userId) return null;
    const todayStr = new Date().toISOString().split('T')[0];

    const { data, error } = await supabase
      .from('journeys')
      .select('*')
      .eq('user_id', userId)
      .gte('travel_date', todayStr)
      .order('travel_date', { ascending: true })
      .limit(1)
      .maybeSingle();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error in getActiveJourney:', error);
    throw error;
  }
}

/**
 * Insert or update a journey by PNR and userId.
 * @param {string} userId
 * @param {Object} journeyData
 * @returns {Promise<Object>} upserted journey record
 */
async function upsertJourney(userId, journeyData) {
  try {
    if (!userId || !journeyData || !journeyData.pnr) {
      throw new Error('Missing user ID or PNR in journey data');
    }

    const record = {
      user_id: userId,
      pnr: journeyData.pnr,
      train_number: journeyData.train_number || null,
      train_name: journeyData.train_name || null,
      boarding_station: journeyData.boarding_station || null,
      destination_station: journeyData.destination_station || null,
      travel_date: journeyData.travel_date || null,
      coach: journeyData.coach || null,
      berth: journeyData.berth || null,
      class: journeyData.class || null,
      status: journeyData.status || null,
      raw_api_response: journeyData.raw_api_response || {},
      updated_at: new Date().toISOString()
    };

    const { data, error } = await supabase
      .from('journeys')
      .upsert(record, { onConflict: 'user_id,pnr' })
      .select('*')
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error in upsertJourney:', error);
    throw error;
  }
}

module.exports = {
  getJourneysByUserId,
  getActiveJourney,
  upsertJourney
};
