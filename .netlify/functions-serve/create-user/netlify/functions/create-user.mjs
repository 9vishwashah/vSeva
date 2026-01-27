
import {createRequire as ___nfyCreateRequire} from "module";
import {fileURLToPath as ___nfyFileURLToPath} from "url";
import {dirname as ___nfyPathDirname} from "path";
let __filename=___nfyFileURLToPath(import.meta.url);
let __dirname=___nfyPathDirname(___nfyFileURLToPath(import.meta.url));
let require=___nfyCreateRequire(import.meta.url);


// netlify/functions/create-user.js
import { createClient } from "@supabase/supabase-js";
async function handler(request) {
  try {
    if (request.method !== "POST") {
      return new Response(
        JSON.stringify({ error: "Method Not Allowed" }),
        { status: 405 }
      );
    }
    const authHeader = request.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Missing Authorization header" }),
        { status: 401 }
      );
    }
    const jwt = authHeader.replace("Bearer ", "");
    const supabaseAdmin = createClient(
      process.env.VITE_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );
    const {
      data: { user },
      error: authError
    } = await supabaseAdmin.auth.getUser(jwt);
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Invalid or expired token" }),
        { status: 401 }
      );
    }
    const { data: profile, error: profileError } = await supabaseAdmin.from("profiles").select("role").eq("id", user.id).single();
    if (profileError || profile?.role !== "admin") {
      return new Response(
        JSON.stringify({ error: "Admin access required" }),
        { status: 403 }
      );
    }
    const { email, password } = await request.json();
    if (!email || !password) {
      return new Response(
        JSON.stringify({ error: "Email and password are required" }),
        { status: 400 }
      );
    }
    const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true
    });
    if (createError) {
      return new Response(
        JSON.stringify({ error: createError.message }),
        { status: 400 }
      );
    }
    return new Response(
      JSON.stringify({ user_id: newUser.user.id }),
      { status: 200 }
    );
  } catch (err) {
    console.error("create-user error:", err);
    return new Response(
      JSON.stringify({ error: "Internal Server Error" }),
      { status: 500 }
    );
  }
}
export {
  handler as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsibmV0bGlmeS9mdW5jdGlvbnMvY3JlYXRlLXVzZXIuanMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImltcG9ydCB7IGNyZWF0ZUNsaWVudCB9IGZyb20gJ0BzdXBhYmFzZS9zdXBhYmFzZS1qcyc7XHJcblxyXG5leHBvcnQgZGVmYXVsdCBhc3luYyBmdW5jdGlvbiBoYW5kbGVyKHJlcXVlc3QpIHtcclxuICB0cnkge1xyXG4gICAgLy8gMS4gT25seSBhbGxvdyBQT1NUXHJcbiAgICBpZiAocmVxdWVzdC5tZXRob2QgIT09ICdQT1NUJykge1xyXG4gICAgICByZXR1cm4gbmV3IFJlc3BvbnNlKFxyXG4gICAgICAgIEpTT04uc3RyaW5naWZ5KHsgZXJyb3I6ICdNZXRob2QgTm90IEFsbG93ZWQnIH0pLFxyXG4gICAgICAgIHsgc3RhdHVzOiA0MDUgfVxyXG4gICAgICApO1xyXG4gICAgfVxyXG5cclxuICAgIC8vIDIuIEF1dGhvcml6YXRpb24gaGVhZGVyIHJlcXVpcmVkXHJcbiAgICBjb25zdCBhdXRoSGVhZGVyID0gcmVxdWVzdC5oZWFkZXJzLmdldCgnYXV0aG9yaXphdGlvbicpO1xyXG4gICAgaWYgKCFhdXRoSGVhZGVyIHx8ICFhdXRoSGVhZGVyLnN0YXJ0c1dpdGgoJ0JlYXJlciAnKSkge1xyXG4gICAgICByZXR1cm4gbmV3IFJlc3BvbnNlKFxyXG4gICAgICAgIEpTT04uc3RyaW5naWZ5KHsgZXJyb3I6ICdNaXNzaW5nIEF1dGhvcml6YXRpb24gaGVhZGVyJyB9KSxcclxuICAgICAgICB7IHN0YXR1czogNDAxIH1cclxuICAgICAgKTtcclxuICAgIH1cclxuXHJcbiAgICBjb25zdCBqd3QgPSBhdXRoSGVhZGVyLnJlcGxhY2UoJ0JlYXJlciAnLCAnJyk7XHJcblxyXG4gICAgLy8gMy4gU3VwYWJhc2UgYWRtaW4gY2xpZW50IChzZXJ2aWNlIHJvbGUpXHJcbiAgICBjb25zdCBzdXBhYmFzZUFkbWluID0gY3JlYXRlQ2xpZW50KFxyXG4gICAgICBwcm9jZXNzLmVudi5WSVRFX1NVUEFCQVNFX1VSTCxcclxuICAgICAgcHJvY2Vzcy5lbnYuU1VQQUJBU0VfU0VSVklDRV9ST0xFX0tFWVxyXG4gICAgKTtcclxuXHJcbiAgICAvLyA0LiBWZXJpZnkgYWRtaW4gdXNlclxyXG4gICAgY29uc3Qge1xyXG4gICAgICBkYXRhOiB7IHVzZXIgfSxcclxuICAgICAgZXJyb3I6IGF1dGhFcnJvcixcclxuICAgIH0gPSBhd2FpdCBzdXBhYmFzZUFkbWluLmF1dGguZ2V0VXNlcihqd3QpO1xyXG5cclxuICAgIGlmIChhdXRoRXJyb3IgfHwgIXVzZXIpIHtcclxuICAgICAgcmV0dXJuIG5ldyBSZXNwb25zZShcclxuICAgICAgICBKU09OLnN0cmluZ2lmeSh7IGVycm9yOiAnSW52YWxpZCBvciBleHBpcmVkIHRva2VuJyB9KSxcclxuICAgICAgICB7IHN0YXR1czogNDAxIH1cclxuICAgICAgKTtcclxuICAgIH1cclxuXHJcbiAgICAvLyA1LiBDaGVjayBhZG1pbiByb2xlIGZyb20gcHJvZmlsZXNcclxuICAgIGNvbnN0IHsgZGF0YTogcHJvZmlsZSwgZXJyb3I6IHByb2ZpbGVFcnJvciB9ID0gYXdhaXQgc3VwYWJhc2VBZG1pblxyXG4gICAgICAuZnJvbSgncHJvZmlsZXMnKVxyXG4gICAgICAuc2VsZWN0KCdyb2xlJylcclxuICAgICAgLmVxKCdpZCcsIHVzZXIuaWQpXHJcbiAgICAgIC5zaW5nbGUoKTtcclxuXHJcbiAgICBpZiAocHJvZmlsZUVycm9yIHx8IHByb2ZpbGU/LnJvbGUgIT09ICdhZG1pbicpIHtcclxuICAgICAgcmV0dXJuIG5ldyBSZXNwb25zZShcclxuICAgICAgICBKU09OLnN0cmluZ2lmeSh7IGVycm9yOiAnQWRtaW4gYWNjZXNzIHJlcXVpcmVkJyB9KSxcclxuICAgICAgICB7IHN0YXR1czogNDAzIH1cclxuICAgICAgKTtcclxuICAgIH1cclxuXHJcbiAgICAvLyA2LiBQYXJzZSByZXF1ZXN0IGJvZHlcclxuICAgIGNvbnN0IHsgZW1haWwsIHBhc3N3b3JkIH0gPSBhd2FpdCByZXF1ZXN0Lmpzb24oKTtcclxuXHJcbiAgICBpZiAoIWVtYWlsIHx8ICFwYXNzd29yZCkge1xyXG4gICAgICByZXR1cm4gbmV3IFJlc3BvbnNlKFxyXG4gICAgICAgIEpTT04uc3RyaW5naWZ5KHsgZXJyb3I6ICdFbWFpbCBhbmQgcGFzc3dvcmQgYXJlIHJlcXVpcmVkJyB9KSxcclxuICAgICAgICB7IHN0YXR1czogNDAwIH1cclxuICAgICAgKTtcclxuICAgIH1cclxuXHJcbiAgICAvLyA3LiBDcmVhdGUgYXV0aCB1c2VyXHJcbiAgICBjb25zdCB7IGRhdGE6IG5ld1VzZXIsIGVycm9yOiBjcmVhdGVFcnJvciB9ID1cclxuICAgICAgYXdhaXQgc3VwYWJhc2VBZG1pbi5hdXRoLmFkbWluLmNyZWF0ZVVzZXIoe1xyXG4gICAgICAgIGVtYWlsLFxyXG4gICAgICAgIHBhc3N3b3JkLFxyXG4gICAgICAgIGVtYWlsX2NvbmZpcm06IHRydWUsXHJcbiAgICAgIH0pO1xyXG5cclxuICAgIGlmIChjcmVhdGVFcnJvcikge1xyXG4gICAgICByZXR1cm4gbmV3IFJlc3BvbnNlKFxyXG4gICAgICAgIEpTT04uc3RyaW5naWZ5KHsgZXJyb3I6IGNyZWF0ZUVycm9yLm1lc3NhZ2UgfSksXHJcbiAgICAgICAgeyBzdGF0dXM6IDQwMCB9XHJcbiAgICAgICk7XHJcbiAgICB9XHJcblxyXG4gICAgLy8gOC4gU1VDQ0VTUyBcdTIwMTQgcmV0dXJuIFJlc3BvbnNlIChUSElTIElTIENSSVRJQ0FMKVxyXG4gICAgcmV0dXJuIG5ldyBSZXNwb25zZShcclxuICAgICAgSlNPTi5zdHJpbmdpZnkoeyB1c2VyX2lkOiBuZXdVc2VyLnVzZXIuaWQgfSksXHJcbiAgICAgIHsgc3RhdHVzOiAyMDAgfVxyXG4gICAgKTtcclxuXHJcbiAgfSBjYXRjaCAoZXJyKSB7XHJcbiAgICBjb25zb2xlLmVycm9yKCdjcmVhdGUtdXNlciBlcnJvcjonLCBlcnIpO1xyXG4gICAgcmV0dXJuIG5ldyBSZXNwb25zZShcclxuICAgICAgSlNPTi5zdHJpbmdpZnkoeyBlcnJvcjogJ0ludGVybmFsIFNlcnZlciBFcnJvcicgfSksXHJcbiAgICAgIHsgc3RhdHVzOiA1MDAgfVxyXG4gICAgKTtcclxuICB9XHJcbn1cclxuIl0sCiAgIm1hcHBpbmdzIjogIjs7Ozs7Ozs7OztBQUFBLFNBQVMsb0JBQW9CO0FBRTdCLGVBQU8sUUFBK0IsU0FBUztBQUM3QyxNQUFJO0FBRUYsUUFBSSxRQUFRLFdBQVcsUUFBUTtBQUM3QixhQUFPLElBQUk7QUFBQSxRQUNULEtBQUssVUFBVSxFQUFFLE9BQU8scUJBQXFCLENBQUM7QUFBQSxRQUM5QyxFQUFFLFFBQVEsSUFBSTtBQUFBLE1BQ2hCO0FBQUEsSUFDRjtBQUdBLFVBQU0sYUFBYSxRQUFRLFFBQVEsSUFBSSxlQUFlO0FBQ3RELFFBQUksQ0FBQyxjQUFjLENBQUMsV0FBVyxXQUFXLFNBQVMsR0FBRztBQUNwRCxhQUFPLElBQUk7QUFBQSxRQUNULEtBQUssVUFBVSxFQUFFLE9BQU8sK0JBQStCLENBQUM7QUFBQSxRQUN4RCxFQUFFLFFBQVEsSUFBSTtBQUFBLE1BQ2hCO0FBQUEsSUFDRjtBQUVBLFVBQU0sTUFBTSxXQUFXLFFBQVEsV0FBVyxFQUFFO0FBRzVDLFVBQU0sZ0JBQWdCO0FBQUEsTUFDcEIsUUFBUSxJQUFJO0FBQUEsTUFDWixRQUFRLElBQUk7QUFBQSxJQUNkO0FBR0EsVUFBTTtBQUFBLE1BQ0osTUFBTSxFQUFFLEtBQUs7QUFBQSxNQUNiLE9BQU87QUFBQSxJQUNULElBQUksTUFBTSxjQUFjLEtBQUssUUFBUSxHQUFHO0FBRXhDLFFBQUksYUFBYSxDQUFDLE1BQU07QUFDdEIsYUFBTyxJQUFJO0FBQUEsUUFDVCxLQUFLLFVBQVUsRUFBRSxPQUFPLDJCQUEyQixDQUFDO0FBQUEsUUFDcEQsRUFBRSxRQUFRLElBQUk7QUFBQSxNQUNoQjtBQUFBLElBQ0Y7QUFHQSxVQUFNLEVBQUUsTUFBTSxTQUFTLE9BQU8sYUFBYSxJQUFJLE1BQU0sY0FDbEQsS0FBSyxVQUFVLEVBQ2YsT0FBTyxNQUFNLEVBQ2IsR0FBRyxNQUFNLEtBQUssRUFBRSxFQUNoQixPQUFPO0FBRVYsUUFBSSxnQkFBZ0IsU0FBUyxTQUFTLFNBQVM7QUFDN0MsYUFBTyxJQUFJO0FBQUEsUUFDVCxLQUFLLFVBQVUsRUFBRSxPQUFPLHdCQUF3QixDQUFDO0FBQUEsUUFDakQsRUFBRSxRQUFRLElBQUk7QUFBQSxNQUNoQjtBQUFBLElBQ0Y7QUFHQSxVQUFNLEVBQUUsT0FBTyxTQUFTLElBQUksTUFBTSxRQUFRLEtBQUs7QUFFL0MsUUFBSSxDQUFDLFNBQVMsQ0FBQyxVQUFVO0FBQ3ZCLGFBQU8sSUFBSTtBQUFBLFFBQ1QsS0FBSyxVQUFVLEVBQUUsT0FBTyxrQ0FBa0MsQ0FBQztBQUFBLFFBQzNELEVBQUUsUUFBUSxJQUFJO0FBQUEsTUFDaEI7QUFBQSxJQUNGO0FBR0EsVUFBTSxFQUFFLE1BQU0sU0FBUyxPQUFPLFlBQVksSUFDeEMsTUFBTSxjQUFjLEtBQUssTUFBTSxXQUFXO0FBQUEsTUFDeEM7QUFBQSxNQUNBO0FBQUEsTUFDQSxlQUFlO0FBQUEsSUFDakIsQ0FBQztBQUVILFFBQUksYUFBYTtBQUNmLGFBQU8sSUFBSTtBQUFBLFFBQ1QsS0FBSyxVQUFVLEVBQUUsT0FBTyxZQUFZLFFBQVEsQ0FBQztBQUFBLFFBQzdDLEVBQUUsUUFBUSxJQUFJO0FBQUEsTUFDaEI7QUFBQSxJQUNGO0FBR0EsV0FBTyxJQUFJO0FBQUEsTUFDVCxLQUFLLFVBQVUsRUFBRSxTQUFTLFFBQVEsS0FBSyxHQUFHLENBQUM7QUFBQSxNQUMzQyxFQUFFLFFBQVEsSUFBSTtBQUFBLElBQ2hCO0FBQUEsRUFFRixTQUFTLEtBQUs7QUFDWixZQUFRLE1BQU0sc0JBQXNCLEdBQUc7QUFDdkMsV0FBTyxJQUFJO0FBQUEsTUFDVCxLQUFLLFVBQVUsRUFBRSxPQUFPLHdCQUF3QixDQUFDO0FBQUEsTUFDakQsRUFBRSxRQUFRLElBQUk7QUFBQSxJQUNoQjtBQUFBLEVBQ0Y7QUFDRjsiLAogICJuYW1lcyI6IFtdCn0K
