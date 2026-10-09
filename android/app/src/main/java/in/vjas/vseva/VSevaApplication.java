package in.vjas.vseva;

import android.app.Application;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.content.Context;
import android.media.AudioAttributes;
import android.net.Uri;
import android.os.Build;

/**
 * Creates the dedicated SOS notification channel at process startup, before
 * any push can arrive — Android requires a channel to exist before a
 * notification can be posted to it, and a channel's sound/importance can
 * never be changed after creation (only a new channel id can), hence the
 * "_v1" suffix: bump it if this channel's settings ever need to change.
 *
 * This is intentionally separate from OneSignal's own default channel — see
 * services/oneSignalService and netlify/functions/send-push.js for how (and
 * whether) a given push actually targets this channel.
 */
public class VSevaApplication extends Application {
    public static final String SOS_CHANNEL_ID = "vseva_sos_v1";

    @Override
    public void onCreate() {
        super.onCreate();
        createSosNotificationChannel();
    }

    private void createSosNotificationChannel() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return;

        NotificationManager manager = getSystemService(NotificationManager.class);
        if (manager == null) return;

        // Don't recreate/reconfigure if it already exists — Android ignores
        // sound/importance changes on an existing channel id anyway.
        if (manager.getNotificationChannel(SOS_CHANNEL_ID) != null) return;

        NotificationChannel channel = new NotificationChannel(
                SOS_CHANNEL_ID,
                getString(R.string.sos_channel_name), // brand-specific (res/values/strings.xml, overridden in src/ssg)
                NotificationManager.IMPORTANCE_HIGH
        );
        channel.setDescription("Urgent SOS alerts from Sevaks requiring immediate attention");
        channel.enableVibration(true);
        channel.setVibrationPattern(new long[]{0, 400, 200, 400, 200, 400});
        channel.setLockscreenVisibility(android.app.Notification.VISIBILITY_PUBLIC);
        channel.setBypassDnd(false); // never override the user's Do Not Disturb setting

        Uri soundUri = Uri.parse("android.resource://" + getPackageName() + "/raw/sos_alert");
        AudioAttributes audioAttributes = new AudioAttributes.Builder()
                .setUsage(AudioAttributes.USAGE_ALARM)
                .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                .build();
        channel.setSound(soundUri, audioAttributes);

        manager.createNotificationChannel(channel);
    }
}
