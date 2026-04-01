// Firebase Cloud Messaging Service Worker
// Config is hardcoded here because service workers cannot access Vite env vars.
// This file is served at /firebase-messaging-sw.js

importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyAKViTJgZqQ_ffJQ3j0LYmnyNcZAFU8Itg",
  authDomain: "trashit-c02a2.firebaseapp.com",
  projectId: "trashit-c02a2",
  messagingSenderId: "1007790802752",
  appId: "1:1007790802752:web:b5915feb6871267a769ca5",
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  const title = (payload.notification && payload.notification.title) || 'TRASHit';
  const body = (payload.notification && payload.notification.body) || '';
  self.registration.showNotification(title, {
    body: body,
    icon: '/favicon.ico',
    badge: '/favicon.ico',
    data: payload.data || {},
  });
});
