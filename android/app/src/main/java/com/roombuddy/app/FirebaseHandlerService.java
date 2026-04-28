package com.roombuddy.app;

import com.google.firebase.messaging.FirebaseMessagingService;
import com.google.firebase.messaging.RemoteMessage;
import android.util.Log;

public class FirebaseHandlerService extends FirebaseMessagingService {

    @Override
    public void onMessageReceived(RemoteMessage remoteMessage) {
        Log.d("FirebaseHandlerService", "Message Received: " + remoteMessage.getFrom());

        if (remoteMessage.getData().size() > 0) {
            Log.d("FirebaseHandlerService", "Message data: " + remoteMessage.getData());
        }

        if (remoteMessage.getNotification() != null) {
            Log.d("FirebaseHandlerService", "Message notification: " + remoteMessage.getNotification().getBody());
        }

        // Pass the message to Capacitor Push Notifications plugin
        super.onMessageReceived(remoteMessage);
    }

    @Override
    public void onNewToken(String token) {
        Log.d("FirebaseHandlerService", "FCM Token refreshed: " + token);
        // Save the new token to shared preferences or send to your server
        super.onNewToken(token);
    }
}
