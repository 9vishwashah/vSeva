// Resolves a Google Maps link (any of the common share-link shapes) into
// { latitude, longitude, formatted_address, pincode, area, city, state }.
// No Google API key needed anywhere in here — coordinates come straight out
// of the URL (or a followed redirect/scanned body for short links). Address
// breakdown then comes from Nominatim (OpenStreetMap) REVERSE geocoding
// (coordinate -> address), which is reliable precisely because we already
// trust the coordinate going in.
//
// Deliberately NOT falling back to a Nominatim TEXT search (name -> coordinate)
// when direct extraction fails: Google's and OpenStreetMap's place databases
// are separately maintained, and a real, well-reviewed Google place can
// simply not exist in OSM at all (confirmed for a real submission — search
// for the exact temple name returned zero results). A text-search fallback
// would then either return nothing or confidently return the WRONG nearby
// place, indistinguishable from a correct result to the contributor. Better
// to honestly report "couldn't detect" (the UI already handles that — see
// DirectoryListingForm's resolveFailed state) than to silently place a pin
// that looks right but isn't. Never calls any of this on every directory
// page load: the caller (the submission form) resolves once and the result
// is stored.

const NOMINATIM_HEADERS = {
    // Nominatim's usage policy requires a real identifying User-Agent for
    // server-side callers (a browser's own Referer isn't sent here).
    'User-Agent': 'vSeva-Directory/1.0 (https://vseva.vjas.in)',
    'Accept-Language': 'en',
};

const COORD_PATTERNS = [
    /@(-?\d{1,3}\.\d+),(-?\d{1,3}\.\d+)/,       // .../@19.033,73.017,15z
    /!3d(-?\d{1,3}\.\d+)!4d(-?\d{1,3}\.\d+)/,    // ...!3d19.033!4d73.017 (place data blob)
    /[?&]q=(-?\d{1,3}\.\d+),(-?\d{1,3}\.\d+)/,   // ...?q=19.033,73.017
    /[?&]ll=(-?\d{1,3}\.\d+),(-?\d{1,3}\.\d+)/,  // ...?ll=19.033,73.017
];

function extractCoords(url) {
    for (const pattern of COORD_PATTERNS) {
        const m = url.match(pattern);
        if (m) {
            const latitude = parseFloat(m[1]);
            const longitude = parseFloat(m[2]);
            if (!Number.isNaN(latitude) && !Number.isNaN(longitude)) {
                return { latitude, longitude };
            }
        }
    }
    return null;
}

async function followRedirectAndFetchBody(url) {
    try {
        const res = await fetch(url, { method: 'GET', redirect: 'follow' });
        const finalUrl = res.url || url;
        const body = await res.text();
        return { finalUrl, body };
    } catch {
        return { finalUrl: url, body: '' };
    }
}

async function nominatimReverse(latitude, longitude) {
    try {
        const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${latitude}&lon=${longitude}&addressdetails=1`,
            { headers: NOMINATIM_HEADERS }
        );
        if (!res.ok) return null;
        const data = await res.json();
        if (!data?.address) return null;
        return addressFromNominatim(data);
    } catch (err) {
        console.error('resolve-location: nominatim reverse geocode failed', err);
        return null;
    }
}

function addressFromNominatim(result) {
    const a = result.address || {};
    return {
        formatted_address: result.display_name,
        pincode: a.postcode,
        area: a.suburb || a.neighbourhood || a.city_district,
        city: a.city || a.town || a.village || a.municipality,
        state: a.state,
    };
}

import { withCors } from './_shared/cors.js';

const rawHandler = async (event) => {
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) };
    }

    let url;
    try {
        ({ url } = JSON.parse(event.body || '{}'));
    } catch {
        return { statusCode: 400, body: JSON.stringify({ error: 'Invalid JSON body' }) };
    }

    if (!url || typeof url !== 'string') {
        return { statusCode: 400, body: JSON.stringify({ error: 'Missing required field: url' }) };
    }

    try {
        let workingUrl = url.trim();
        let coords = extractCoords(workingUrl);
        let pageBody = '';

        // Shortened share links (maps.app.goo.gl, goo.gl/maps, g.co/...) carry no
        // coordinates until followed to their real destination — and Google
        // sometimes serves an app-deep-link interstitial rather than a clean
        // HTTP redirect, where the FINAL URL still doesn't show @lat,lng even
        // though the coordinate is embedded in that page's own HTML/JS. So
        // this checks the resolved URL first, then the actual page body, for
        // the same patterns.
        if (!coords && /goo\.gl|g\.co/i.test(workingUrl)) {
            const { finalUrl, body } = await followRedirectAndFetchBody(workingUrl);
            workingUrl = finalUrl;
            pageBody = body;
            coords = extractCoords(workingUrl) || extractCoords(pageBody);
        }

        if (!coords) {
            // No name-search fallback here on purpose — see the file header.
            return {
                statusCode: 200,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ resolved: false }),
            };
        }

        const address = await nominatimReverse(coords.latitude, coords.longitude);

        return {
            statusCode: 200,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                resolved: true,
                latitude: coords.latitude,
                longitude: coords.longitude,
                formatted_address: address?.formatted_address,
                pincode: address?.pincode,
                area: address?.area,
                city: address?.city,
                state: address?.state,
            }),
        };
    } catch (error) {
        console.error('resolve-location: Internal Server Error', error);
        return { statusCode: 500, body: JSON.stringify({ error: 'Internal Server Error' }) };
    }
};

export const handler = withCors(rawHandler);
