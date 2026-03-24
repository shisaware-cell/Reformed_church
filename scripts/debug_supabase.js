const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Load environment variables from supabase.env
const envPath = path.resolve(__dirname, '../supabase.env');
const envFile = fs.readFileSync(envPath, 'utf-8');
const envVars = envFile.split('\n').reduce((acc, line) => {
  const [key, value] = line.split('=');
  if (key && value) {
    acc[key.trim()] = value.trim();
  }
  return acc;
}, {});

const supabaseUrl = envVars.SUPABASE_URL;
const supabaseKey = envVars.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Error: SUPABASE_URL and SUPABASE_SERVICE_KEY must be set in supabase.env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function runDiagnostics() {
  try {
    console.log('Running Supabase Diagnostics...');

    // 1. Check Storage Buckets
    console.log('\n--- Checking Storage Buckets ---');
    const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets();
    if (bucketsError) {
      console.error('Error listing buckets:', bucketsError.message);
    } else if (buckets.length === 0) {
      console.log('No storage buckets found.');
    } else {
      console.log('Found buckets:');
      for (const bucket of buckets) {
        console.log(`- ${bucket.name} (Public: ${bucket.public})`);
        // You can add more details here, like checking RLS policies if needed
      }
    }

    // 2. Check Users Table
    console.log('\n--- Checking Users Table Schema ---');
    const { data: tableData, error: tableError } = await supabase
      .from('users')
      .select('*')
      .limit(1);

    if (tableError) {
      console.error('Error fetching users table schema:', tableError.message);
    } else if (tableData.length === 0) {
      console.log('The "users" table is empty. Cannot infer schema from data.');
    } else {
      const columns = Object.keys(tableData[0]);
      console.log('Found columns in "users" table:');
      console.log(columns.join(', '));
      
      console.log('\n--- Sample User Data ---');
      console.table(tableData);
    }
    
    // 3. Check for post_comments table
    console.log('\n--- Checking post_comments Table ---');
    const { error: postCommentsError } = await supabase
      .from('post_comments')
      .select('id')
      .limit(1);

    if (postCommentsError) {
        if (postCommentsError.code === '42P01') {
            console.warn('Warning: The "post_comments" table does not exist.');
            console.log('Please run the following SQL in your Supabase dashboard to create it:');
            console.log(`
CREATE TABLE public.post_comments (
  id UUID DEFAULT gen_random_uuid() NOT NULL,
  post_id UUID NOT NULL,
  user_id UUID NOT NULL,
  parent_comment_id UUID,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  CONSTRAINT post_comments_pkey PRIMARY KEY (id),
  CONSTRAINT post_comments_post_id_fkey FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
  CONSTRAINT post_comments_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT post_comments_parent_comment_id_fkey FOREIGN KEY (parent_comment_id) REFERENCES post_comments(id) ON DELETE CASCADE
);
ALTER TABLE public.post_comments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read access" ON public.post_comments FOR SELECT USING (true);
CREATE POLICY "Allow users to insert their own comments" ON public.post_comments FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Allow users to update their own comments" ON public.post_comments FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Allow users to delete their own comments" ON public.post_comments FOR DELETE USING (auth.uid() = user_id);
            `);
        } else {
            console.error('Error checking for "post_comments" table:', postCommentsError.message);
        }
    } else {
      console.log('The "post_comments" table exists.');
    }


  } catch (error) {
    console.error('An unexpected error occurred:', error.message);
  }
}

runDiagnostics();
