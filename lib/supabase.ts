import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Supabase çevre değişkenleri eksik. Lütfen .env dosyasını oluşturun ve şu değişkenleri girin:\n' +
      'EXPO_PUBLIC_SUPABASE_URL\n' +
      'EXPO_PUBLIC_SUPABASE_ANON_KEY\n' +
      'Örnek için .env.example dosyasına bakın.'
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
