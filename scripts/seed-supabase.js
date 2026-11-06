const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// Parse .env.local manually if exists
const envPath = path.join(__dirname, '..', '.env.local');
if (fs.existsSync(envPath)) {
  const lines = fs.readFileSync(envPath, 'utf8').split('\n');
  lines.forEach((line) => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const idx = trimmed.indexOf('=');
      if (idx !== -1) {
        const key = trimmed.slice(0, idx).trim();
        const val = trimmed.slice(idx + 1).trim();
        if (!process.env[key]) {
          process.env[key] = val;
        }
      }
    }
  });
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const teacherEmail = (process.env.DEFAULT_TEACHER_EMAIL || 'teacher@school.edu').toLowerCase();
const teacherPassword = process.env.DEFAULT_TEACHER_PASSWORD || 'teacher123';
const teacherName = process.env.DEFAULT_TEACHER_NAME || 'Ms. Harper';

console.log('\n--- SUPABASE TEACHER PROVISIONING & SETUP ---');

if (!supabaseUrl || !supabaseKey || supabaseUrl.includes('your-project') || supabaseUrl.includes('placeholder')) {
  console.log('ℹ️  Supabase environment variables not yet configured in .env.local.');
  console.log('   To connect to your cloud Supabase project:');
  console.log('   1. Open https://app.supabase.com and create a project.');
  console.log('   2. Run the SQL script in "supabase/schema.sql" via the Supabase SQL Editor.');
  console.log('   3. Add your NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY to .env.local.');
  console.log('   4. Run `node scripts/seed-supabase.js`.\n');
  process.exit(0);
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function seedTeacher() {
  try {
    console.log(`Connecting to Supabase at: ${supabaseUrl}`);

    // If using service role key, use admin API
    if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
      const { data: users, error: listErr } = await supabase.auth.admin.listUsers();
      if (listErr) throw listErr;

      const existing = users.users.find((u) => u.email?.toLowerCase() === teacherEmail);
      if (existing) {
        console.log(`Default teacher "${teacherEmail}" already exists in Supabase Auth.`);
      } else {
        const { data: newUser, error: createErr } = await supabase.auth.admin.createUser({
          email: teacherEmail,
          password: teacherPassword,
          email_confirm: true,
          user_metadata: {
            name: teacherName,
            role: 'teacher',
            avatar: '👩‍🏫',
          },
        });
        if (createErr) throw createErr;

        console.log(`Created teacher auth user: ${newUser.user.id}`);

        // Ensure profile entry
        await supabase.from('profiles').upsert({
          id: newUser.user.id,
          name: teacherName,
          email: teacherEmail,
          role: 'teacher',
          avatar: '👩‍🏫',
        });

        console.log(`Default teacher profile created for ${teacherName} (${teacherEmail}).`);
      }
    } else {
      // Fallback via signUp
      const { data, error } = await supabase.auth.signUp({
        email: teacherEmail,
        password: teacherPassword,
        options: {
          data: {
            name: teacherName,
            role: 'teacher',
            avatar: '👩‍🏫',
          },
        },
      });
      if (error && !error.message.includes('already registered')) {
        throw error;
      }
      console.log(`Teacher account registered/verified in Supabase.`);
    }

    console.log('\nSupabase Teacher Account Ready:');
    console.log(`   Email:    ${teacherEmail}`);
    console.log(`   Password: ${teacherPassword}`);
    console.log('   Note:     Zero dummy content created. Clean database ready for real classroom use!\n');
  } catch (err) {
    console.error('Error during Supabase provisioning:', err.message);
  }
}

seedTeacher();
