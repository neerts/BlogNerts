// GANTI DENGAN URL PROYEK ANDA
const SUPABASE_URL = 'https://mwwdijkbcaxnesalihmm.supabase.co'; 

// GANTI DENGAN KUNCI ANON PUBLIK ANDA
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im13d2RpamtiY2F4bmVzYWxpaG1tIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE4MjgwNzEsImV4cCI6MjA3NzQwNDA3MX0.tH9VfgReBFO1Wk2rK87DvHw_Ux1hOlc1WE2EH6OsygE';

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
