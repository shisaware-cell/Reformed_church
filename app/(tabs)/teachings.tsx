import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Audio, Video, ResizeMode } from 'expo-av';
import { Colors, Radius, Shadow } from '@/lib/theme';
import { supabase } from '@/lib/supabase';

type TeachingRow = {
  id: string;
  title: string;
  topic?: string | null;
  description?: string | null;
  media_url?: string | null;
  media_type?: 'audio' | 'video' | null;
  is_published?: boolean;
  created_at: string;
};

export default function TeachingsScreen() {
  const [teachings, setTeachings] = useState<TeachingRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeAudioId, setActiveAudioId] = useState<string | null>(null);
  const [audioPlaying, setAudioPlaying] = useState(false);
  const soundRef = useRef<Audio.Sound | null>(null);

  const loadTeachings = useCallback(async () => {
    setLoading(true);
    const res = await supabase
      .from('teachings')
      .select('*')
      .eq('is_published', true)
      .order('created_at', { ascending: false });

    if (res.error) {
      Alert.alert('Unable to load teachings', res.error.message);
      setTeachings([]);
    } else {
      setTeachings((res.data || []) as TeachingRow[]);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadTeachings();
    return () => {
      if (soundRef.current) {
        soundRef.current.unloadAsync();
      }
    };
  }, [loadTeachings]);

  async function toggleAudio(item: TeachingRow) {
    if (!item.media_url) {
      Alert.alert('Missing media', 'This teaching has no media URL.');
      return;
    }

    if (activeAudioId === item.id && audioPlaying && soundRef.current) {
      await soundRef.current.pauseAsync();
      setAudioPlaying(false);
      return;
    }

    if (soundRef.current) {
      await soundRef.current.unloadAsync();
      soundRef.current = null;
    }

    const { sound } = await Audio.Sound.createAsync(
      { uri: item.media_url },
      { shouldPlay: true },
      (status) => {
        if (!status.isLoaded) return;
        setAudioPlaying(status.isPlaying);
        if (status.didJustFinish) {
          setAudioPlaying(false);
          setActiveAudioId(null);
        }
      }
    );

    soundRef.current = sound;
    setActiveAudioId(item.id);
    setAudioPlaying(true);
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Teachings</Text>
        <Text style={styles.subtitle}>Gospel principles and faith lessons in audio/video.</Text>
      </View>

      {loading ? (
        <View style={styles.centerBox}>
          <ActivityIndicator color={Colors.primary} />
          <Text style={styles.helperText}>Loading teachings...</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.list}>
          {!teachings.length ? (
            <View style={styles.empty}>
              <Text style={styles.emptyTitle}>No teachings published yet</Text>
              <Text style={styles.emptySub}>Admin can upload MP3 and MP4 teachings from the dashboard.</Text>
            </View>
          ) : (
            teachings.map((item) => {
              const type = item.media_type || 'audio';
              const isActiveAudio = activeAudioId === item.id && audioPlaying;
              return (
                <View key={item.id} style={styles.card}>
                  <Text style={styles.itemTitle}>{item.title}</Text>
                  {item.topic ? <Text style={styles.topic}>{item.topic}</Text> : null}
                  {item.description ? <Text style={styles.description}>{item.description}</Text> : null}

                  {item.media_url ? (
                    type === 'video' ? (
                      <View style={styles.videoWrap}>
                        <Video
                          source={{ uri: item.media_url }}
                          useNativeControls
                          resizeMode={ResizeMode.CONTAIN}
                          style={styles.video}
                        />
                      </View>
                    ) : (
                      <TouchableOpacity style={[styles.playBtn, isActiveAudio && styles.playBtnActive]} onPress={() => toggleAudio(item)}>
                        <Text style={styles.playBtnText}>{isActiveAudio ? 'Pause audio' : 'Play audio'}</Text>
                      </TouchableOpacity>
                    )
                  ) : (
                    <Text style={styles.missingMedia}>No media URL attached.</Text>
                  )}
                </View>
              );
            })
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bg },
  header: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 10 },
  title: { fontSize: 22, fontWeight: '700', color: Colors.text },
  subtitle: { marginTop: 4, fontSize: 13, color: Colors.text2 },
  centerBox: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  helperText: { marginTop: 8, color: Colors.text2, fontSize: 13 },
  list: { paddingHorizontal: 14, paddingBottom: 28 },
  card: {
    backgroundColor: Colors.card,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 14,
    marginBottom: 10,
    ...Shadow.sm,
  },
  itemTitle: { fontSize: 15, fontWeight: '700', color: Colors.text },
  topic: { marginTop: 4, fontSize: 12, color: Colors.primary, fontWeight: '600' },
  description: { marginTop: 8, fontSize: 13, color: Colors.text2, lineHeight: 20 },
  playBtn: {
    marginTop: 12,
    alignSelf: 'flex-start',
    backgroundColor: Colors.primary,
    borderRadius: Radius.sm,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  playBtnActive: { backgroundColor: Colors.primaryDark },
  playBtnText: { color: Colors.white, fontSize: 12, fontWeight: '700' },
  videoWrap: {
    marginTop: 12,
    borderRadius: Radius.sm,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: '#000',
  },
  video: { width: '100%', height: 210 },
  missingMedia: { marginTop: 10, fontSize: 12, color: Colors.text3 },
  empty: { alignItems: 'center', paddingVertical: 50 },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: Colors.text },
  emptySub: { marginTop: 6, fontSize: 13, color: Colors.text2, textAlign: 'center' },
});
