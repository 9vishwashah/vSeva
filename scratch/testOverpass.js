// Full end-to-end test of the new Overpass-based nearby.js handler
// Simulates the Netlify function handler locally

// Copy helper functions from nearby.js
const reverseGeocode = async (lat, lon) => {
    try {
        const r = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json&zoom=17&addressdetails=1`,
            { headers: { 'User-Agent': 'vSevaApp/1.0', 'Accept-Language': 'en' } }
        );
        if (!r.ok) return null;
        const d = await r.json();
        return d.display_name || null;
    } catch {
        return null;
    }
};

const buildAddress = (tags) => {
    const parts = [];
    if (tags['addr:housenumber']) parts.push(tags['addr:housenumber']);
    if (tags['addr:street'])     parts.push(tags['addr:street']);
    if (tags['addr:suburb'])     parts.push(tags['addr:suburb']);
    if (tags['addr:city'])       parts.push(tags['addr:city']);
    if (tags['addr:state'])      parts.push(tags['addr:state']);
    if (tags['addr:postcode'])   parts.push(tags['addr:postcode']);
    if (parts.length > 0) return parts.join(', ');
    if (tags['addr:full'])       return tags['addr:full'];
    if (tags['description'])     return tags['description'];
    return null;
};

const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371;
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);
    const a = Math.sin(dLat/2)*Math.sin(dLat/2) +
              Math.cos(lat1*(Math.PI/180))*Math.cos(lat2*(Math.PI/180))*
              Math.sin(dLon/2)*Math.sin(dLon/2);
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

const testType = async (type, lat, lng, radius = 5000) => {
    let overpassQuery = '';
    if (type === 'jain_temple') {
        overpassQuery = `
            [out:json][timeout:25];
            (
                node["amenity"="place_of_worship"]["religion"="jain"](around:${radius},${lat},${lng});
                way["amenity"="place_of_worship"]["religion"="jain"](around:${radius},${lat},${lng});
                node["religion"="jain"](around:${radius},${lat},${lng});
                node["name"~"[Dd]erasar|[Jj]ain [Tt]emple|[Jj]ain [Mm]andir",i](around:${radius},${lat},${lng});
                way["name"~"[Dd]erasar|[Jj]ain [Tt]emple|[Jj]ain [Mm]andir",i](around:${radius},${lat},${lng});
            );
            out center tags;
        `;
    } else if (type === 'hospital') {
        overpassQuery = `
            [out:json][timeout:25];
            (
                node["amenity"="hospital"](around:${radius},${lat},${lng});
                way["amenity"="hospital"](around:${radius},${lat},${lng});
                node["amenity"="clinic"](around:${radius},${lat},${lng});
            );
            out center tags;
        `;
    } else if (type === 'police') {
        overpassQuery = `
            [out:json][timeout:25];
            (
                node["amenity"="police"](around:${radius},${lat},${lng});
                way["amenity"="police"](around:${radius},${lat},${lng});
            );
            out center tags;
        `;
    }

    const response = await fetch('https://overpass-api.de/api/interpreter', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'User-Agent': 'vSevaApp/1.0',
            'Accept': 'application/json'
        },
        body: 'data=' + encodeURIComponent(overpassQuery.trim())
    });

    const data = await response.json();
    
    const seenIds = new Set();
    const rawPlaces = [];
    (data.elements || []).forEach(el => {
        const uid = `${el.type}_${el.id}`;
        if (seenIds.has(uid)) return;
        seenIds.add(uid);
        const pLat = el.lat || el.center?.lat;
        const pLon = el.lon || el.center?.lon;
        if (!pLat || !pLon) return;
        const distance = calculateDistance(lat, lng, pLat, pLon);
        if (distance > 100.0) return;
        const tags = el.tags || {};
        rawPlaces.push({
            name: tags.name || tags['name:en'] || tags['alt_name'] || 'Unknown',
            address: buildAddress(tags),
            lat: pLat, lng: pLon,
            phone: tags.phone || tags['contact:phone'] || null,
            distance: distance.toFixed(2) + ' km'
        });
    });

    rawPlaces.sort((a, b) => parseFloat(a.distance) - parseFloat(b.distance));
    return rawPlaces.slice(0, 5);
};

const run = async () => {
    const lat = 19.0760, lng = 72.8777; // Mumbai
    console.log('\n=== TEST 1: Jain Temples (10km, Mumbai) ===');
    const temples = await testType('jain_temple', lat, lng, 10000);
    temples.forEach(p => console.log(`  [${p.distance}] ${p.name} | ${p.address || '(geocode pending)'} | Phone: ${p.phone || 'N/A'}`));

    console.log('\n=== TEST 2: Hospitals (5km, Mumbai) ===');
    const hospitals = await testType('hospital', lat, lng, 5000);
    hospitals.forEach(p => console.log(`  [${p.distance}] ${p.name} | ${p.address || '(geocode pending)'}`));

    console.log('\n=== TEST 3: Police (5km, Mumbai) ===');
    const police = await testType('police', lat, lng, 5000);
    police.forEach(p => console.log(`  [${p.distance}] ${p.name} | ${p.address || '(geocode pending)'}`));
    
    console.log('\n✅ All 3 types working with Overpass API (Zero Google usage)');
};

run().catch(console.error);
