const ONESIGNAL_APP_ID = "1a762910-6d99-4e9d-bca2-091962972ff1";
const ONESIGNAL_REST_API_KEY = "os_v2_app_dj3csedntfhj3pfcbemwffzp6e7ui5hfuxwus24sqmmdhpye42dp5zh6ay2xuuwev6ncbrrdmnzsrmfeyixrkceggqjakewdlok62jq";

async function testPush() {
    console.log("Testing OneSignal Push (Global Fetch)...");
    
    try {
        const response = await fetch('https://onesignal.com/api/v1/notifications', {
            method: 'POST',
            headers: {
                'Authorization': `Basic ${ONESIGNAL_REST_API_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                app_id: ONESIGNAL_APP_ID,
                included_segments: ["Total Subscriptions"],
                headings: { en: "Test from AI" },
                contents: { en: "Jai Jinendra! This is a test push from the system." },
                url: "https://vseva.netlify.app"
            })
        });

        const result = await response.json();
        console.log('Status:', response.status);
        console.log('Result:', JSON.stringify(result, null, 2));
    } catch (err) {
        console.error('Error:', err);
    }
}

testPush();
