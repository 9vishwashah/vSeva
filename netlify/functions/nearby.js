export const handler = async (event, context) => {
    try {
        const { lat, lng, type } = event.queryStringParameters;

        if (!lat || !lng || !type) {
            return {
                statusCode: 400,
                body: JSON.stringify({ error: 'Missing required parameters: lat, lng, type' }),
            };
        }

        const allowedTypes = ['hospital', 'police'];
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

        // Call Google Places API (New)
        const response = await fetch('https://places.googleapis.com/v1/places:searchNearby', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Goog-Api-Key': apiKey,
                'X-Goog-FieldMask': 'places.displayName,places.formattedAddress,places.location,places.nationalPhoneNumber,places.internationalPhoneNumber',
                'Referer': referer, // Essential for API keys with HTTP Referer restrictions
            },
            body: JSON.stringify({
                includedTypes: [type],
                maxResultCount: 5,
                locationRestriction: {
                    circle: {
                        center: {
                            latitude: parseFloat(lat),
                            longitude: parseFloat(lng),
                        },
                        radius: 5000.0, // 5km radius
                    },
                },
            }),
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
        const places = (data.places || []).map((place) => ({
            name: place.displayName?.text || 'Unknown',
            address: place.formattedAddress || 'No address provided',
            lat: place.location?.latitude,
            lng: place.location?.longitude,
            phone: place.nationalPhoneNumber || place.internationalPhoneNumber || null,
        }));

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
