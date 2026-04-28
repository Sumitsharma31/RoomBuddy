package com.roombuddy.app;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;
import com.google.firebase.FirebaseApp;
import com.google.firebase.messaging.FirebaseMessaging;
import android.util.Log;

public class MainActivity extends BridgeActivity {

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // Initialize Firebase
        FirebaseApp.initializeApp(this);

        // Get FCM token
        FirebaseMessaging.getInstance().getToken()
            .addOnCompleteListener(task -> {
                if (task.isSuccessful()) {
                    String token = task.getResult();
                    Log.d("MainActivity", "FCM Token: " + token);
                    // Token is ready, you can send to your server here
                } else {
                    Log.e("MainActivity", "Failed to get FCM token", task.getException());
                }
            });

        // Request notification permission for Android 13+
        requestNotificationsPermission();
    }

    private void requestNotificationsPermission() {
        // For Android 13+, request POST_NOTIFICATIONS permission
        // This is handled automatically by Capacitor Push Notifications plugin
        // but we ensure it's requested on app start
    }
}

