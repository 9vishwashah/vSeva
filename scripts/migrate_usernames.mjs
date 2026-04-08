import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load variables from .env.local
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");
  process.exit(1);
}

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function migrate() {
  const DRY_RUN = process.argv.includes('--execute') ? false : true;
  
  if (DRY_RUN) {
    console.log("--- DRY RUN MODE (No changes will be made) ---");
    console.log("To execute, run with --execute flag\n");
  } else {
    console.log("!!! EXECUTION MODE !!!\n");
  }

  // 1. Fetch all profiles ending with @vjas.in
  const { data: profiles, error: fetchError } = await supabaseAdmin
    .from('profiles')
    .select('id, username, full_name')
    .ilike('username', '%@vjas.in');

  if (fetchError) {
    console.error("Error fetching profiles:", fetchError);
    return;
  }

  console.log(`Found ${profiles.length} profiles to migrate.\n`);

  for (const profile of profiles) {
    const oldUsername = profile.username;
    const newUsername = oldUsername.replace('@vjas.in', '@vsevak');
    
    console.log(`Migrating [${profile.full_name}]: ${oldUsername} -> ${newUsername}`);
    
    if (!DRY_RUN) {
      try {
        // Step A: Update Auth User email
        const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(profile.id, {
          email: newUsername,
          email_confirm: true
        });

        if (authError) {
          console.error(`  - Auth Error for ${profile.id}:`, authError.message);
          continue;
        }

        // Step B: Update Profile username
        const { error: profileError } = await supabaseAdmin
          .from('profiles')
          .update({ username: newUsername })
          .eq('id', profile.id);

        if (profileError) {
          console.error(`  - Profile Error for ${profile.id}:`, profileError.message);
          continue;
        }

        console.log(`  - SUCCESS: Migrated ${profile.full_name}`);
      } catch (e) {
        console.error(`  - Unexpected Error for ${profile.id}:`, e);
      }
    }
  }

  console.log("\nMigration finished.");
}

migrate();
