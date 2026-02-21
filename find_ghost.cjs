const fs = require('fs');

async function findGhostData() {
    const envFile = fs.readFileSync('.env', 'utf8');
    const env = {};
    envFile.split('\n').forEach(line => {
        const [key, value] = line.split('=');
        if (key && value) env[key.trim()] = value.trim();
    });

    const headers = {
        'apikey': env.VITE_SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${env.VITE_SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json'
    };

    console.log('Searching for orphan profile IDs in other tables...');

    try {
        // 1. Get all profiles
        const pRes = await fetch(`${env.VITE_SUPABASE_URL}/rest/v1/profiles?select=id`, { headers });
        const existingIds = (await pRes.json()).map(p => p.id);

        // 2. Get all missions and their profile_ids
        const mRes = await fetch(`${env.VITE_SUPABASE_URL}/rest/v1/missions?select=profile_id,user_name`, { headers });
        const allMissions = await mRes.json();

        const ghosts = allMissions.filter(m => !existingIds.includes(m.profile_id));

        if (ghosts.length > 0) {
            console.log('Found "Ghost" records representing deleted users:');
            console.log(JSON.stringify(ghosts, null, 2));
        } else {
            console.log('No orphan records found in missions.');
        }

        // 3. Check group_members too
        const gmRes = await fetch(`${env.VITE_SUPABASE_URL}/rest/v1/group_members?select=profile_id`, { headers });
        const allGMs = await gmRes.json();
        const gmGhosts = allGMs.filter(gm => !existingIds.includes(gm.profile_id));

        if (gmGhosts.length > 0) {
            console.log('Found orphan IDs in group_members:', gmGhosts);
        }

    } catch (err) {
        console.error('Error:', err);
    }
}

findGhostData();
