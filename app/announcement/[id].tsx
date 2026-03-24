import { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Image, ActivityIndicator, Share } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '@/lib/supabase';
import { Colors, Radius } from '@/lib/theme';
import type { Announcement } from '@/lib/types';

export default function AnnouncementDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [announcement, setAnnouncement] = useState<Announcement | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.from('announcements').select('*').eq('id', id).single()
      .then(({ data }) => { if (data) setAnnouncement(data); setLoading(false); });
  }, [id]);

  async function shareAnnouncement() {
    if (!announcement) return;
    await Share.share({ message: `${announcement.title}\n\n${announcement.content}\n\nThe Church of Jesus Christ OF LATTER-DAY SAINTS` });
  }

  const fmt = (d: string) => new Date(d).toLocaleDateString('en-ZA', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });

  if (loading) return (
    <View style={styles.center}><ActivityIndicator size="large" color={Colors.primary} /></View>
  );
  if (!announcement) return (
    <View style={styles.center}>
      <Text style={styles.errorText}>Announcement not found</Text>
      <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
        <Text style={styles.backBtnText}>Go back</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.nav}>
        <TouchableOpacity onPress={() => router.back()} style={styles.navBtn}>
          <Text style={styles.navBtnText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.navTitle} numberOfLines={1}>Announcement</Text>
        <TouchableOpacity onPress={shareAnnouncement} style={styles.navBtn}>
          <Text style={styles.navBtnText}>Share ↑</Text>
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {announcement.image_url ? (
          <View style={styles.heroWrap}>
            <Image source={{ uri: announcement.image_url }} style={styles.heroImg} resizeMode="cover" />
            <View style={styles.heroOverlay} />
            <View style={styles.heroBadge}>
              <Text style={styles.heroBadgeText}>📢 ANNOUNCEMENT</Text>
            </View>
          </View>
        ) : (
          <View style={styles.heroPlain}>
            <View style={styles.heroPlainBadge}>
              <Text style={styles.heroPlainBadgeText}>📢 ANNOUNCEMENT</Text>
            </View>
          </View>
        )}

        <View style={styles.content}>
          <Text style={styles.title}>{announcement.title}</Text>
          {announcement.subtitle && (
            <Text style={styles.subtitle}>{announcement.subtitle}</Text>
          )}

          <View style={styles.dateRow}>
            <View style={styles.dateIcon}>
              <Text style={styles.dateIconText}>📅</Text>
            </View>
            <Text style={styles.dateText}>{fmt(announcement.created_at)}</Text>
          </View>

          <View style={styles.divider} />

          <Text style={styles.body}>{announcement.content}</Text>

          <View style={styles.shareBar}>
            <TouchableOpacity style={styles.shareBtn} onPress={shareAnnouncement}>
              <Text style={styles.shareBtnText}>🔗 Share this announcement</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  errorText: { fontSize: 16, color: Colors.text2, marginBottom: 16 },
  backBtn: { backgroundColor: Colors.primary, borderRadius: Radius.sm, paddingHorizontal: 24, paddingVertical: 10 },
  backBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },

  nav: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 13,
    backgroundColor: Colors.card,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  navBtn: { padding: 4, minWidth: 60 },
  navBtnText: { fontSize: 14, color: Colors.primary, fontWeight: '600' },
  navTitle: { flex: 1, fontSize: 14, fontWeight: '700', color: Colors.text, textAlign: 'center', marginHorizontal: 8 },

  heroWrap: { height: 260, position: 'relative' },
  heroImg: { width: '100%', height: 260 },
  heroOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(89,37,105,0.35)' },
  heroBadge: {
    position: 'absolute', top: 16, left: 16,
    backgroundColor: Colors.primary,
    borderRadius: 6, paddingHorizontal: 10, paddingVertical: 5,
  },
  heroBadgeText: { color: '#fff', fontSize: 11, fontWeight: '700', letterSpacing: 0.5 },

  heroPlain: {
    backgroundColor: Colors.primary,
    paddingVertical: 28, paddingHorizontal: 20,
    alignItems: 'flex-start',
  },
  heroPlainBadge: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 6, paddingHorizontal: 10, paddingVertical: 5,
  },
  heroPlainBadgeText: { color: '#fff', fontSize: 11, fontWeight: '700', letterSpacing: 0.5 },

  content: { padding: 20 },

  title: { fontSize: 22, fontWeight: '700', color: Colors.text, lineHeight: 30, marginBottom: 6 },
  subtitle: { fontSize: 15, color: Colors.primary, fontWeight: '600', marginBottom: 14 },

  dateRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: Colors.primaryLight,
    borderRadius: Radius.sm, padding: 10, marginBottom: 18,
  },
  dateIcon: {
    width: 32, height: 32, borderRadius: 8,
    backgroundColor: Colors.primary,
    alignItems: 'center', justifyContent: 'center',
  },
  dateIconText: { fontSize: 16 },
  dateText: { fontSize: 13, color: Colors.primaryDark, fontWeight: '600' },

  divider: { height: 1, backgroundColor: Colors.border, marginBottom: 18 },

  body: { fontSize: 16, color: Colors.text, lineHeight: 26 },

  shareBar: { marginTop: 32, marginBottom: 20, alignItems: 'center' },
  shareBtn: {
    backgroundColor: Colors.primaryLight,
    borderRadius: Radius.sm,
    paddingHorizontal: 24, paddingVertical: 12,
    borderWidth: 1, borderColor: Colors.border,
  },
  shareBtnText: { fontSize: 14, color: Colors.primaryDark, fontWeight: '600' },
});
