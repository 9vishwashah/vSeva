package in.vjas.vseva;

import android.Manifest;
import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import android.provider.Settings;

import androidx.core.app.NotificationManagerCompat;

import com.getcapacitor.JSObject;
import com.getcapacitor.PermissionState;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;

/**
 * Asks Android for the notification permission (Android 13+) straight from the app's own screen
 * (used by services/oneSignalService.ts and the Profile notification switch).
 *
 * OneSignal's own requestPermission() opens a separate, invisible PermissionsActivity to ask. On Android 16 that
 * activity was seen never handing over to the system dialog, and it stayed on top of the app swallowing every tap
 * (the login form looked frozen). Asking here avoids that activity entirely; OneSignal notices the granted
 * permission by itself and registers the device.
 */
@CapacitorPlugin(
    name = "NotificationPermission",
    permissions = { @Permission(alias = "notifications", strings = { Manifest.permission.POST_NOTIFICATIONS }) }
)
public class NotificationPermissionPlugin extends Plugin {

    private JSObject result() {
        JSObject r = new JSObject();
        r.put("granted", NotificationManagerCompat.from(getContext()).areNotificationsEnabled());
        return r;
    }

    @PluginMethod
    public void check(PluginCall call) {
        call.resolve(result());
    }

    @PluginMethod
    public void request(PluginCall call) {
        // before Android 13 notifications need no permission (only the app's notification setting)
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.TIRAMISU || getPermissionState("notifications") == PermissionState.GRANTED) {
            call.resolve(result());
            return;
        }
        requestPermissionForAlias("notifications", call, "afterRequest");
    }

    @PermissionCallback
    private void afterRequest(PluginCall call) {
        call.resolve(result());
    }

    // For someone who said "Don't allow" before (Android won't ask again): the app's notification settings.
    @PluginMethod
    public void openSettings(PluginCall call) {
        Intent intent;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            intent = new Intent(Settings.ACTION_APP_NOTIFICATION_SETTINGS).putExtra(Settings.EXTRA_APP_PACKAGE, getContext().getPackageName());
        } else {
            intent = new Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS, Uri.fromParts("package", getContext().getPackageName(), null));
        }
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        getContext().startActivity(intent);
        call.resolve();
    }
}
