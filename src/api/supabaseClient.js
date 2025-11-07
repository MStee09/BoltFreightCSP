import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://siujmppdeumvwwvyqcsq.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNpdWptcHBkZXVtdnd3dnlxY3NxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjEwNTg5NjQsImV4cCI6MjA3NjYzNDk2NH0.MXDB0IkA0TOA-L7rrfakvnRcGVniSXIqqHRyTeG3cV0';

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
