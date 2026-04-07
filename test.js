import { handler } from './netlify/functions/nearby.js';

// mock event
const event = {
    queryStringParameters: {
        lat: '19.04',
        lng: '72.84',
        type: 'hospital'
    }
};

(async () => {
    try {
        const response = await handler(event, {});
        console.log(response);
    } catch (err) {
        console.error("Error running handler:", err);
    }
})();
