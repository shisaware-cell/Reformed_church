const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://lfpyaefmeynyixdcnkxu.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxmcHlhZWZtZXlueWl4ZGNua3h1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MzUwNDM0NCwiZXhwIjoyMDg5MDgwMzQ0fQ.dbEk54dmOOlIisZiGjbAD0m9pkcx41NBGbqKZwyrKzc';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

const testUsers = [
  {
    email: 'sarah.johnson@church.com',
    password: 'Sarah123!@#',
    name: 'Sarah Johnson',
    profile_image: 'https://i.pravatar.cc/150?img=12&u=sarah',
  },
  {
    email: 'michael.williams@church.com',
    password: 'Michael123!@#',
    name: 'Michael Williams',
    profile_image: 'https://i.pravatar.cc/150?img=24&u=michael',
  },
  {
    email: 'elizabeth.martinez@church.com',
    password: 'Elizabeth123!@#',
    name: 'Elizabeth Martinez',
    profile_image: 'https://i.pravatar.cc/150?img=32&u=elizabeth',
  },
];

async function seedData() {
  try {
    // Create auth users
    console.log('🔐 Creating auth users...\n');
    const createdUsers = [];

    for (const user of testUsers) {
      const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
        email: user.email,
        password: user.password,
        email_confirm: true,
      });

      if (authError) {
        console.error(`❌ Error creating auth user ${user.email}:`, authError.message);
      } else {
        createdUsers.push(authUser.user);
        console.log(`✅ Created auth user: ${user.email}`);
      }
    }

    console.log(`\n👤 Creating user profiles...\n`);

    // Create user profiles
    const profileData = createdUsers.map((authUser, idx) => ({
      id: authUser.id,
      email: authUser.email,
      name: testUsers[idx].name,
      profile_image_url: testUsers[idx].profile_image,
      role: 'user',
    }));

    const { data: profiles, error: profileError } = await supabase
      .from('users')
      .insert(profileData)
      .select();

    if (profileError) {
      console.error('❌ Error creating profiles:', profileError.message);
    } else {
      console.log(`✅ Created ${profiles?.length || 0} user profiles:`);
      profiles?.forEach(p => console.log(`   - ${p.name} (${p.email})`));
    }

    console.log(`\n📝 Creating posts...\n`);

    // Create posts
    const postsData = [
      {
        user_id: createdUsers[0].id,
        content:
          'What a blessing to worship with our congregation this Sunday! The sermon on faith and trust really touched my heart. So grateful for our church family and the spiritual growth we experience together. 🙏✨',
        image_url:
          'https://images.unsplash.com/photo-1495521821757-a1efb6729352?w=500&h=400&fit=crop',
        likes_count: 5,
      },
      {
        user_id: createdUsers[1].id,
        content:
          'Just finished volunteering at the community outreach program! Helped prepare meals for families in need. This is what Jesus taught us - to serve others with love and humility. Feeling truly blessed today! ❤️',
        image_url:
          'https://images.unsplash.com/photo-1469571486292-0ba58a3f068b?w=500&h=400&fit=crop',
        likes_count: 12,
      },
      {
        user_id: createdUsers[2].id,
        content:
          'Prayer circle this Wednesday evening was so uplifting. Being surrounded by believers who lift each other up in prayer is truly powerful. If anyone wants to join us, we meet in the fellowship hall at 7 PM. All are welcome! 🕯️🙏',
        image_url:
          'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=500&h=400&fit=crop',
        likes_count: 8,
      },
    ];

    const { data: posts, error: postError } = await supabase
      .from('posts')
      .insert(postsData)
      .select();

    if (postError) {
      console.error('❌ Error creating posts:', postError.message);
    } else {
      console.log(`✅ Created ${posts?.length || 0} posts:`);
      posts?.forEach((p, idx) => {
        console.log(`   - "${p.content.substring(0, 45)}..."`);
      });
    }

    console.log('\n✨ Seeding complete! Ready to test in Expo.\n');
    console.log('Test credentials:');
    testUsers.forEach(u => console.log(`  📧 ${u.email} / 🔑 ${u.password}`));
  } catch (error) {
    console.error('❌ Fatal error:', error.message);
    process.exit(1);
  }
}

seedData();
