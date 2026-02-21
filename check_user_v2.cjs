const fs = require('fs');

async function findUser() {
    // 1. Read .env file manually
    const envFile = fs.readFileSync('.env', 'utf8');
    const env = {};
    envFile.split('\n').forEach(line => {
        const [key, value] = line.split('=');
        if (key && value) env[key.trim()] = value.trim();
    });

    const supabaseUrl = env.VITE_SUPABASE_URL;
    const supabaseAnonKey = env.VITE_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
        console.error('Missing env vars');
        return;
    }

    console.log('Searching for traces of user "ㅎㅇ" via REST API...');

    const headers = {
        'apikey': supabaseAnonKey,
        'Authorization': `Bearer ${supabaseAnonKey}`,
        'Content-Type': 'application/json'
    };

    try {
        // 1. Search in missions
        const mRes = await fetch(`${supabaseUrl}/rest/v1/missions?user_name=ilike.*ㅎㅇ*`, { headers });
        const missions = await mRes.json();

        if (missions && missions.length > 0) {
            console.log('--- FOUND MISSIONS ---');
            console.log(JSON.stringify(missions, null, 2));
        } else {
            console.log('No missions found.');
        }

        // 2. Search in comments
        const cRes = await fetch(`${supabaseUrl}/rest/v1/comments?user_name=ilike.*ㅎㅇ*`, { headers });
        const comments = await cRes.json();

        if (comments && comments.length > 0) {
            console.log('--- FOUND COMMENTS ---');
            console.log(JSON.stringify(comments, null, 2));
        }

        // 3. Search in profiles just in case it wasn't deleted
        const pRes = await fetch(`${supabaseUrl}/rest/v1/profiles?nickname=ilike.*ㅎㅇ*`, { headers });
        const profiles = await pRes.json();

        if (profiles && profiles.length > 0) {
            console.log('--- FOUND PROFILES ---');
            console.log(JSON.stringify(profiles, null, 2));
        }

    } catch (err) {
        console.error('Error fetching data:', err);
    }
}

findUser();
