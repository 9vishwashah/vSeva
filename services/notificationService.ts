export const notificationService = {
    // Check if browser supports notifications
    isSupported: () => 'Notification' in window,

    // Check current permission status
    getPermission: () => {
        if (!('Notification' in window)) return 'denied';
        return Notification.permission;
    },

    // Request permission
    requestPermission: async () => {
        if (!('Notification' in window)) {
            throw new Error("Notifications not supported in this browser");
        }

        const permission = await Notification.requestPermission();
        if (permission === 'granted') {
            notificationService.showLocalNotification("Notifications Enabled", "You will now receive updates from vSeva.");
            // Wait for service worker and subscribe
            await notificationService.subscribeToPush();
        }
        return permission;
    },

    // Subscribe to Web Push
    subscribeToPush: async () => {
        if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;
        
        try {
            const registration = await navigator.serviceWorker.ready;
            
            // Check existing subscription
            const existingSubscription = await registration.pushManager.getSubscription();
            if (existingSubscription) {
                // Already subscribed, we could optionally update the DB here
                await notificationService.saveSubscriptionToDB(existingSubscription);
                return;
            }

            // VAPID public key must be converted to Uint8Array
            const publicVapidKey = import.meta.env.VITE_VAPID_PUBLIC_KEY;
            
            if (!publicVapidKey) {
                console.warn('VITE_VAPID_PUBLIC_KEY is not defined. Push notifications cannot be enabled.');
                return;
            }

            function urlBase64ToUint8Array(base64String: string) {
                const padding = '='.repeat((4 - base64String.length % 4) % 4);
                const base64 = (base64String + padding)
                    .replace(/\-/g, '+')
                    .replace(/_/g, '/');
                
                const rawData = window.atob(base64);
                const outputArray = new Uint8Array(rawData.length);
                
                for (let i = 0; i < rawData.length; ++i) {
                    outputArray[i] = rawData.charCodeAt(i);
                }
                return outputArray;
            }

            const subscription = await registration.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: urlBase64ToUint8Array(publicVapidKey)
            });

            await notificationService.saveSubscriptionToDB(subscription);
            console.log('Push Subscribe Success');
        } catch (error) {
            console.error('Failed to subscribe to push notification', error);
        }
    },

    saveSubscriptionToDB: async (subscription: PushSubscription) => {
        try {
            const subData = JSON.parse(JSON.stringify(subscription));
            
            // Get current session
            const { supabase } = await import('./supabase');
            const { data: { session } } = await supabase.auth.getSession();
            
            if (!session?.user?.id) return;

            const { error } = await supabase
                .from('push_subscriptions')
                .upsert({
                    user_id: session.user.id,
                    endpoint: subData.endpoint,
                    p256dh: subData.keys?.p256dh,
                    auth: subData.keys?.auth
                }, { onConflict: 'user_id, endpoint' });

            if (error) {
                console.error('Error saving push subscription', error);
            }
        } catch (e) {
            console.error('Error in saveSubscriptionToDB', e);
        }
    },

    // Show a local notification (test/foreground)
    showLocalNotification: (title: string, body: string) => {
        if (Notification.permission === 'granted') {
            // Check if service worker is ready for richer notifications, else fallback to standard
            if ('serviceWorker' in navigator && navigator.serviceWorker.ready) {
                navigator.serviceWorker.ready.then(registration => {
                    registration.showNotification(title, {
                        body,
                        icon: '/vseva-logo.png',
                        vibrate: [200, 100, 200]
                    } as any);
                });
            } else {
                new Notification(title, {
                    body,
                    icon: '/logo.png'
                });
            }
        }
    }
};
