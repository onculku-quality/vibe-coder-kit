import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  View,
  Text,
  Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Building2, LogIn, UserPlus } from 'lucide-react-native';
import { useAuth } from '@/lib/auth';
import { Button } from '@/components/Button';
import { Input } from '@/components/Input';

type Mode = 'login' | 'register';

export default function LoginScreen() {
  const { signIn, signUp } = useAuth();
  const [mode, setMode] = useState<Mode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  function switchMode(newMode: Mode) {
    setMode(newMode);
    setError(null);
    setSuccess(null);
  }

  async function handleSubmit() {
    setError(null);
    setSuccess(null);

    if (!email.trim() || !password.trim()) {
      setError('E-posta ve şifre zorunludur.');
      return;
    }

    if (mode === 'register' && (!name.trim() || !inviteCode.trim())) {
      setError('Ad soyad ve davet kodu zorunludur.');
      return;
    }

    setLoading(true);

    try {
      if (mode === 'login') {
        const { error: err } = await signIn(email, password);
        if (err) {
          setError(err);
        }
      } else {
        const { error: err } = await signUp(email, password, name, inviteCode);
        if (err) {
          setError(err);
        } else {
          setSuccess('Kayıt başarılı. Giriş yapabilirsiniz.');
          setMode('login');
          setPassword('');
          setInviteCode('');
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Beklenmeyen bir hata oluştu.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        className="flex-1"
      >
        <ScrollView
          contentContainerClassName="flex-1 items-center justify-center px-6 py-8"
          keyboardShouldPersistTaps="handled"
        >
          <View className="mb-8 items-center">
            <View className="mb-3 h-16 w-16 items-center justify-center rounded-2xl bg-brand-600">
              <Building2 size={32} color="#fff" />
            </View>
            <Text className="text-2xl font-bold text-gray-800">Denetim</Text>
            <Text className="mt-1 text-sm text-gray-500">
              Kurum İçi Denetim Yönetim Sistemi
            </Text>
          </View>

          <View className="mb-6 flex-row rounded-xl bg-gray-200 p-1">
            <Pressable
              onPress={() => switchMode('login')}
              className={`flex-1 items-center rounded-lg py-2.5 ${mode === 'login' ? 'bg-white shadow-sm' : ''}`}
            >
              <Text
                className={`text-sm font-semibold ${mode === 'login' ? 'text-brand-600' : 'text-gray-500'}`}
              >
                Giriş Yap
              </Text>
            </Pressable>
            <Pressable
              onPress={() => switchMode('register')}
              className={`flex-1 items-center rounded-lg py-2.5 ${mode === 'register' ? 'bg-white shadow-sm' : ''}`}
            >
              <Text
                className={`text-sm font-semibold ${mode === 'register' ? 'text-brand-600' : 'text-gray-500'}`}
              >
                Kayıt Ol
              </Text>
            </Pressable>
          </View>

          <View className="w-full max-w-sm gap-4">
            {mode === 'register' && (
              <Input
                label="Ad Soyad"
                value={name}
                onChangeText={setName}
                placeholder="Adınız Soyadınız"
                autoCapitalize="words"
              />
            )}
            <Input
              label="E-posta"
              value={email}
              onChangeText={setEmail}
              placeholder="ornek@email.com"
              keyboardType="email-address"
            />
            <Input
              label="Şifre"
              value={password}
              onChangeText={setPassword}
              placeholder="••••••••"
              secureTextEntry
            />
            {mode === 'register' && (
              <Input
                label="Davet Kodu"
                value={inviteCode}
                onChangeText={(t) => setInviteCode(t.toUpperCase())}
                placeholder="ABCD-1234"
                autoCapitalize="characters"
              />
            )}

            {error && (
              <View className="rounded-xl bg-red-50 px-4 py-3">
                <Text className="text-sm text-red-700">{error}</Text>
              </View>
            )}
            {success && (
              <View className="rounded-xl bg-green-50 px-4 py-3">
                <Text className="text-sm text-green-700">{success}</Text>
              </View>
            )}

            <Button
              label={mode === 'login' ? 'Giriş Yap' : 'Kayıt Ol'}
              loading={loading}
              onPress={handleSubmit}
              icon={
                mode === 'login' ? (
                  <LogIn size={20} color="#fff" />
                ) : (
                  <UserPlus size={20} color="#fff" />
                )
              }
            />
          </View>

          <View className="mt-8 max-w-sm">
            <Text className="text-center text-xs text-gray-400">
              Abonelik ve kurum kaydı için platform yöneticisiyle iletişin.
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
