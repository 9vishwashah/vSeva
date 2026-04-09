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

        let apiUrl = 'https://places.googleapis.com/v1/places:searchNearby';
        let body = {
            includedTypes: [type],
            maxResultCount: 8,
            locationRestriction: {
                circle: {
                    center: {
                        latitude: parseFloat(lat),
                        longitude: parseFloat(lng),
                    },
                    radius: 5000.0, // 5km radius
                },
            },
        };

        // If Jain Temple, use Text Search to be more specific
        if (type === 'jain_temple') {
            apiUrl = 'https://places.googleapis.com/v1/places:searchText';
            body = {
                textQuery: 'Jain Temple Derasar',
                locationBias: {
                    circle: {
                        center: {
                            latitude: parseFloat(lat),
                            longitude: parseFloat(lng),
                        },
                        radius: 10000.0, // 10km radius for temples
                    },
                },
                maxResultCount: 10,
            };
        }

        // Call Google Places API (New)
        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Goog-Api-Key': apiKey,
                'X-Goog-FieldMask': 'places.displayName,places.formattedAddress,places.location,places.nationalPhoneNumber,places.internationalPhoneNumber,places.photos,places.iconMaskBaseUri',
                'Referer': referer,
            },
            body: JSON.stringify(body),
        });

        if (!response.ok) {
            const errBody = await response.text();
            console.error('Google Places API Error:', response.status, errBody);
            return {
                statusCode: response.status,
                body: JSON.stringify({ error: 'Failed to fetch nearby places from Google API', details: errBody }),
            };
        }

        const data = await response.json();

        // Extract and clean the relevant data
        const places = (data.places || []).map((place) => {
            // Construct photo URL if available
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
        });

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
