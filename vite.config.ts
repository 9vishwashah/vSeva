import path from 'path';
import fs from 'fs';
import { parse as dotenvParse } from 'dotenv';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import { getMeta as getVsevaMeta } from './brands/vseva/meta';
import { getMeta as getSsgMeta } from './brands/ssg/meta';
import { renderHtml, prepareBrandPublicDir } from './brands/build';

const BRAND_META = { vseva: getVsevaMeta, ssg: getSsgMeta } as const;

export default defineConfig(({ mode }) => {
  const _env = loadEnv(mode, '.', '');

  // One build = one brand (white-label). VITE_BRAND picks brands/<id>/ — see brands/types.ts.
  const brandId = (_env.VITE_BRAND || 'vseva') as keyof typeof BRAND_META;
  if (!(brandId in BRAND_META)) {
    throw new Error(`Unknown VITE_BRAND "${_env.VITE_BRAND}". Expected one of: ${Object.keys(BRAND_META).join(', ')}`);
  }
  const brand = BRAND_META[brandId](_env);
  if (brand.id !== 'vseva' && !brand.siteUrl) {
    console.warn(`[brand:${brand.id}] VITE_SITE_URL is not set — canonical, og:image and sitemap are omitted. Set it in the site's environment.`);
  }

  // Brands never share a OneSignal app. A white-label build whose VITE_ONESIGNAL_APP_ID is missing, or is just
  // vSeva's id inherited from the shared .env file, gets push switched off instead of registering its users in
  // vSeva's app. Set the brand's own id in its site's environment (or .env.<brand>.local) to turn push on.
  const pushDefine: Record<string, string> = {};
  if (brand.id !== 'vseva') {
    const vsevaFileId = (() => {
      try { return dotenvParse(fs.readFileSync(path.resolve(__dirname, '.env'))).VITE_ONESIGNAL_APP_ID || ''; } catch { return ''; }
    })();
    const id = _env.VITE_ONESIGNAL_APP_ID || '';
    if (!id || id === vsevaFileId) {
      console.warn(`[brand:${brand.id}] No own VITE_ONESIGNAL_APP_ID: push notifications are OFF in this build.`);
      pushDefine['import.meta.env.VITE_ONESIGNAL_APP_ID'] = JSON.stringify('');
    }
  }

  return {
    define: pushDefine,
    publicDir: prepareBrandPublicDir(__dirname, brand),
    server: {
      port: 3000,
      host: '0.0.0.0',
      proxy: {
        '/.netlify/functions': {
          target: 'http://localhost:9999',
          changeOrigin: true,
          secure: false,
        },
      },
    },
    build: {
      rollupOptions: {
        output: {
          manualChunks: {
            'vendor-react': ['react', 'react-dom'],
            'vendor-pdf': ['jspdf', 'jspdf-autotable'],
            'vendor-excel': ['xlsx'],
          },
        },
      },
      // Raise warning threshold slightly for chunked builds
      chunkSizeWarningLimit: 600,
    },
    plugins: [
      {
        name: 'local-api-mock',
        configureServer(server) {
          server.middlewares.use(async (req, res, next) => {
            // Authenticated Super Admin functions (see netlify/functions/_shared/adminAuth.js)
            const authedFn = req.url && /^\/\.netlify\/functions\/(super-admin|approve-org|get-org-admins|sevak-login-lookup|update-user-phone)(\?|$)/.exec(req.url);
            if (authedFn) {
              try {
                const { handler } = await import(`./netlify/functions/${authedFn[1]}.js`);

                let body = '';
                req.on('data', chunk => { body += chunk.toString(); });
                await new Promise(resolve => req.on('end', resolve));

                process.env.SUPABASE_URL = _env.VITE_SUPABASE_URL || '';
                process.env.SUPABASE_SERVICE_ROLE_KEY = _env.SUPABASE_SERVICE_ROLE_KEY || '';
                for (const k of Object.keys(_env)) {
                  if (k === 'SUPER_ADMIN_EMAILS' || k.startsWith('BRAND_ADMIN_EMAILS_')) process.env[k] = _env[k];
                }

                const result = await handler({ httpMethod: req.method, body, headers: req.headers }, {});

                res.statusCode = result.statusCode || 200;
                res.setHeader('Content-Type', 'application/json');
                res.end(result.body);
              } catch (e: any) {
                console.error(`Local mock error ${authedFn[1]}:`, e);
                res.statusCode = 500;
                res.end(JSON.stringify({ error: e.message || 'Internal error in mock' }));
              }
              return;
            }
            if (req.url && req.url.startsWith('/.netlify/functions/nearby')) {
              try {
                const { handler } = await import('./netlify/functions/nearby.js');
                
                // Parse URL to extract queryStringParameters
                const url = new URL(req.url, `http://${req.headers.host}`);
                const queryStringParameters = Object.fromEntries(url.searchParams.entries());
                
                // Inject process.env securely
                process.env.GOOGLE_API_KEY = _env.VITE_GOOGLE_API_KEY || _env.GOOGLE_API_KEY || '';

                const event = {
                  queryStringParameters,
                  headers: req.headers,
                };

                const result = await handler(event, {});
                
                res.statusCode = result.statusCode || 200;
                res.setHeader('Content-Type', 'application/json');
                res.end(result.body);
              } catch (e: any) {
                console.error("Local mock error:", e);
                res.statusCode = 500;
                res.end(JSON.stringify({ error: e.message || 'Internal error in mock' }));
              }
              return;
            } else if (req.url && req.url.startsWith('/.netlify/functions/get-sevak-names')) {
              try {
                const { handler } = await import('./netlify/functions/get-sevak-names.js');
                
                let body = '';
                req.on('data', chunk => { body += chunk.toString(); });
                await new Promise(resolve => req.on('end', resolve));

                process.env.SUPABASE_URL = _env.VITE_SUPABASE_URL || '';
                process.env.SUPABASE_SERVICE_ROLE_KEY = _env.SUPABASE_SERVICE_ROLE_KEY || _env.VITE_SUPABASE_ANON_KEY || '';

                const event = {
                  httpMethod: req.method,
                  body,
                  headers: req.headers,
                };

                const result = await handler(event, {});
                
                res.statusCode = result.statusCode || 200;
                res.setHeader('Content-Type', 'application/json');
                res.end(result.body);
              } catch (e: any) {
                console.error("Local mock error names:", e);
                res.statusCode = 500;
                res.end(JSON.stringify({ error: e.message || 'Internal error in mock' }));
              }
              return;
            } else if (req.url && req.url.startsWith('/.netlify/functions/get-dashboard-stats')) {
              try {
                const { handler } = await import('./netlify/functions/get-dashboard-stats.js');
                
                let body = '';
                req.on('data', chunk => { body += chunk.toString(); });
                await new Promise(resolve => req.on('end', resolve));

                process.env.SUPABASE_URL = _env.VITE_SUPABASE_URL || '';
                process.env.SUPABASE_SERVICE_ROLE_KEY = _env.SUPABASE_SERVICE_ROLE_KEY || _env.VITE_SUPABASE_ANON_KEY || '';

                const event = {
                  httpMethod: req.method,
                  body,
                  headers: req.headers,
                };

                const result = await handler(event, {});
                
                res.statusCode = result.statusCode || 200;
                res.setHeader('Content-Type', 'application/json');
                res.end(result.body);
              } catch (e: any) {
                console.error("Local mock error stats:", e);
                res.statusCode = 500;
                res.end(JSON.stringify({ error: e.message || 'Internal error in mock' }));
              }
              return;
            } else if (req.url && req.url.startsWith('/.netlify/functions/get-org-admins')) {
              try {
                const { handler } = await import('./netlify/functions/get-org-admins.js');
                
                let body = '';
                req.on('data', chunk => { body += chunk.toString(); });
                await new Promise(resolve => req.on('end', resolve));

                process.env.SUPABASE_URL = _env.VITE_SUPABASE_URL || '';
                process.env.SUPABASE_SERVICE_ROLE_KEY = _env.SUPABASE_SERVICE_ROLE_KEY || _env.VITE_SUPABASE_ANON_KEY || '';

                const event = {
                  httpMethod: req.method,
                  body,
                  headers: req.headers,
                };

                const result = await handler(event, {});
                
                res.statusCode = result.statusCode || 200;
                res.setHeader('Content-Type', 'application/json');
                res.end(result.body);
              } catch (e: any) {
                console.error("Local mock error get-org-admins:", e);
                res.statusCode = 500;
                res.end(JSON.stringify({ error: e.message || 'Internal error in mock' }));
              }
              return;
            } else if (req.url && req.url.startsWith('/.netlify/functions/get-org-sevak-contacts')) {
              try {
                const { handler } = await import('./netlify/functions/get-org-sevak-contacts.js');

                let body = '';
                req.on('data', chunk => { body += chunk.toString(); });
                await new Promise(resolve => req.on('end', resolve));

                process.env.SUPABASE_URL = _env.VITE_SUPABASE_URL || '';
                process.env.SUPABASE_SERVICE_ROLE_KEY = _env.SUPABASE_SERVICE_ROLE_KEY || _env.VITE_SUPABASE_ANON_KEY || '';

                const event = {
                  httpMethod: req.method,
                  body,
                  headers: req.headers,
                };

                const result = await handler(event, {});

                res.statusCode = result.statusCode || 200;
                res.setHeader('Content-Type', 'application/json');
                res.end(result.body);
              } catch (e: any) {
                console.error("Local mock error get-org-sevak-contacts:", e);
                res.statusCode = 500;
                res.end(JSON.stringify({ error: e.message || 'Internal error in mock' }));
              }
              return;
            } else if (req.url && req.url.startsWith('/.netlify/functions/get-sevak-avatars')) {
              try {
                const { handler } = await import('./netlify/functions/get-sevak-avatars.js');

                let body = '';
                req.on('data', chunk => { body += chunk.toString(); });
                await new Promise(resolve => req.on('end', resolve));

                process.env.SUPABASE_URL = _env.VITE_SUPABASE_URL || '';
                process.env.SUPABASE_SERVICE_ROLE_KEY = _env.SUPABASE_SERVICE_ROLE_KEY || _env.VITE_SUPABASE_ANON_KEY || '';

                const event = {
                  httpMethod: req.method,
                  body,
                  headers: req.headers,
                };

                const result = await handler(event, {});

                res.statusCode = result.statusCode || 200;
                res.setHeader('Content-Type', 'application/json');
                res.end(result.body);
              } catch (e: any) {
                console.error("Local mock error get-sevak-avatars:", e);
                res.statusCode = 500;
                res.end(JSON.stringify({ error: e.message || 'Internal error in mock' }));
              }
              return;
            } else if (req.url && req.url.startsWith('/.netlify/functions/create-user')) {
              try {
                const { handler } = await import('./netlify/functions/create-user.js');

                let body = '';
                req.on('data', chunk => { body += chunk.toString(); });
                await new Promise(resolve => req.on('end', resolve));

                process.env.SUPABASE_URL = _env.VITE_SUPABASE_URL || '';
                process.env.SUPABASE_SERVICE_ROLE_KEY = _env.SUPABASE_SERVICE_ROLE_KEY || _env.VITE_SUPABASE_ANON_KEY || '';

                const event = {
                  httpMethod: req.method,
                  body,
                  headers: req.headers,
                };

                const result = await handler(event, {});

                res.statusCode = result.statusCode || 200;
                res.setHeader('Content-Type', 'application/json');
                res.end(result.body);
              } catch (e: any) {
                console.error("Local mock error create-user:", e);
                res.statusCode = 500;
                res.end(JSON.stringify({ error: e.message || 'Internal error in mock' }));
              }
              return;
            } else if (req.url && req.url.startsWith('/.netlify/functions/update-org-leadership')) {
              try {
                const { handler } = await import('./netlify/functions/update-org-leadership.js');

                let body = '';
                req.on('data', chunk => { body += chunk.toString(); });
                await new Promise(resolve => req.on('end', resolve));

                process.env.SUPABASE_URL = _env.VITE_SUPABASE_URL || '';
                process.env.SUPABASE_SERVICE_ROLE_KEY = _env.SUPABASE_SERVICE_ROLE_KEY || _env.VITE_SUPABASE_ANON_KEY || '';

                const event = {
                  httpMethod: req.method,
                  body,
                  headers: req.headers,
                };

                const result = await handler(event, {});

                res.statusCode = result.statusCode || 200;
                res.setHeader('Content-Type', 'application/json');
                res.end(result.body);
              } catch (e: any) {
                console.error("Local mock error update-org-leadership:", e);
                res.statusCode = 500;
                res.end(JSON.stringify({ error: e.message || 'Internal error in mock' }));
              }
              return;
            } else if (req.url && req.url.startsWith('/.netlify/functions/check-inactivity')) {
              try {
                const { handler } = await import('./netlify/functions/check-inactivity.js');

                let body = '';
                req.on('data', chunk => { body += chunk.toString(); });
                await new Promise(resolve => req.on('end', resolve));

                process.env.SUPABASE_URL = _env.VITE_SUPABASE_URL || '';
                process.env.SUPABASE_SERVICE_ROLE_KEY = _env.SUPABASE_SERVICE_ROLE_KEY || _env.VITE_SUPABASE_ANON_KEY || '';

                const event = {
                  httpMethod: req.method,
                  body,
                  headers: req.headers,
                };

                const result = await handler(event, {});

                res.statusCode = result.statusCode || 200;
                res.setHeader('Content-Type', 'application/json');
                res.end(result.body);
              } catch (e: any) {
                console.error("Local mock error check-inactivity:", e);
                res.statusCode = 500;
                res.end(JSON.stringify({ error: e.message || 'Internal error in mock' }));
              }
              return;
            } else if (req.url && req.url.startsWith('/.netlify/functions/resolve-location')) {
              try {
                const { handler } = await import('./netlify/functions/resolve-location.js');

                let body = '';
                req.on('data', chunk => { body += chunk.toString(); });
                await new Promise(resolve => req.on('end', resolve));

                const event = {
                  httpMethod: req.method,
                  body,
                  headers: req.headers,
                };

                const result = await handler(event, {});

                res.statusCode = result.statusCode || 200;
                res.setHeader('Content-Type', 'application/json');
                res.end(result.body);
              } catch (e: any) {
                console.error("Local mock error resolve-location:", e);
                res.statusCode = 500;
                res.end(JSON.stringify({ error: e.message || 'Internal error in mock' }));
              }
              return;
            } else if (req.url && req.url.startsWith('/.netlify/functions/directory-sitemap')) {
              try {
                const { handler } = await import('./netlify/functions/directory-sitemap.js');

                process.env.SUPABASE_URL = _env.VITE_SUPABASE_URL || '';
                process.env.VITE_SUPABASE_ANON_KEY = _env.VITE_SUPABASE_ANON_KEY || '';

                const result = await handler();

                res.statusCode = result.statusCode || 200;
                res.setHeader('Content-Type', 'application/xml');
                res.end(result.body);
              } catch (e: any) {
                console.error("Local mock error directory-sitemap:", e);
                res.statusCode = 500;
                res.end(JSON.stringify({ error: e.message || 'Internal error in mock' }));
              }
              return;
            }
            next();
          });
        }
      },
      {
        name: 'brand-html',
        transformIndexHtml: { order: 'pre', handler: (html: string) => renderHtml(html, brand) },
      },
      react(),
      VitePWA({
        strategies: 'injectManifest',
        srcDir: '.',
        filename: 'sw.js',
        registerType: 'autoUpdate',
        injectManifest: {
          maximumFileSizeToCacheInBytes: 5 * 1024 * 1024, // 5MB
        },
        devOptions: {
          enabled: false,
          type: 'module',
        },
        includeAssets: brand.includeAssets,
        manifest: {
          name: brand.id === 'vseva' ? 'vSeva - Vihar Tracking SaaS' : brand.name,
          short_name: brand.shortName,
          description: brand.id === 'vseva' ? 'Vihar Tracking and Management System' : brand.description,
          theme_color: brand.themeColor,
          background_color: brand.backgroundColor,
          display: 'standalone',
          start_url: '/',
          icons: [
            {
              src: '/pwa-192x192.png',
              sizes: '192x192',
              type: 'image/png',
              purpose: 'any',
            },
            {
              src: '/pwa-512x512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'any',
            },
            {
              src: '/pwa-512x512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'maskable',
            },
          ],
        },
      }),
    ],
    resolve: {
      alias: [
        // Per-brand module (BRAND config, Landing page) — see brands/types.ts
        { find: /^@brand$/, replacement: path.resolve(__dirname, 'brands', brandId, 'index.ts') },
        { find: /^@brand\//, replacement: path.resolve(__dirname, 'brands', brandId) + '/' },
        { find: '@', replacement: path.resolve(__dirname, '.') },
      ],
    },
  };
});
