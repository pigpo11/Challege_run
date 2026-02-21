const fs = require('fs');

async function checkProfiles() {
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

    console.log('--- Checking Global Group Members & Profiles ---');

    try {
        // This mimics what getAllGroupMembers does
        const res = await fetch(`${env.VITE_SUPABASE_URL}/rest/v1/group_members?select=group_id,profiles(nickname,profile_pic,status_message)`, { headers });
        const members = await res.json();

        console.log(`Found ${members.length} member mappings.`);

        const withPics = members.filter(m => m.profiles?.profile_pic);
        console.log(`Members with profile pictures: ${withPics.length}`);

        if (withPics.length > 0) {
            console.log('Sample data with picture:');
            console.log(JSON.stringify(withPics[0], null, 2));
        }

        const withStatus = members.filter(m => m.profiles?.status_message);
        console.log(`Members with status messages: ${withStatus.length}`);

    } catch (err) {
        console.error('Error:', err);
    }
}

checkProfiles();
