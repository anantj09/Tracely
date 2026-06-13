// services/api/src/services/notificationService.js

/**
 * Send a push notification via Expo's push notification service.
 * NEVER throws — wrapped in try/catch. Complaint operations continue even if push fails.
 */
const sendPushNotification = async (expoPushToken, title, body) => {
  if (!expoPushToken) {
    console.log('[PUSH] No token provided — skipping notification');
    return;
  }

  const tokenPreview = expoPushToken.substring(0, 20) + '...';

  try {
    const response = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Accept-Encoding': 'gzip, deflate',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        to: expoPushToken,
        sound: 'default',
        title,
        body,
        data: {},
      }),
    });

    const result = await response.json();

    if (result.data && result.data.status === 'ok') {
      console.log(`[PUSH] token=${tokenPreview} status=sent`);
    } else {
      console.log(`[PUSH] token=${tokenPreview} status=failed details=${JSON.stringify(result)}`);
    }
  } catch (error) {
    console.error(`[PUSH] token=${tokenPreview} status=failed error=${error.message}`);
  }
};

module.exports = { sendPushNotification };
