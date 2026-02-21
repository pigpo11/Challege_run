import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function findUser() {
    console.log('Searching for traces of user "ㅎㅇ"...');

    // 1. Search in missions (even if profile is gone, mission might remains)
    const { data: missions, error: mError } = await supabase
        .from('missions')
        .select('*')
        .ilike('user_name', '%ㅎㅇ%');

    if (missions && missions.length > 0) {
        console.log('Found missions for this user:');
        console.log(JSON.stringify(missions, null, 2));
    } else {
        console.log('No missions found for "ㅎㅇ".');
    }

    // 2. Search in comments
    const { data: comments, error: cError } = await supabase
        .from('comments')
        .select('*')
        .ilike('user_name', '%ㅎㅇ%');

    if (comments && comments.length > 0) {
        console.log('Found comments by this user:');
        console.log(JSON.stringify(comments, null, 2));
    }

    // 3. Just list all profiles to see what's left
    const { data: profiles } = await supabase
        .from('profiles')
        .select('id, nickname');

    console.log('Current profiles in DB:', profiles);
}

findUser();
