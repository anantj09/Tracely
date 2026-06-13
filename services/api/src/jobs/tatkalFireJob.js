// services/api/src/jobs/tatkalFireJob.js
// Background scheduled job to process due Tatkal pending requests.
// Path: services/api/src/jobs/tatkalFireJob.js

const supabase = require('../db/supabase-client');

/**
 * Main worker function that finds due pending Tatkal requests,
 * marks them as firing, simulates the transaction, and locks the journeys.
 */
async function firePendingRequests() {
  try {
    const nowStr = new Date().toISOString();

    // Query PENDING requests whose scheduled fire time has passed
    const { data: pendingRequests, error: queryError } = await supabase
      .from('tatkal_requests')
      .select('*')
      .eq('status', 'PENDING')
      .lte('scheduled_fire_time', nowStr);

    if (queryError) {
      console.error('[TATKAL_FIRE] Error querying pending requests:', queryError.message);
      return;
    }

    if (!pendingRequests || pendingRequests.length === 0) {
      return;
    }

    console.log(`[TATKAL_FIRE] Found ${pendingRequests.length} pending Tatkal requests to process.`);

    for (const req of pendingRequests) {
      try {
        // Concurrency protection step: re-query status directly to check locks before taking action
        const { data: freshReq, error: fetchErr } = await supabase
          .from('tatkal_requests')
          .select('status')
          .eq('id', req.id)
          .maybeSingle();

        if (fetchErr) {
          console.error(`[TATKAL_FIRE] Error fetching status for request ${req.id}:`, fetchErr.message);
          continue;
        }

        if (!freshReq || freshReq.status !== 'PENDING') {
          console.log(`[TATKAL_FIRE] Request ${req.id} is no longer PENDING (status: ${freshReq ? freshReq.status : 'NOT_FOUND'}). Skipping.`);
          continue;
        }

        // Atomic update to mark request as FIRED.
        const { data: updatedReq, error: updateError } = await supabase
          .from('tatkal_requests')
          .update({ status: 'FIRED', updated_at: nowStr })
          .eq('id', req.id)
          .eq('status', 'PENDING')
          .select()
          .maybeSingle();

        if (updateError) {
          console.error(`[TATKAL_FIRE] Error marking request ${req.id} as FIRED:`, updateError.message);
          continue;
        }

        // Double-firing fallback guard
        if (!updatedReq) {
          console.log(`[TATKAL_FIRE] Request ${req.id} was already processed or cancelled. Skipping.`);
          continue;
        }

        console.log(`[TATKAL_FIRE] request_id=${req.id} status=FIRING at=${new Date().toISOString()}`);

        // Simulate 2-second booking latency
        await new Promise(resolve => setTimeout(resolve, 2000));

        // Generate simulated PNR (DEMO + 6 random digits)
        const simulatedPnr = 'DEMO' + Math.floor(100000 + Math.random() * 900000);

        // Update status to CONFIRMED
        const { data: confirmedReq, error: confirmError } = await supabase
          .from('tatkal_requests')
          .update({
            status: 'CONFIRMED',
            simulated_pnr: simulatedPnr,
            updated_at: new Date().toISOString()
          })
          .eq('id', req.id)
          .select()
          .single();

        if (confirmError) {
          console.error(`[TATKAL_FIRE] Error confirming request ${req.id}:`, confirmError.message);
          // Set to FAILED as fallback if confirmation update fails
          await supabase
            .from('tatkal_requests')
            .update({ status: 'FAILED', updated_at: new Date().toISOString() })
            .eq('id', req.id);
          continue;
        }

        // Insert journey locks for all passengers
        const passengers = Array.isArray(confirmedReq.passengers) ? confirmedReq.passengers : [];
        if (passengers.length > 0) {
          const locks = passengers.map(p => ({
            user_id: confirmedReq.user_id,
            passenger_name: p.name,
            pnr: simulatedPnr,
            lock_start: confirmedReq.departure_datetime,
            lock_end: confirmedReq.arrival_datetime
          }));

          const { error: locksInsertError } = await supabase
            .from('tatkal_journey_locks')
            .insert(locks);

          if (locksInsertError) {
            console.error(`[TATKAL_FIRE] Failed to insert journey locks for request ${req.id}:`, locksInsertError.message);
          }
        }

        console.log(`[TATKAL_FIRE] request_id=${req.id} status=CONFIRMED pnr=${simulatedPnr} at=${new Date().toISOString()}`);

      } catch (innerErr) {
        console.error(`[TATKAL_FIRE] Exception processing request ${req.id}:`, innerErr.message);
      }
    }
  } catch (err) {
    console.error('[TATKAL_FIRE] Unhandled error in firePendingRequests scheduled job:', err.message);
  }
}

let intervalId = null;

function start() {
  if (intervalId) {
    return;
  }
  console.log('[TATKAL_FIRE] Starting Tatkal Fire scheduled job (30s interval)...');
  
  // Run once immediately on start
  firePendingRequests();
  
  // Run every 30 seconds
  intervalId = setInterval(firePendingRequests, 30000);
}

function stop() {
  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
    console.log('[TATKAL_FIRE] Tatkal Fire scheduled job stopped.');
  }
}

module.exports = {
  start,
  stop
};
