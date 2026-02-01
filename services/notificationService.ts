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
        }
        return permission;
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
