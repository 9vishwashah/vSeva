package in.vjas.vseva;

import android.Manifest;
import android.content.ActivityNotFoundException;
import android.content.ComponentName;
import android.content.ContentResolver;
import android.content.ContentValues;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.media.MediaScannerConnection;
import android.net.Uri;
import android.os.Build;
import android.os.Environment;
import android.provider.MediaStore;

import androidx.core.content.FileProvider;

import com.getcapacitor.JSObject;
import com.getcapacitor.PermissionState;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;

import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.io.OutputStream;

/**
 * Direct sharing that the generic Android share sheet can't do (used by services/nativeShare.ts):
 *  - shareTo "whatsapp": opens WhatsApp's own "Send to" picker with the image (and/or text) already attached;
 *    "My status" is the first entry there, so the same call covers chats, groups and Status.
 *  - shareTo "instagram_story": opens Instagram's Story composer with the image as the background.
 *  - saveToGallery: copies an image into Pictures/<album> so it shows up in the phone's Gallery / Photos.
 * Files come from the app's cache folder (written by @capacitor/filesystem) and are handed over through the
 * app's FileProvider with a read-only grant; nothing is uploaded anywhere.
 */
@CapacitorPlugin(
    name = "AppShare",
    permissions = { @Permission(alias = "storage", strings = { Manifest.permission.WRITE_EXTERNAL_STORAGE }) }
)
public class AppSharePlugin extends Plugin {

    private static final String WHATSAPP = "com.whatsapp";
    private static final String WHATSAPP_BUSINESS = "com.whatsapp.w4b";
    private static final String INSTAGRAM = "com.instagram.android";
    // Instagram's "Stories" entry in the Android share sheet
    private static final String INSTAGRAM_STORY_ACTIVITY = "com.instagram.share.handleractivity.StoryShareHandlerActivity";

    private boolean installed(String pkg) {
        try {
            getContext().getPackageManager().getPackageInfo(pkg, 0);
            return true;
        } catch (PackageManager.NameNotFoundException e) {
            return false;
        }
    }

    @PluginMethod
    public void apps(PluginCall call) {
        JSObject ret = new JSObject();
        ret.put("whatsapp", installed(WHATSAPP) || installed(WHATSAPP_BUSINESS));
        ret.put("instagram", installed(INSTAGRAM));
        call.resolve(ret);
    }

    private Uri contentUri(String path) {
        Context ctx = getContext();
        File file = new File(Uri.parse(path).getPath());
        return FileProvider.getUriForFile(ctx, ctx.getPackageName() + ".fileprovider", file);
    }

    private boolean resolves(Intent intent) {
        return intent.resolveActivity(getContext().getPackageManager()) != null;
    }

    @PluginMethod
    public void shareTo(PluginCall call) {
        String target = call.getString("target", "");
        String path = call.getString("path");
        String text = call.getString("text");
        String facebookAppId = call.getString("facebookAppId");

        Uri uri = null;
        if (path != null && !path.isEmpty()) {
            try {
                uri = contentUri(path);
            } catch (Exception e) {
                call.reject("Could not read the image", "bad_file", e);
                return;
            }
        }

        Intent intent;
        if ("whatsapp".equals(target)) {
            String pkg = installed(WHATSAPP) ? WHATSAPP : (installed(WHATSAPP_BUSINESS) ? WHATSAPP_BUSINESS : null);
            if (pkg == null) {
                call.reject("WhatsApp is not installed", "not_installed");
                return;
            }
            intent = new Intent(Intent.ACTION_SEND);
            intent.setPackage(pkg);
            if (uri != null) {
                intent.setType("image/png");
                intent.putExtra(Intent.EXTRA_STREAM, uri);
                intent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
            } else {
                intent.setType("text/plain");
            }
            if (text != null && !text.isEmpty()) intent.putExtra(Intent.EXTRA_TEXT, text);
        } else if ("instagram_story".equals(target)) {
            if (!installed(INSTAGRAM)) {
                call.reject("Instagram is not installed", "not_installed");
                return;
            }
            if (uri == null) {
                call.reject("An image is required for a Story", "bad_file");
                return;
            }
            getActivity().grantUriPermission(INSTAGRAM, uri, Intent.FLAG_GRANT_READ_URI_PERMISSION);
            intent = storyIntent(uri, facebookAppId);
        } else {
            call.reject("Unknown target " + target, "bad_target");
            return;
        }

        try {
            getActivity().startActivity(intent);
            call.resolve();
        } catch (ActivityNotFoundException e) {
            call.reject("Could not open the app", "not_installed", e);
        }
    }

