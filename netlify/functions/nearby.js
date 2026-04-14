export const handler = async (event, context) => {
    try {
        const { lat, lng, type } = event.queryStringParameters;

        if (!lat || !lng || !type) {
            return {
                statusCode: 400,
                body: JSON.stringify({ error: 'Missing required parameters: lat, lng, type' }),
            };
        }

        const allowedTypes = ['hospital', 'police', 'jain_temple'];
        if (!allowedTypes.includes(type)) {
            return {
                statusCode: 400,
                body: JSON.stringify({ error: 'Invalid type parameter' }),
            };
        }

        const apiKey = process.env.GOOGLE_API_KEY;
        if (!apiKey) {
            return {
                statusCode: 500,
                body: JSON.stringify({ error: 'Server configuration error: GOOGLE_API_KEY is not set' }),
            };
        }

        // Gather headers to spoof referer if needed
        const referer = event.headers.referer || event.headers.origin || 'http://localhost:3000/';

        // We combine geographic search (searchNearby) with keyword search (searchText) for maximum accurate coverage
        const radius = Math.min(parseFloat(event.queryStringParameters.radius) || 100000.0, 50000.0);
        let fetchPromises = [];

        if (type === 'jain_temple') {
            // 1. searchNearby (Pure radius geographic search for strictly categorized Jain Temples)
            const nearbyBody = {
                includedTypes: ['jain_temple'],
                maxResultCount: 20,
                locationRestriction: {
                    circle: {
                        center: {
                            latitude: parseFloat(lat),
                            longitude: parseFloat(lng),
                        },
                        radius: radius,
                    },
                },
            };

            fetchPromises.push(fetch('https://places.googleapis.com/v1/places:searchNearby', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Goog-Api-Key': apiKey,
                    'X-Goog-FieldMask': 'places.displayName,places.formattedAddress,places.location,places.nationalPhoneNumber,places.internationalPhoneNumber,places.photos,places.iconMaskBaseUri',
                    'Referer': referer,
                },
                body: JSON.stringify(nearbyBody),
            }).then(async r => {
                const data = await r.json();
                if (!r.ok) console.error('API Error for searchNearby', data);
                return data;
            }));

            // 2. searchText (Broad keywords to catch miscategorized temples)
            const queries = ['Jain Temple', 'Derasar', 'Jain Tirth', 'Jain Mandir'];

            queries.forEach(query => {
                const tsBody = {
                    textQuery: query,
                    locationBias: {
                        circle: {
                            center: {
                                latitude: parseFloat(lat),
                                longitude: parseFloat(lng),
                            },
                            radius: radius,
                        },
                    },
                    pageSize: 20,
                };

                fetchPromises.push(fetch('https://places.googleapis.com/v1/places:searchText', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-Goog-Api-Key': apiKey,
                        'X-Goog-FieldMask': 'places.displayName,places.formattedAddress,places.location,places.nationalPhoneNumber,places.internationalPhoneNumber,places.photos,places.iconMaskBaseUri',
                        'Referer': referer,
                    },
                    body: JSON.stringify(tsBody),
                }).then(async r => {
                    const data = await r.json();
                    if (!r.ok) console.error('API Error for query', query, data);
                    return data;
                }));
            });
        } else {
            // Geographic search for hospital or police
            const nearbyBody = {
                includedTypes: [type],
                maxResultCount: 20,
                locationRestriction: {
                    circle: {
                        center: {
                            latitude: parseFloat(lat),
                            longitude: parseFloat(lng),
                        },
                        radius: 5000.0, // Limit radius for hospitals/police to 5km
                    },
                },
            };

            fetchPromises.push(fetch('https://places.googleapis.com/v1/places:searchNearby', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Goog-Api-Key': apiKey,
                    'X-Goog-FieldMask': 'places.displayName,places.formattedAddress,places.location,places.nationalPhoneNumber,places.internationalPhoneNumber,places.photos,places.iconMaskBaseUri',
                    'Referer': referer,
                },
                body: JSON.stringify(nearbyBody),
            }).then(async r => {
                const data = await r.json();
                if (!r.ok) console.error(`API Error for searchNearby (${type})`, data);
                return data;
            }));
        }

        const results = await Promise.all(fetchPromises);
        let allPlaces = [];
        const seen = new Set();

        for (const data of results) {
            if (data && data.places) {
                for (const place of data.places) {
                    // Unique duplication check based on exact coordinates or exact address
                    const id = `${place.location?.latitude || place.displayName?.text}_${place.location?.longitude || place.formattedAddress}`;
                    if (!seen.has(id)) {
                        seen.add(id);
                        allPlaces.push(place);
                    }
                }
            }
        }

        const places = allPlaces.map((place) => {
            let photoUrl = null;
            if (place.photos && place.photos.length > 0) {
                photoUrl = `https://places.googleapis.com/v1/${place.photos[0].name}/media?maxHeightPx=400&maxWidthPx=400&key=${apiKey}`;
            }

            return {
                name: place.displayName?.text || 'Unknown',
                address: place.formattedAddress || 'No address provided',
                lat: place.location?.latitude,
                lng: place.location?.longitude,
                phone: place.nationalPhoneNumber || place.internationalPhoneNumber || null,
                photo: photoUrl,
                icon: place.iconMaskBaseUri
            };
        }).slice(0, 60);

        return {
            statusCode: 200,
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ places }),
        };

    } catch (error) {
        console.error('Internal Server Error:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: 'Internal Server Error' }),
        };
    }
};
