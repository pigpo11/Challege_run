const fs = require('fs');

async function debugData() {
    const envFile = fs.readFileSync('.env', 'utf8');
    const env = {};
    envFile.split('\n').forEach(line => {
        const [key, value] = line.split('=');
        if (key && value) env[key.trim()] = value.trim();
    });

    const supabaseUrl = env.VITE_SUPABASE_URL;
    const supabaseAnonKey = env.VITE_SUPABASE_ANON_KEY;

    const headers = {
        'apikey': supabaseAnonKey,
        'Authorization': `Bearer ${supabaseAnonKey}`,
        'Content-Type': 'application/json'
    };

    console.log('--- Scanning for large distances ---');
    try {
        // Search for missions with huge distance
        const mRes = await fetch(`${supabaseUrl}/rest/v1/missions?distance=gt.1000000&select=id,user_name,distance,created_at,profile_id`, { headers });
        const bigMissions = await mRes.json();
        console.log('Missions with distance > 1M:', bigMissions);

        console.log('\n--- Listing all UserNames from missions ---');
        const allMRes = await fetch(`${supabaseUrl}/rest/v1/missions?select=user_name`, { headers });
        const allNames = await allMRes.json();
        const uniqueNames = [...new Set(allNames.map(n => n.user_name))];
        console.log('Unique names in missions:', uniqueNames);

        console.log('\n--- Listing all current Profiles ---');
        const pRes = await fetch(`${supabaseUrl}/rest/v1/profiles?select=id,nickname`, { headers });
        const profiles = await pRes.json();
        console.log('Profiles in DB:', profiles);

    } catch (err) {
        console.error('Error:', err);
    }
}

debugData();
