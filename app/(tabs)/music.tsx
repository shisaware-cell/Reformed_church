import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Audio } from 'expo-av';
import { Colors, Radius, Shadow } from '@/lib/theme';
import { supabase } from '@/lib/supabase';

type SongRow = {
  id: string;
  title: string;
  artist_name?: string | null;
  description?: string | null;
  file_url?: string | null;
  audio_url?: string | null;
  media_url?: string | null;
  is_published?: boolean;
  created_at: string;
};

export default function MusicScreen() {
  const [songs, setSongs] = useState<SongRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeSongId, setActiveSongId] = useState<string | null>(null);
  const [playing, setPlaying] = useState(false);
  const soundRef = useRef<Audio.Sound | null>(null);

  const loadSongs = useCallback(async () => {
    setLoading(true);
    const res = await supabase
      .from('songs')
      .select('*')
      .eq('is_published', true)
      .order('created_at', { ascending: false });

    if (res.error) {
      Alert.alert('Unable to load songs', res.error.message);
      setSongs([]);
    } else {
      setSongs((res.data || []) as SongRow[]);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadSongs();
    return () => {
      if (soundRef.current) {
        soundRef.current.unloadAsync();
      }
    };
  }, [loadSongs]);

  async function toggleSong(song: SongRow) {
    const url = song.file_url || song.audio_url || song.media_url;
    if (!url) {
      Alert.alert('Missing media', 'This song has no file URL.');
      return;
    }

    if (activeSongId === song.id && playing && soundRef.current) {
      await soundRef.current.pauseAsync();
      setPlaying(false);
      return;
    }

    if (soundRef.current) {
      await soundRef.current.unloadAsync();
      soundRef.current = null;
    }

    const { sound } = await Audio.Sound.createAsync(
      { uri: url },
      { shouldPlay: true },
      (status) => {
        if (!status.isLoaded) return;
        setPlaying(status.isPlaying);
        if (status.didJustFinish) {
          setPlaying(false);
          setActiveSongId(null);
        }
      }
    );

    soundRef.current = sound;
    setActiveSongId(song.id);
    setPlaying(true);
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Music</Text>
        <Text style={styles.subtitle}>Church songs uploaded by admin.</Text>
      </View>

      {loading ? (
        <View style={styles.centerBox}>
          <ActivityIndicator color={Colors.primary} />
          <Text style={styles.helperText}>Loading songs...</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.list}>
          {!songs.length ? (
            <View style={styles.empty}>
              <Text style={styles.emptyTitle}>No songs published yet</Text>
              <Text style={styles.emptySub}>Ask admin to upload MP3 songs in the dashboard.</Text>
            </View>
          ) : (
            songs.map((song) => {
              const active = activeSongId === song.id && playing;
              return (
                <View key={song.id} style={styles.card}>
                  <Text style={styles.songTitle}>{song.title}</Text>
                  {song.artist_name ? <Text style={styles.artist}>By {song.artist_name}</Text> : null}
                  {song.description ? <Text style={styles.description}>{song.description}</Text> : null}
                  <TouchableOpacity style={[styles.playBtn, active && styles.playBtnActive]} onPress={() => toggleSong(song)}>
                    <Text style={styles.playBtnText}>{active ? 'Pause' : 'Play'}</Text>
                  </TouchableOpacity>
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
  list: { paddingHorizontal: 14, paddingBottom: 30 },
  card: {
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    padding: 14,
    marginBottom: 10,
    ...Shadow.sm,
  },
  songTitle: { fontSize: 15, fontWeight: '700', color: Colors.text },
  artist: { marginTop: 4, fontSize: 12, color: Colors.primary, fontWeight: '600' },
  description: { marginTop: 8, fontSize: 13, color: Colors.text2, lineHeight: 20 },
  playBtn: {
    marginTop: 12,
    alignSelf: 'flex-start',
    backgroundColor: Colors.primary,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: Radius.sm,
  },
  playBtnActive: { backgroundColor: Colors.primaryDark },
  playBtnText: { color: Colors.white, fontSize: 12, fontWeight: '700' },
  empty: { alignItems: 'center', paddingVertical: 50 },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: Colors.text },
  emptySub: { marginTop: 6, fontSize: 13, color: Colors.text2, textAlign: 'center' },
});
