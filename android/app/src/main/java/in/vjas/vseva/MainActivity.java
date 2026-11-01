package in.vjas.vseva;

import android.content.SharedPreferences;
import android.content.pm.PackageManager;
import android.os.Bundle;

import androidx.core.content.pm.PackageInfoCompat;

import com.getcapacitor.BridgeActivity;

import java.io.File;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        clearStaleServiceWorker();
        // App-local plugins must be registered before the bridge starts.
        registerPlugin(AppSharePlugin.class);
        registerPlugin(NotificationPermissionPlugin.class);
        super.onCreate(savedInstanceState);
    }

    // Version 1.2 registered the website's service worker inside the app. After an update it keeps serving the old
    // cached screens (with the old start-up that froze on a weak network), and the new web code can't remove it
    // because the old cached code runs instead. So once per app version, before the WebView starts, delete the
    // WebView's service worker storage. Sign-in and saved data (localStorage) live elsewhere and are kept.
    private void clearStaleServiceWorker() {
        try {
            long version = PackageInfoCompat.getLongVersionCode(getPackageManager().getPackageInfo(getPackageName(), 0));
            SharedPreferences prefs = getSharedPreferences("app_upgrade", MODE_PRIVATE);
            if (prefs.getLong("swClearedFor", -1) == version) return;
            deleteRecursively(new File(getDataDir(), "app_webview/Default/Service Worker"));
            prefs.edit().putLong("swClearedFor", version).apply();
        } catch (PackageManager.NameNotFoundException ignored) {
            // our own package always exists
        }
    }

    private static void deleteRecursively(File f) {
        File[] children = f.listFiles();
        if (children != null) for (File c : children) deleteRecursively(c);
        //noinspection ResultOfMethodCallIgnored
        f.delete();
    }
}
