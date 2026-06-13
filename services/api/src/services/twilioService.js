const twilio = require('twilio');

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const fromNumber = process.env.TWILIO_FROM_NUMBER;

let twilioClient = null;

if (accountSid && authToken) {
  try {
    twilioClient = twilio(accountSid, authToken);
  } catch (err) {
    console.error('Failed to initialize Twilio client:', err.message);
  }
} else {
  console.warn('Twilio credentials missing. SMS alerts will be logged to console only.');
}

/**
 * Sends SOS alert SMS messages to an array of phone numbers.
 * 
 * @param {Array<string>} toNumbersArray - Array of phone numbers to send the message to
 * @param {Object} location - Location object with lat and lng
 * @param {string} initials - Masked passenger initials
 * @param {string} type - Alert type (e.g. 'SOS')
 * @returns {Promise<number>} Number of successfully sent messages
 */
async function sendSOSMessage(toNumbersArray, location, initials, type) {
  if (!toNumbersArray || !Array.isArray(toNumbersArray) || toNumbersArray.length === 0) {
    console.log('[SMS] No emergency contacts found to dispatch.');
    return 0;
  }

  const lat = location?.lat || 0;
  const lng = location?.lng || 0;
  const mapsLink = `https://maps.google.com/?q=${lat},${lng}`;
  const messageBody = `URGENT: ${initials} has triggered an ${type} alert. Location: ${mapsLink}`;

  console.log(`[SMS Dispatch] Sending alerts to ${toNumbersArray.length} contacts. Msg: "${messageBody}"`);

  let successCount = 0;

  for (const phoneNumber of toNumbersArray) {
    try {
      // Clean up phone number: remove non-digits
      let cleanNumber = phoneNumber.replace(/\D/g, '');
      if (cleanNumber.length === 10) {
        cleanNumber = `+91${cleanNumber}`;
      } else if (cleanNumber.length === 12 && cleanNumber.startsWith('91')) {
        cleanNumber = `+${cleanNumber}`;
      } else if (!cleanNumber.startsWith('+')) {
        cleanNumber = `+${cleanNumber}`;
      }

      if (twilioClient && fromNumber) {
        await twilioClient.messages.create({
          body: messageBody,
          from: fromNumber,
          to: cleanNumber,
        });
        console.log(`[SMS] Successfully sent SOS message to ${cleanNumber}`);
        successCount++;
      } else {
        console.log(`[SMS MOCK] (Twilio unconfigured) Sent to ${cleanNumber}: ${messageBody}`);
        successCount++;
      }
    } catch (err) {
      console.error(`[SMS] Failed to send SOS message to ${phoneNumber}:`, err.message);
    }
  }

  return successCount;
}

module.exports = {
  sendSOSMessage
};
