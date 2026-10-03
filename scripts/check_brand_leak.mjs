// Verifies a built brand contains no other brand's visible identity.
//   node scripts/check_brand_leak.mjs <dist-dir> <brand-id>
// For a non-vSeva build, every case-insensitive "vseva" / "vjas" occurrence in any
// text file (HTML, JS, CSS, JSON, XML, TXT) must be on the allow-list of internal,
// never-displayed identifiers below; anything else fails the check. Also fails if a
// vSeva-named file is shipped.

import fs from 'node:fs';
import path from 'node:path';

const [dir, brand] = process.argv.slice(2);
if (!dir || !brand) { console.error('usage: check_brand_leak.mjs <dist-dir> <brand-id>'); process.exit(2); }
if (brand === 'vseva') { console.log('vSeva build: nothing to check.'); process.exit(0); }

// Internal identifiers that are never shown to users. Changing them would sign
// existing vSeva users out of their saved preferences / break Sevak sign-in.
const ALLOWED = [
  /vseva_language/gi,               // localStorage key
  /vseva_sidebar_collapsed/gi,      // localStorage key
  /vseva_onboarding_done_/gi,       // localStorage key
  /@vsevak(\.in)?/gi,               // internal Sevak sign-in address suffix (never displayed)
  /@vjas\.in/gi,                    // internal: Forgot-password routes this domain to the Sevak flow
  /(["'`])vseva\1/gi,               // quoted brand id ("vseva") in code, never displayed
  /\bvseva:/gi,                     // brand-id key in a lookup table
];

// The deployment's own address is allowed to contain the platform's domain (e.g. ssg.vjas.in).
// Pass it the same way the build gets it: VITE_SITE_URL=https://ssg.vjas.in node scripts/check_brand_leak.mjs ...
const siteHost = (process.env.VITE_SITE_URL || '').replace(/^https?:\/\//, '').replace(/\/+$/, '');
if (siteHost) ALLOWED.push(new RegExp(siteHost.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi'));

const TEXT =/\.(html|js|mjs|css|json|xml|txt|webmanifest|svg|map)$/i;
const findings = [];
let scanned = 0;

(function walk(d) {
  for (const name of fs.readdirSync(d)) {
    const p = path.join(d, name);
    const st = fs.statSync(p);
    if (st.isDirectory()) { walk(p); continue; }
    const rel = path.relative(dir, p).split(path.sep).join('/');
    if (/vseva/i.test(name)) findings.push(`${rel}: file name`);
    if (!TEXT.test(name)) continue;
    scanned++;
    let text = fs.readFileSync(p, 'utf8');
    for (const a of ALLOWED) text = text.replace(a, '');
    const re = /.{0,40}(vseva|vjas).{0,40}/gi;
    let m;
    while ((m = re.exec(text))) findings.push(`${rel}: …${m[0].replace(/\s+/g, ' ')}…`);
  }
})(dir);

if (findings.length) {
  console.error(`\u2717 ${findings.length} leftover reference(s) in ${dir} (${scanned} text files scanned):`);
  for (const f of findings.slice(0, 60)) console.error('  ' + f);
  process.exit(1);
}
console.log(`\u2713 ${dir}: no vSeva/VJAS identity found in ${scanned} text files.`);
