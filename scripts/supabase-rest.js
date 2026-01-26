(async () => {
  try {
    const url = 'https://qvvgivfzhugynqyffony.supabase.co/rest/v1/site_settings?select=key,value&limit=20';
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF2dmdpdmZ6aHVneW5xeWZmb255Iiwicm9zZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2OTAyNzQxOCwiZXhwIjoyMDg0NjAzNDE4fQ.G_eNefaoiTsYT9px9zvwkIWUWbR642DnWCjiyNB9_qI';
    const res = await fetch(url, { headers: { apikey: key, Authorization: `Bearer ${key}` } });
    const text = await res.text();
    require('fs').writeFileSync('scripts/supabase-rest-output.txt', `status:${res.status}\n${text}`);
    console.log('Wrote scripts/supabase-rest-output.txt');
  } catch (e) {
    require('fs').writeFileSync('scripts/supabase-rest-output.txt', 'exception: ' + String(e));
    console.error('Wrote scripts/supabase-rest-output.txt with exception');
  }
})();