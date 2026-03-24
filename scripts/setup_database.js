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

const CREATE_TABLE_SQL = `
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
`;

const ENABLE_RLS_SQL = `
ALTER TABLE public.post_comments ENABLE ROW LEVEL SECURITY;
`;

const CREATE_POLICIES_SQL = `
CREATE POLICY "Allow public read access" ON public.post_comments FOR SELECT USING (true);
CREATE POLICY "Allow users to insert their own comments" ON public.post_comments FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Allow users to update their own comments" ON public.post_comments FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Allow users to delete their own comments" ON public.post_comments FOR DELETE USING (auth.uid() = user_id);
`;

async function setupDatabase() {
  try {
    console.log('--- Checking for post_comments table ---');
    const { error: checkError } = await supabase
      .from('post_comments')
      .select('id')
      .limit(1);

    if (checkError && checkError.code === '42P01') {
      console.log('"post_comments" table not found. Creating it...');
      
      console.log('Executing CREATE TABLE...');
      const { error: createError } = await supabase.rpc('run_sql', { sql: CREATE_TABLE_SQL });
      if (createError) throw new Error(`Error creating table: ${createError.message}`);
      console.log('Table created.');

      console.log('Enabling Row Level Security...');
      const { error: rlsError } = await supabase.rpc('run_sql', { sql: ENABLE_RLS_SQL });
      if (rlsError) throw new Error(`Error enabling RLS: ${rlsError.message}`);
      console.log('RLS enabled.');

      console.log('Creating policies...');
      const { error: policyError } = await supabase.rpc('run_sql', { sql: CREATE_POLICIES_SQL });
      if (policyError) throw new Error(`Error creating policies: ${policyError.message}`);
      console.log('Policies created successfully.');

    } else if (checkError) {
        throw new Error(`Error checking for table: ${checkError.message}`);
    } else {
      console.log('"post_comments" table already exists.');
    }

    console.log('\n--- Verifying Storage Policies for "post-images" ---');
    // This part is a placeholder for manual inspection.
    // The supabase-js library doesn't have a method to read RLS policies for storage.
    // I will check this manually and then apply any fixes if needed.
    console.log('Bucket: post-images (Public: true)');
    console.log('Please manually verify the following policies in your Supabase dashboard under Storage > Policies for the "post-images" bucket:');
    console.log('1. A policy should allow authenticated users to upload images (`insert`).');
    console.log('   - Example: `CREATE POLICY "Allow authenticated uploads" ON storage.objects FOR INSERT TO authenticated WITH CHECK ( bucket_id = \'post-images\' );`');
    console.log('2. Since the bucket is public, reads are generally open, but ensure there are no conflicting `select` policies.');

  } catch (error) {
    console.error('An unexpected error occurred during database setup:', error.message);
  }
}

// Helper function to run raw SQL - needs to be created in Supabase SQL editor
async function createRunSqlFunction() {
    console.log('--- Ensuring run_sql helper function exists ---');
    const { error } = await supabase.rpc('run_sql', { sql: 'SELECT 1;' });

    if (error && error.code === '42883') {
        console.log('"run_sql" function not found. Please create it in the Supabase SQL Editor with the following definition:');
        console.log(`
CREATE OR REPLACE FUNCTION run_sql(sql TEXT)
RETURNS void AS $$
BEGIN
  EXECUTE sql;
END;
$$ LANGUAGE plpgsql;
        `);
        return false;
    }
    return true;
}


async function main() {
    const canRun = await createRunSqlFunction();
    if (canRun) {
        await setupDatabase();
    }
}

main();
