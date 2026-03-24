import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Colors, Radius, Shadow } from '@/lib/theme';

const ITEMS = [
  { label: 'Music', icon: '♪', route: '/(tabs)/music' as const, hint: 'Church songs and worship audio' },
  { label: 'Teachings', icon: '▶', route: '/(tabs)/teachings' as const, hint: 'Gospel principles in audio/video' },
  { label: 'Notes', icon: '✎', route: '/(tabs)/notes' as const, hint: 'Your personal notes and study' },
];

export default function MoreScreen() {
  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>More</Text>
        <Text style={styles.subtitle}>Open additional sections of the app.</Text>
      </View>

      <View style={styles.list}>
        {ITEMS.map((item) => (
          <TouchableOpacity key={item.label} style={styles.card} onPress={() => router.push(item.route)} activeOpacity={0.9}>
            <View style={styles.iconWrap}><Text style={styles.icon}>{item.icon}</Text></View>
            <View style={{ flex: 1 }}>
              <Text style={styles.cardTitle}>{item.label}</Text>
              <Text style={styles.cardHint}>{item.hint}</Text>
            </View>
            <Text style={styles.arrow}>›</Text>
          </TouchableOpacity>
        ))}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bg },
  header: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 12 },
  title: { fontSize: 22, fontWeight: '800', color: Colors.text },
  subtitle: { fontSize: 13, color: Colors.text2, marginTop: 4 },
  list: { paddingHorizontal: 16, paddingTop: 4, gap: 10 },
  card: {
    backgroundColor: Colors.card,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    ...Shadow.sm,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: { fontSize: 18, color: Colors.primary, fontWeight: '700' },
  cardTitle: { fontSize: 15, fontWeight: '700', color: Colors.text },
  cardHint: { fontSize: 12, color: Colors.text2, marginTop: 2 },
  arrow: { fontSize: 20, color: Colors.text3, marginLeft: 6 },
});