    // Meta's documented Story intent (with the app's Facebook App ID when one is configured), else Instagram's
    // own "Stories" share target, else Instagram's general share screen (where Story is one of the options).
    private Intent storyIntent(Uri uri, String facebookAppId) {
        Intent addToStory = new Intent("com.instagram.share.ADD_TO_STORY");
        addToStory.setPackage(INSTAGRAM);
        addToStory.setDataAndType(uri, "image/png");
        addToStory.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
        if (facebookAppId != null && !facebookAppId.isEmpty()) {
            addToStory.putExtra("source_application", facebookAppId);
            if (resolves(addToStory)) return addToStory;
        }

        Intent storyTarget = new Intent(Intent.ACTION_SEND);
        storyTarget.setComponent(new ComponentName(INSTAGRAM, INSTAGRAM_STORY_ACTIVITY));
        storyTarget.setType("image/png");
        storyTarget.putExtra(Intent.EXTRA_STREAM, uri);
        storyTarget.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
        if (resolves(storyTarget)) return storyTarget;

        if (resolves(addToStory)) return addToStory;

        Intent general = new Intent(Intent.ACTION_SEND);
        general.setPackage(INSTAGRAM);
        general.setType("image/png");
        general.putExtra(Intent.EXTRA_STREAM, uri);
        general.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
        return general;
    }

    @PluginMethod
    public void saveToGallery(PluginCall call) {
        // Android 10+ writes to the shared Pictures folder without any permission; older versions need storage.
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.Q && getPermissionState("storage") != PermissionState.GRANTED) {
            requestPermissionForAlias("storage", call, "storagePermissionCallback");
            return;
        }
        save(call);
    }

    @PermissionCallback
    private void storagePermissionCallback(PluginCall call) {
        if (getPermissionState("storage") == PermissionState.GRANTED) {
            save(call);
        } else {
            call.reject("Storage permission is needed to save the image", "permission_denied");
        }
    }

    private void save(PluginCall call) {
        String path = call.getString("path");
        String fileName = call.getString("fileName", "image.png");
        String album = call.getString("album", "Pictures");
        if (path == null) {
            call.reject("No image", "bad_file");
            return;
        }
        File source = new File(Uri.parse(path).getPath());
        ContentResolver resolver = getContext().getContentResolver();
        try {
            Uri saved;
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                ContentValues values = new ContentValues();
                values.put(MediaStore.Images.Media.DISPLAY_NAME, fileName);
                values.put(MediaStore.Images.Media.MIME_TYPE, "image/png");
                values.put(MediaStore.Images.Media.RELATIVE_PATH, Environment.DIRECTORY_PICTURES + "/" + album);
                values.put(MediaStore.Images.Media.IS_PENDING, 1);
                saved = resolver.insert(MediaStore.Images.Media.getContentUri(MediaStore.VOLUME_EXTERNAL_PRIMARY), values);
                if (saved == null) throw new Exception("MediaStore insert failed");
                try (InputStream in = new FileInputStream(source); OutputStream out = resolver.openOutputStream(saved)) {
                    copy(in, out);
                }
                values.clear();
                values.put(MediaStore.Images.Media.IS_PENDING, 0);
                resolver.update(saved, values, null, null);
            } else {
                File dir = new File(Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_PICTURES), album);
                if (!dir.exists() && !dir.mkdirs()) throw new Exception("Could not create " + dir);
                File dest = new File(dir, fileName);
                try (InputStream in = new FileInputStream(source); OutputStream out = new FileOutputStream(dest)) {
                    copy(in, out);
                }
                MediaScannerConnection.scanFile(getContext(), new String[] { dest.getAbsolutePath() }, new String[] { "image/png" }, null);
                saved = Uri.fromFile(dest);
            }
            JSObject ret = new JSObject();
            ret.put("uri", saved.toString());
            call.resolve(ret);
        } catch (Exception e) {
            call.reject("Could not save the image", "save_failed", e);
        }
    }

    private static void copy(InputStream in, OutputStream out) throws java.io.IOException {
        if (out == null) throw new java.io.IOException("No output stream");
        byte[] buf = new byte[8192];
        int n;
        while ((n = in.read(buf)) > 0) out.write(buf, 0, n);
    }
}
