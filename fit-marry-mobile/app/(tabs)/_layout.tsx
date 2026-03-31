import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import NotificationBell from '../../src/components/NotificationBell';
import { useI18n } from '../../src/i18n';

const getTabIcon = (name: 'index' | 'matches' | 'likes' | 'profile', color: string, size: number) => {
  const iconMap = {
    index: 'search',
    matches: 'chatbubbles',
    likes: 'heart',
    profile: 'person',
  } as const;

  return <Ionicons name={iconMap[name]} size={size} color={color} />;
};

export default function TabLayout() {
  const { t } = useI18n();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#d84b6b',
        tabBarInactiveTintColor: '#8d7d81',
        tabBarStyle: {
          height: 72,
          paddingBottom: 10,
          paddingTop: 10,
          backgroundColor: '#fffaf7',
          borderTopColor: '#f0e4e0',
        },
        headerShown: true,
        headerStyle: { backgroundColor: '#fffaf7' },
        headerTitleStyle: { fontWeight: '700', color: '#333' },
        headerLeft: () => <NotificationBell />,
        headerLeftContainerStyle: { paddingLeft: 12 },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '700',
        },
      }}
    >
      <Tabs.Screen 
        name="index" 
        options={{ 
          title: t.tabs.discover,
          tabBarIcon: ({ color, size }) => getTabIcon('index', color, size),
        }} 
      />
      <Tabs.Screen 
        name="matches" 
        options={{ 
          title: t.tabs.chats,
          tabBarIcon: ({ color, size }) => getTabIcon('matches', color, size),
        }} 
      />
      <Tabs.Screen 
        name="likes" 
        options={{ 
          title: t.tabs.likes,
          tabBarIcon: ({ color, size }) => getTabIcon('likes', color, size),
        }}
      />
      <Tabs.Screen
        name="rewards/index"
        options={{
          title: t.tabs.rewards,
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="gift-outline" size={size} color={color} />
          ),
        }}
      />
       <Tabs.Screen
        name="profile"
        options={{ 
          title: t.tabs.profile,
          tabBarIcon: ({ color, size }) => getTabIcon('profile', color, size),
        }} 
      />
    </Tabs>
  );
}
