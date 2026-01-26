require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error('Missing env vars in process for direct check');
  process.exit(2);
}
const supabase = createClient(url, key);

(async () => {
  try {
    const { data, error } = await supabase.from('site_settings').select('key,value').limit(50);
    if (error) {
      console.error('Direct select error:', error);
      process.exit(3);
    }
    console.log('Direct select OK, count =', (data||[]).length);
    console.log(JSON.stringify(data, null, 2));
  } catch (e) {
    console.error('Exception querying direct:', e);
    process.exit(4);
  }
})();