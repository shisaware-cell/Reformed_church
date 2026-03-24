import { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Image, ActivityIndicator } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '@/lib/supabase';
import { Colors, Radius, Shadow } from '@/lib/theme';
import type { Sermon } from '@/lib/types';

export default function SermonDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [sermon, setSermon] = useState<Sermon | null>(null);
  const [loading, setLoading] = useState(true);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    supabase.from('sermons').select('*').eq('id', id).single().then(({ data }) => { if (data) setSermon(data); setLoading(false); });
  }, [id]);

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color={Colors.primary} /></View>;
  if (!sermon) return <View style={styles.center}><Text style={{ color: Colors.text2 }}>Sermon not found</Text></View>;

  const duration = sermon.duration_seconds ? Math.round(sermon.duration_seconds / 60) : null;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.nav}>
        <TouchableOpacity onPress={() => router.back()} style={styles.navBtn}><Text style={styles.navBtnText}>← Back</Text></TouchableOpacity>
        <Text style={styles.navTitle} numberOfLines={1}>Sermon</Text>
        <View style={{ width: 60 }} />
      </View>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.playerCard}>
          <View style={styles.thumbWrap}>
            {sermon.thumbnail_url ? <Image source={{ uri: sermon.thumbnail_url }} style={styles.thumb} /> : <Text style={styles.thumbIcon}>🎙</Text>}
          </View>
          <Text style={styles.title}>{sermon.title}</Text>
          {sermon.subtitle && <Text style={styles.subtitle}>{sermon.subtitle}</Text>}
          <Text style={styles.pastor}>{sermon.pastor_name}{sermon.series_name ? ` · ${sermon.series_name}` : ''}</Text>
          {sermon.scripture_reference && (
            <View style={styles.scriptureBadge}><Text style={styles.scriptureBadgeText}>✞ {sermon.scripture_reference}</Text></View>
          )}
          {sermon.audio_url ? (
            <>
              <View style={styles.progressBar}>
                <TouchableOpacity style={styles.progressTrack} onPress={(e) => { const w = e.nativeEvent.locationX; setProgress(Math.min(Math.max(w / 280, 0), 1)); }} activeOpacity={1}>
                  <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
                </TouchableOpacity>
              </View>
              <View style={styles.timeRow}>
                <Text style={styles.timeText}>{duration ? `${Math.round(progress * duration)}:00` : '0:00'}</Text>
                <Text style={styles.timeText}>{duration ? `${duration}:00` : '--:--'}</Text>
              </View>
              <TouchableOpacity style={styles.playBtn} onPress={() => setPlaying(!playing)}>
                <Text style={styles.playBtnIcon}>{playing ? '⏸' : '▶'}</Text>
              </TouchableOpacity>
              {!sermon.audio_url && <Text style={styles.noAudio}>Audio coming soon</Text>}
            </>
          ) : (
            <View style={styles.noAudioWrap}><Text style={styles.noAudio}>Audio not available yet</Text></View>
          )}
        </View>
        {sermon.description && (
          <View style={styles.descCard}>
            <Text style={styles.descTitle}>About this sermon</Text>
            <Text style={styles.descText}>{sermon.description}</Text>
          </View>
        )}
        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  nav: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 13, backgroundColor: Colors.card, borderBottomWidth: 1, borderBottomColor: Colors.border },
  navBtn: { padding: 4, minWidth: 60 },
  navBtnText: { fontSize: 14, color: Colors.primary, fontWeight: '500' },
  navTitle: { flex: 1, fontSize: 14, fontWeight: '600', color: Colors.text, textAlign: 'center' },
  playerCard: { backgroundColor: Colors.card, margin: 16, borderRadius: Radius.lg, padding: 24, alignItems: 'center', borderWidth: 1, borderColor: Colors.border, ...Shadow.md },
  thumbWrap: { width: 100, height: 100, borderRadius: 20, backgroundColor: Colors.primaryLight, alignItems: 'center', justifyContent: 'center', marginBottom: 16, overflow: 'hidden' },
  thumb: { width: 100, height: 100 },
  thumbIcon: { fontSize: 44 },
  title: { fontSize: 18, fontWeight: '600', color: Colors.text, textAlign: 'center', marginBottom: 6 },
  subtitle: { fontSize: 14, color: Colors.text2, textAlign: 'center', marginBottom: 6 },
  pastor: { fontSize: 13, color: Colors.text3, marginBottom: 12 },
  scriptureBadge: { backgroundColor: Colors.accentLight, borderRadius: 6, paddingHorizontal: 10, paddingVertical: 4, marginBottom: 20 },
  scriptureBadgeText: { fontSize: 12, color: Colors.accent, fontWeight: '500' },
  progressBar: { width: '100%', marginBottom: 6 },
  progressTrack: { width: '100%', height: 4, backgroundColor: Colors.card2, borderRadius: 2 },
  progressFill: { height: 4, backgroundColor: Colors.primary, borderRadius: 2 },
  timeRow: { flexDirection: 'row', justifyContent: 'space-between', width: '100%', marginBottom: 20 },
  timeText: { fontSize: 11, color: Colors.text3 },
  playBtn: { width: 60, height: 60, borderRadius: 30, backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center' },
  playBtnIcon: { color: '#fff', fontSize: 22 },
  noAudioWrap: { paddingVertical: 16 },
  noAudio: { fontSize: 13, color: Colors.text3, textAlign: 'center' },
  descCard: { backgroundColor: Colors.card, marginHorizontal: 16, borderRadius: Radius.md, padding: 16, borderWidth: 1, borderColor: Colors.border },
  descTitle: { fontSize: 13, fontWeight: '600', color: Colors.text3, marginBottom: 8 },
  descText: { fontSize: 14, color: Colors.text, lineHeight: 22 },
});
