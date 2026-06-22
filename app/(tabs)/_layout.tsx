import { Tabs } from 'expo-router';
import { Home, User, Users, UserCog, BookOpen, ClipboardList, ClipboardCheck, FileWarning, History } from 'lucide-react-native';
import { useAuth } from '@/lib/auth';

export default function TabsLayout() {
  const { profile } = useAuth();
  const isAdmin = profile?.role === 'admin';
  const canPlan = profile?.role === 'admin' || profile?.role === 'bas_denetci';
  const isInstitutionUser = profile?.role && profile.role !== 'platform_admini';

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#2563eb',
        tabBarInactiveTintColor: '#9ca3af',
        tabBarStyle: {
          borderTopWidth: 1,
          borderTopColor: '#e5e7eb',
          paddingBottom: 4,
          paddingTop: 4,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Ana Sayfa',
          tabBarIcon: ({ color }) => <Home size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="standards"
        options={{
          title: 'Standartlar',
          tabBarIcon: ({ color }) => <BookOpen size={24} color={color} />,
          href: isAdmin ? undefined : null,
        }}
      />
      <Tabs.Screen
        name="plans"
        options={{
          title: 'Planlar',
          tabBarIcon: ({ color }) => <ClipboardList size={24} color={color} />,
          href: canPlan ? undefined : null,
        }}
      />
      <Tabs.Screen
        name="audits"
        options={{
          title: 'Denetimler',
          tabBarIcon: ({ color }) => <ClipboardCheck size={24} color={color} />,
          href: isInstitutionUser ? undefined : null,
        }}
      />
      <Tabs.Screen
        name="difs"
        options={{
          title: 'DİF',
          tabBarIcon: ({ color }) => <FileWarning size={24} color={color} />,
          href: isInstitutionUser ? undefined : null,
        }}
      />
      <Tabs.Screen
        name="activity"
        options={{
          title: 'Loglar',
          tabBarIcon: ({ color }) => <History size={24} color={color} />,
          href: canPlan ? undefined : null,
        }}
      />
      <Tabs.Screen
        name="teams"
        options={{
          title: 'Takımlar',
          tabBarIcon: ({ color }) => <Users size={24} color={color} />,
          href: isAdmin ? undefined : null,
        }}
      />
      <Tabs.Screen
        name="users"
        options={{
          title: 'Kullanıcılar',
          tabBarIcon: ({ color }) => <UserCog size={24} color={color} />,
          href: isAdmin ? undefined : null,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profil',
          tabBarIcon: ({ color }) => <User size={24} color={color} />,
        }}
      />
    </Tabs>
  );
}
