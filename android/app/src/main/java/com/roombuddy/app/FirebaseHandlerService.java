package com.roombuddy.app;

import com.google.firebase.messaging.FirebaseMessagingService;
import com.google.firebase.messaging.RemoteMessage;
import com.getcapacitor.Logger;

public class FirebaseHandlerService extends FirebaseMessagingService {

    @Override
    public void onMessageReceived(RemoteMessage remoteMessage) {
        Logger.d("FirebaseHandlerService", "Message Received: " + remoteMessage.getFrom());

        if (remoteMessage.getData().size() > 0) {
            Logger.d("FirebaseHandlerService", "Message data: " + remoteMessage.getData());
        }

        if (remoteMessage.getNotification() != null) {
            Logger.d("FirebaseHandlerService", "Message notification: " + remoteMessage.getNotification().getBody());
        }

        // Pass the message to Capacitor Push Notifications plugin
        super.onMessageReceived(remoteMessage);
    }

    @Override
    public void onNewToken(String token) {
        Logger.d("FirebaseHandlerService", "FCM Token refreshed: " + token);
        // Save the new token to shared preferences or send to your server
        super.onNewToken(token);
    }
}
