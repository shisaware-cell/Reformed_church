import { Tabs } from 'expo-router';
import { View, Text, StyleSheet } from 'react-native';
import { Colors } from '@/lib/theme';

const ICONS: Record<string, { active: string; inactive: string }> = {
  index:      { active: '⌂',  inactive: '⌂'  },
  community:  { active: '👥',  inactive: '👥'  },
  notes:      { active: '✏',  inactive: '✎'  },
  bible:      { active: '✞',  inactive: '✞'  },
  music:      { active: '♪',  inactive: '♫'  },
  teachings:  { active: '▶',  inactive: '▶'  },
  profile:    { active: '👤',  inactive: '👤'  },
};

function TabIcon({ name, focused, label }: { name: string; focused: boolean; label: string }) {
  return (
    <View style={[styles.iconWrap, focused && styles.iconWrapActive]}>
      <Text style={[styles.icon, focused && styles.iconActive]}>{ICONS[name]?.[focused ? 'active' : 'inactive'] || '•'}</Text>
    </View>
  );
}

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: styles.tabBar,
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: Colors.text3,
        tabBarLabelStyle: styles.label,
        tabBarItemStyle: styles.tabItem,
      }}
    >
      <Tabs.Screen name="index"      options={{ title: 'Home',       tabBarIcon: ({ focused }) => <TabIcon name="index"      focused={focused} label="Home"       /> }} />
      <Tabs.Screen name="community"  options={{ title: 'Community',  tabBarIcon: ({ focused }) => <TabIcon name="community"  focused={focused} label="Community"  /> }} />
      <Tabs.Screen name="notes"      options={{ title: 'Notes',      tabBarIcon: ({ focused }) => <TabIcon name="notes"      focused={focused} label="Notes"      /> }} />
      <Tabs.Screen name="bible"      options={{ title: 'Bible',      tabBarIcon: ({ focused }) => <TabIcon name="bible"      focused={focused} label="Bible"      /> }} />
      <Tabs.Screen name="music"      options={{ title: 'Music',      tabBarIcon: ({ focused }) => <TabIcon name="music"      focused={focused} label="Music"      /> }} />
      <Tabs.Screen name="teachings"  options={{ title: 'Teachings',  tabBarIcon: ({ focused }) => <TabIcon name="teachings"  focused={focused} label="Teachings"  /> }} />
      <Tabs.Screen name="profile"    options={{ title: 'Profile',    tabBarIcon: ({ focused }) => <TabIcon name="profile"    focused={focused} label="Profile"    /> }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: Colors.card,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    height: 70,
    paddingBottom: 10,
    paddingTop: 8,
  },
  tabItem: { paddingTop: 2 },
  iconWrap: {
    width: 36, height: 36, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center',
  },
  iconWrapActive: {
    backgroundColor: Colors.primaryLight,
  },
  icon: { fontSize: 19, color: Colors.text3 },
  iconActive: { color: Colors.primary },
  label: { fontSize: 10, fontWeight: '700', letterSpacing: 0.2 },
});
