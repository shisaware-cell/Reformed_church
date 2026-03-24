import { useEffect, useRef, useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  Image, RefreshControl, ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Audio } from 'expo-av';
import { supabase } from '@/lib/supabase';
import { Colors, Radius, Shadow } from '@/lib/theme';
import type { Article, Announcement, Event, Sermon, Song } from '@/lib/types';
import Logo from '@/components/Logo';

export default function HomeScreen() {
  const [hero, setHero] = useState<Article | null>(null);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [sermons, setSermons] = useState<Sermon[]>([]);
  const [songs, setSongs] = useState<Song[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [userName, setUserName] = useState('');
  const [activeSongId, setActiveSongId] = useState<string | null>(null);
  const [songPlaying, setSongPlaying] = useState(false);
  const soundRef = useRef<Audio.Sound | null>(null);

  async function load() {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) {
      const { data: p } = await supabase.from('users').select('name').eq('id', session.user.id).single();
      if (p?.name) setUserName(p.name.split(' ')[0]);
      else if (session.user.user_metadata?.name) setUserName(String(session.user.user_metadata.name).split(' ')[0]);
    }

    const [heroRes, annRes, evRes, serRes, songsRes] = await Promise.all([
      supabase.from('articles').select('*').eq('is_hero', true).eq('is_published', true).single(),
      supabase.from('announcements').select('*').eq('is_published', true).order('created_at', { ascending: false }).limit(4),
      supabase.from('events').select('*').eq('is_published', true).gte('event_date', new Date().toISOString()).order('event_date', { ascending: true }).limit(5),
      supabase.from('sermons').select('*').eq('is_published', true).order('created_at', { ascending: false }).limit(3),
      supabase.from('songs').select('*').eq('is_published', true).order('created_at', { ascending: false }).limit(5),
    ]);

    if (heroRes.data) setHero(heroRes.data);
    if (annRes.data) setAnnouncements(annRes.data);
    if (evRes.data) setEvents(evRes.data);
    if (serRes.data) setSermons(serRes.data);
    if (songsRes.data) setSongs(songsRes.data as Song[]);
    setLoading(false);
    setRefreshing(false);
  }

  useEffect(() => {
    load();
    return () => {
      if (soundRef.current) soundRef.current.unloadAsync();
    };
  }, []);

  async function toggleSong(song: Song) {
    const mediaUrl = song.file_url;
    if (!mediaUrl) return;

    if (activeSongId === song.id && songPlaying && soundRef.current) {
      await soundRef.current.pauseAsync();
      setSongPlaying(false);
      return;
    }

    if (soundRef.current) {
      await soundRef.current.unloadAsync();
      soundRef.current = null;
    }

    const { sound } = await Audio.Sound.createAsync(
      { uri: mediaUrl },
      { shouldPlay: true },
      (status) => {
        if (!status.isLoaded) return;
        setSongPlaying(status.isPlaying);
        if (status.didJustFinish) {
          setSongPlaying(false);
          setActiveSongId(null);
        }
      }
    );

    soundRef.current = sound;
    setActiveSongId(song.id);
    setSongPlaying(true);
  }

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
  };

  const fmtShort = (d: string) => new Date(d).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short' });
  const fmtDay = (d: string) => new Date(d).toLocaleDateString('en-ZA', { weekday: 'short' }).toUpperCase();

  if (loading) {
    return (
      <View style={styles.center}>
        <View style={styles.loadingLogo}><Logo size="medium" /></View>
        <ActivityIndicator color={Colors.primary} style={{ marginTop: 20 }} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={Colors.primary} />}
      >
        <View style={styles.topBar}>
          <View style={styles.topTextWrap}>
            <Text style={styles.topGreeting}>{greeting()}{userName ? `, ${userName}` : ''}</Text>
            <Text style={styles.topChurchMain}>REFORMED CHURCH OF JOHN THE BAPTIST</Text>
          </View>
          <Logo size="small" />
        </View>

        {hero ? (
          <TouchableOpacity style={styles.hero} onPress={() => router.push(`/article/${hero.id}` as any)} activeOpacity={0.94}>
            <View style={styles.heroImgWrap}>
              {hero.cover_image_url
                ? <Image source={{ uri: hero.cover_image_url }} style={styles.heroImg} resizeMode="cover" />
                : <View style={styles.heroImgFallback} />}
              <View style={styles.heroGradient} />
            </View>
            <View style={styles.heroBody}>
              <View style={styles.heroPill}>
                <Text style={styles.heroPillText}>{hero.category?.toUpperCase() || 'FEATURED ARTICLE'}</Text>
              </View>
              <Text style={styles.heroTitle}>{hero.title}</Text>
              {hero.subtitle ? <Text style={styles.heroSub} numberOfLines={2}>{hero.subtitle}</Text> : null}
            </View>
          </TouchableOpacity>
        ) : (
          <View style={styles.heroFallback}>
            <Text style={styles.heroFallbackCross}>✝</Text>
            <Text style={styles.heroFallbackTitle}>Welcome to Reformed Church of John the Baptist</Text>
            <Text style={styles.heroFallbackSub}>Grow in faith, community and purpose</Text>
          </View>
        )}

        <View style={styles.section}>
          <View style={styles.sectionHead}>
            <Text style={styles.sectionTitle}>Announcements</Text>
            <Text style={styles.sectionMeta}>Latest updates</Text>
          </View>
          {announcements.map((a) => (
            <TouchableOpacity
              key={a.id}
              style={styles.annCard}
              onPress={() => router.push(`/announcement/${a.id}` as any)}
              activeOpacity={0.88}
            >
              <View style={styles.annIconWrap}>
                {a.image_url
                  ? <Image source={{ uri: a.image_url }} style={styles.annImage} />
                  : <Text style={styles.annIcon}>📢</Text>}
              </View>
              <View style={styles.annBody}>
                <Text style={styles.annTitle} numberOfLines={1}>{a.title}</Text>
                <Text style={styles.annContent} numberOfLines={2}>{a.content}</Text>
                <Text style={styles.annDate}>{fmtShort(a.created_at)}</Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHead}>
            <Text style={styles.sectionTitle}>Music</Text>
            <Text style={styles.sectionMeta}>Songs playlist</Text>
          </View>
          {songs.length === 0 ? (
            <View style={styles.emptySongCard}>
              <Text style={styles.emptySongTitle}>No songs published yet</Text>
              <Text style={styles.emptySongSub}>Songs uploaded by admin will appear here.</Text>
            </View>
          ) : (
            songs.map((song) => {
              const active = activeSongId === song.id && songPlaying;
              return (
                <TouchableOpacity key={song.id} style={styles.songCard} onPress={() => toggleSong(song)} activeOpacity={0.9}>
                  <View style={styles.songThumb}><Text style={styles.songThumbIcon}>♪</Text></View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.songTitle} numberOfLines={1}>{song.title}</Text>
                    {song.artist_name ? <Text style={styles.songArtist} numberOfLines={1}>{song.artist_name}</Text> : null}
                  </View>
                  <View style={[styles.songPlay, active && styles.songPlayActive]}>
                    <Text style={styles.songPlayText}>{active ? 'II' : '▶'}</Text>
                  </View>
                </TouchableOpacity>
              );
            })
          )}
        </View>

        {events.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHead}>
              <Text style={styles.sectionTitle}>Upcoming events</Text>
              <Text style={styles.sectionMeta}>Gathering soon</Text>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingRight: 6 }}>
              {events.map((ev) => (
                <TouchableOpacity key={ev.id} style={styles.evCard} onPress={() => router.push(`/event/${ev.id}` as any)} activeOpacity={0.88}>
                  <View style={styles.evDateBlock}>
                    <Text style={styles.evDay}>{fmtDay(ev.event_date)}</Text>
                    <Text style={styles.evNum}>{new Date(ev.event_date).getDate()}</Text>
                  </View>
                  <View style={styles.evBody}>
                    <Text style={styles.evTitle} numberOfLines={2}>{ev.title}</Text>
                    {ev.location ? <Text style={styles.evLoc} numberOfLines={1}>📍 {ev.location}</Text> : null}
                    <View style={[styles.evCatPill, { backgroundColor: evPillColor(ev.category) }]}> 
                      <Text style={styles.evCatText}>{ev.category || 'event'}</Text>
                    </View>
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        {sermons.length > 0 && (
          <View style={[styles.section, { marginBottom: 32 }]}> 
            <View style={styles.sectionHead}>
              <Text style={styles.sectionTitle}>Latest sermons</Text>
              <Text style={styles.sectionMeta}>Recent teaching</Text>
            </View>
            {sermons.map((s, i) => (
              <TouchableOpacity key={s.id} style={[styles.serCard, i === 0 && styles.serCardFeatured]} onPress={() => router.push(`/sermon/${s.id}` as any)} activeOpacity={0.88}>
                <View style={[styles.serThumb, i === 0 && styles.serThumbFeatured]}>
                  {s.thumbnail_url
                    ? <Image source={{ uri: s.thumbnail_url }} style={styles.serThumbImg} />
                    : <Text style={styles.serThumbIcon}>🎙</Text>}
                </View>
                <View style={styles.serInfo}>
                  <Text style={styles.serTitle} numberOfLines={i === 0 ? 2 : 1}>{s.title}</Text>
                  <Text style={styles.serPastor}>{s.pastor_name}{s.duration_seconds ? ` · ${Math.round(s.duration_seconds / 60)} min` : ''}</Text>
                  {s.scripture_reference ? <Text style={styles.serScripture}>{s.scripture_reference}</Text> : null}
                </View>
                <View style={styles.serPlay}><Text style={styles.serPlayIcon}>▶</Text></View>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function evPillColor(cat?: string) {
  const map: Record<string, string> = {
    service: '#ede7f6',
    youth: '#f5eef8',
    outreach: '#fce4ec',
    prayer: '#e3f2fd',
    conference: '#fff3e0',
  };
  return map[cat || ''] || Colors.primaryLight;
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.bg },
  loadingLogo: { width: 88, height: 88, borderRadius: 24, backgroundColor: Colors.card, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: Colors.border, ...Shadow.sm },

  topBar: {
    marginHorizontal: 16,
    marginTop: 14,
    marginBottom: 10,
    borderRadius: Radius.lg,
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    ...Shadow.sm,
  },
  topTextWrap: {
    flex: 1,
    paddingRight: 10,
  },
  topGreeting: { fontSize: 12, color: Colors.text3, fontWeight: '600' },
  topChurchMain: { fontSize: 13, fontWeight: '900', color: Colors.text, letterSpacing: -0.1, marginTop: 3 },
  topLogoWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: Colors.card,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  topLogo: { width: 34, height: 34 },

  hero: {
    marginHorizontal: 16,
    marginTop: 6,
    borderRadius: Radius.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.borderLight,
    ...Shadow.md,
  },
  heroImgWrap: { height: 210, position: 'relative' },
  heroImg: { width: '100%', height: '100%' },
  heroImgFallback: { width: '100%', height: '100%', backgroundColor: Colors.primaryDark },
  heroGradient: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(42,17,51,0.56)' },
  heroBody: { backgroundColor: Colors.primaryDeep, padding: 16 },
  heroPill: { backgroundColor: Colors.gold, alignSelf: 'flex-start', borderRadius: Radius.full, paddingHorizontal: 10, paddingVertical: 4, marginBottom: 8 },
  heroPillText: { color: Colors.primaryDeep, fontSize: 9, fontWeight: '800', letterSpacing: 1 },
  heroTitle: { fontSize: 21, fontWeight: '800', color: '#fff', lineHeight: 27, letterSpacing: -0.4 },
  heroSub: { fontSize: 13, color: 'rgba(255,255,255,0.76)', marginTop: 5, lineHeight: 18 },
  heroFallback: { marginHorizontal: 16, marginTop: 8, borderRadius: Radius.lg, backgroundColor: Colors.primary, padding: 28, alignItems: 'center', ...Shadow.md },
  heroFallbackCross: { fontSize: 36, color: 'rgba(255,255,255,0.42)', marginBottom: 10 },
  heroFallbackTitle: { fontSize: 18, fontWeight: '800', color: '#fff', textAlign: 'center', letterSpacing: -0.3 },
  heroFallbackSub: { fontSize: 13, color: 'rgba(255,255,255,0.74)', textAlign: 'center', marginTop: 6 },

  section: { paddingHorizontal: 16, marginTop: 24 },
  sectionHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 12 },
  sectionTitle: { fontSize: 15, fontWeight: '800', color: Colors.text, letterSpacing: -0.2 },
  sectionMeta: { fontSize: 11, color: Colors.text3, fontWeight: '600' },

  annCard: {
    backgroundColor: Colors.card,
    borderRadius: Radius.md,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    gap: 12,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    ...Shadow.xs,
  },
  annIconWrap: { width: 48, height: 48, borderRadius: Radius.sm, backgroundColor: Colors.primaryLight, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  annImage: { width: 48, height: 48 },
  annIcon: { fontSize: 22 },
  annBody: { flex: 1 },
  annTitle: { fontSize: 13, fontWeight: '700', color: Colors.text, marginBottom: 3 },
  annContent: { fontSize: 12, color: Colors.text2, lineHeight: 17 },
  annDate: { fontSize: 10, color: Colors.primary, marginTop: 5, fontWeight: '700' },

  songCard: {
    backgroundColor: Colors.card,
    borderRadius: Radius.md,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    gap: 10,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    ...Shadow.xs,
  },
  songThumb: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primaryLight,
  },
  songThumbIcon: { fontSize: 20, color: Colors.primary },
  songTitle: { fontSize: 13, fontWeight: '700', color: Colors.text },
  songArtist: { marginTop: 2, fontSize: 11, color: Colors.text3 },
  songPlay: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
  },
  songPlayActive: { backgroundColor: Colors.primaryDark },
  songPlayText: { color: '#fff', fontSize: 12, fontWeight: '800' },
  emptySongCard: {
    backgroundColor: Colors.card,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    padding: 14,
  },
  emptySongTitle: { fontSize: 13, fontWeight: '700', color: Colors.text },
  emptySongSub: { marginTop: 4, fontSize: 12, color: Colors.text2 },

  evCard: {
    width: 168,
    marginRight: 10,
    backgroundColor: Colors.card,
    borderRadius: Radius.md,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.borderLight,
    ...Shadow.sm,
  },
  evDateBlock: { backgroundColor: Colors.primary, paddingVertical: 10, alignItems: 'center' },
  evDay: { fontSize: 9, fontWeight: '800', color: 'rgba(255,255,255,0.74)', letterSpacing: 1 },
  evNum: { fontSize: 26, fontWeight: '800', color: '#fff', lineHeight: 30 },
  evBody: { padding: 10 },
  evTitle: { fontSize: 12, fontWeight: '700', color: Colors.text, lineHeight: 17, marginBottom: 5 },
  evLoc: { fontSize: 10, color: Colors.text3, marginBottom: 8 },
  evCatPill: { alignSelf: 'flex-start', borderRadius: Radius.full, paddingHorizontal: 8, paddingVertical: 3 },
  evCatText: { fontSize: 10, fontWeight: '700', color: Colors.primaryDark, textTransform: 'capitalize' },

  serCard: {
    backgroundColor: Colors.card,
    borderRadius: Radius.md,
    padding: 12,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    ...Shadow.xs,
  },
  serCardFeatured: { borderColor: Colors.primary, borderWidth: 1.5 },
  serThumb: { width: 52, height: 52, borderRadius: Radius.sm, backgroundColor: Colors.primaryLight, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  serThumbFeatured: { width: 60, height: 60 },
  serThumbImg: { width: '100%', height: '100%' },
  serThumbIcon: { fontSize: 24 },
  serInfo: { flex: 1 },
  serTitle: { fontSize: 13, fontWeight: '700', color: Colors.text, lineHeight: 18 },
  serPastor: { fontSize: 11, color: Colors.text3, marginTop: 2 },
  serScripture: { fontSize: 11, color: Colors.primary, marginTop: 3, fontWeight: '700' },
  serPlay: { width: 36, height: 36, borderRadius: 18, backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center' },
  serPlayIcon: { color: '#fff', fontSize: 13 },
});
