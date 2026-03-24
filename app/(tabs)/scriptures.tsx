import { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, TextInput, Share, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Colors, Radius, Shadow } from '@/lib/theme';

const VERSES = [
  { ref: 'John 3:16', text: 'For God so loved the world that he gave his one and only Son, that whoever believes in him shall not perish but have eternal life.' },
  { ref: 'Jeremiah 29:11', text: '"For I know the plans I have for you," declares the Lord, "plans to prosper you and not to harm you, plans to give you hope and a future."' },
  { ref: 'Philippians 4:13', text: 'I can do all this through him who gives me strength.' },
  { ref: 'Romans 8:28', text: 'And we know that in all things God works for the good of those who love him, who have been called according to his purpose.' },
  { ref: 'Psalm 23:1', text: 'The Lord is my shepherd, I lack nothing.' },
  { ref: 'Proverbs 3:5-6', text: 'Trust in the Lord with all your heart and lean not on your own understanding; in all your ways submit to him, and he will make your paths straight.' },
  { ref: 'Isaiah 40:31', text: 'But those who hope in the Lord will renew their strength. They will soar on wings like eagles; they will run and not grow weary, they will walk and not be faint.' },
  { ref: 'Matthew 6:33', text: 'But seek first his kingdom and his righteousness, and all these things will be given to you as well.' },
  { ref: 'Joshua 1:9', text: 'Have I not commanded you? Be strong and courageous. Do not be afraid; do not be discouraged, for the Lord your God will be with you wherever you go.' },
  { ref: '2 Timothy 1:7', text: 'For the Spirit God gave us does not make us timid, but gives us power, love and self-discipline.' },
  { ref: 'Psalm 46:10', text: 'He says, "Be still, and know that I am God; I will be exalted among the nations, I will be exalted in the earth."' },
  { ref: 'Ephesians 2:8-9', text: 'For it is by grace you have been saved, through faith — and this is not from yourselves, it is the gift of God — not by works, so that no one can boast.' },
];

const BOOKS = [
  { name: 'Genesis', chapters: 50, t: 'OT' }, { name: 'Psalms', chapters: 150, t: 'OT' },
  { name: 'Proverbs', chapters: 31, t: 'OT' }, { name: 'Isaiah', chapters: 66, t: 'OT' },
  { name: 'Matthew', chapters: 28, t: 'NT' }, { name: 'John', chapters: 21, t: 'NT' },
  { name: 'Romans', chapters: 16, t: 'NT' }, { name: 'Philippians', chapters: 4, t: 'NT' },
  { name: '1 Corinthians', chapters: 16, t: 'NT' }, { name: 'Ephesians', chapters: 6, t: 'NT' },
  { name: 'Hebrews', chapters: 13, t: 'NT' }, { name: 'James', chapters: 5, t: 'NT' },
  { name: 'Revelation', chapters: 22, t: 'NT' },
];

const HOURLY_VERSE_CACHE_KEY = 'hourly_verse_cache_v1';
const HOURLY_MS = 60 * 60 * 1000;
const HOURLY_LIST_SIZE = 8;
const HOURLY_REFERENCES = [
  'John 3:16',
  'Jeremiah 29:11',
  'Philippians 4:13',
  'Romans 8:28',
  'Psalm 23:1',
  'Proverbs 3:5-6',
  'Isaiah 40:31',
  'Matthew 6:33',
  'Joshua 1:9',
  '2 Timothy 1:7',
  'Psalm 46:10',
  'Ephesians 2:8-9',
  'Psalm 27:1',
  'Hebrews 11:1',
  'Romans 12:2',
];

type HourlyVerse = {
  ref: string;
  text: string;
};

type ScriptureCache = {
  fetchedAt: number;
  top: HourlyVerse;
  list: HourlyVerse[];
};

export default function ScripturesScreen() {
  const [activeTab, setActiveTab] = useState<'featured' | 'saved' | 'books'>('featured');
  const [search, setSearch] = useState('');
  const [saved, setSaved] = useState<string[]>([]);
  const [testament, setTestament] = useState<'ALL' | 'OT' | 'NT'>('ALL');
  const [hourlyVerse, setHourlyVerse] = useState<HourlyVerse | null>(null);
  const [hourlyVerses, setHourlyVerses] = useState<HourlyVerse[]>([]);
  const [loadingHourlyVerse, setLoadingHourlyVerse] = useState(true);

  const sourceVerses = hourlyVerses.length > 0 ? hourlyVerses : VERSES;
  const filteredVerses = sourceVerses.filter((v) => v.ref.toLowerCase().includes(search.toLowerCase()) || v.text.toLowerCase().includes(search.toLowerCase()));
  const filteredBooks = BOOKS.filter((b) => (testament === 'ALL' || b.t === testament) && b.name.toLowerCase().includes(search.toLowerCase()));
  const daily = VERSES[new Date().getDate() % VERSES.length];

  useEffect(() => {
    loadHourlyVerse();
  }, []);

  async function loadHourlyVerse(forceRefresh = false) {
    setLoadingHourlyVerse(true);
    try {
      const now = Date.now();
      const cached = await AsyncStorage.getItem(HOURLY_VERSE_CACHE_KEY);
      if (!forceRefresh && cached) {
        const parsed = JSON.parse(cached) as ScriptureCache;
        if (parsed?.top?.ref && parsed?.top?.text && parsed?.list?.length && now - parsed.fetchedAt < HOURLY_MS) {
          setHourlyVerse(parsed.top);
          setHourlyVerses(parsed.list);
          setLoadingHourlyVerse(false);
          return;
        }
      }

      const refs = [...HOURLY_REFERENCES]
        .sort(() => Math.random() - 0.5)
        .slice(0, HOURLY_LIST_SIZE + 1);

      const fetched = await Promise.all(
        refs.map(async (ref): Promise<HourlyVerse | null> => {
          const response = await fetch(`https://bible-api.com/${encodeURIComponent(ref)}?translation=kjv`);
          if (!response.ok) return null;
          const payload = await response.json();
          const text = (payload.text || '').trim();
          if (!text) return null;
          return { ref: payload.reference || ref, text };
        })
      );

      const usable = fetched.filter((v): v is HourlyVerse => !!v);
      if (!usable.length) throw new Error('Unable to fetch scripture right now');

      const top = usable[0];
      const list = usable.slice(1, HOURLY_LIST_SIZE + 1);
      const finalList = list.length ? list : VERSES.slice(0, HOURLY_LIST_SIZE);

      setHourlyVerse(top);
      setHourlyVerses(finalList);

      const cacheValue: ScriptureCache = {
        fetchedAt: now,
        top,
        list: finalList,
      };
      await AsyncStorage.setItem(HOURLY_VERSE_CACHE_KEY, JSON.stringify(cacheValue));
    } catch {
      setHourlyVerse({ ref: daily.ref, text: daily.text });
      setHourlyVerses(VERSES);
    } finally {
      setLoadingHourlyVerse(false);
    }
  }

  function toggleSave(ref: string) { setSaved((vs) => vs.includes(ref) ? vs.filter((v) => v !== ref) : [...vs, ref]); }
  async function shareVerse(v: { ref: string; text: string }) { await Share.share({ message: `"${v.text}"\n— ${v.ref}\n\nShared from Reformed Church of John the Baptist` }); }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Scriptures</Text>
        <View style={styles.searchWrap}>
          <Text style={styles.searchIcon}>⌕</Text>
          <TextInput style={styles.searchInput} placeholder="Search verses or books..." placeholderTextColor={Colors.text3} value={search} onChangeText={setSearch} />
          {search.length > 0 && <TouchableOpacity onPress={() => setSearch('')}><Text style={{ color: Colors.text3 }}>✕</Text></TouchableOpacity>}
        </View>
      </View>
      <View style={styles.tabs}>
        {(['featured', 'saved', 'books'] as const).map((t) => (
          <TouchableOpacity key={t} style={[styles.tab, activeTab === t && styles.tabActive]} onPress={() => setActiveTab(t)}>
            <Text style={[styles.tabText, activeTab === t && styles.tabTextActive]}>{t === 'featured' ? 'Featured' : t === 'saved' ? `Saved (${saved.length})` : 'Books'}</Text>
          </TouchableOpacity>
        ))}
      </View>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        {activeTab === 'featured' && (
          <>
            <View style={styles.dailyVerse}>
              <Text style={styles.dailyLabel}>Hourly verse</Text>
              {loadingHourlyVerse ? (
                <View style={styles.hourlyLoading}>
                  <ActivityIndicator color="#fff" />
                  <Text style={styles.hourlyLoadingText}>Loading scripture...</Text>
                </View>
              ) : (
                <>
                  <Text style={styles.dailyText}>"{hourlyVerse?.text || daily.text}"</Text>
                  <Text style={styles.dailyRef}>{hourlyVerse?.ref || daily.ref}</Text>
                  <View style={styles.hourlyActions}>
                    <TouchableOpacity style={styles.dailyBtn} onPress={() => shareVerse({ ref: hourlyVerse?.ref || daily.ref, text: hourlyVerse?.text || daily.text })}><Text style={styles.dailyBtnText}>Share</Text></TouchableOpacity>
                    <TouchableOpacity style={styles.dailyBtn} onPress={() => loadHourlyVerse(true)}><Text style={styles.dailyBtnText}>Refresh</Text></TouchableOpacity>
                  </View>
                </>
              )}
            </View>
            <Text style={styles.sectionTitle}>Hourly scriptures</Text>
            {filteredVerses.map((v) => (
              <View key={v.ref} style={styles.verseCard}>
                <View style={styles.verseCardTop}>
                  <Text style={styles.verseRef}>{v.ref}</Text>
                  <View style={{ flexDirection: 'row', gap: 12 }}>
                    <TouchableOpacity onPress={() => toggleSave(v.ref)}><Text style={[styles.verseActionIcon, saved.includes(v.ref) && { color: Colors.primary }]}>{saved.includes(v.ref) ? '♥' : '♡'}</Text></TouchableOpacity>
                    <TouchableOpacity onPress={() => shareVerse(v)}><Text style={styles.verseActionIcon}>↑</Text></TouchableOpacity>
                  </View>
                </View>
                <Text style={styles.verseText}>{v.text}</Text>
              </View>
            ))}
          </>
        )}
        {activeTab === 'saved' && (
          saved.length === 0
            ? <View style={styles.empty}><Text style={styles.emptyIcon}>♡</Text><Text style={styles.emptyTitle}>No saved verses</Text><Text style={styles.emptySub}>Tap the heart on any verse to save it</Text></View>
            : sourceVerses.filter((v) => saved.includes(v.ref)).map((v) => (
              <View key={v.ref} style={styles.verseCard}>
                <View style={styles.verseCardTop}>
                  <Text style={styles.verseRef}>{v.ref}</Text>
                  <View style={{ flexDirection: 'row', gap: 12 }}>
                    <TouchableOpacity onPress={() => toggleSave(v.ref)}><Text style={[styles.verseActionIcon, { color: Colors.primary }]}>♥</Text></TouchableOpacity>
                    <TouchableOpacity onPress={() => shareVerse(v)}><Text style={styles.verseActionIcon}>↑</Text></TouchableOpacity>
                  </View>
                </View>
                <Text style={styles.verseText}>{v.text}</Text>
              </View>
            ))
        )}
        {activeTab === 'books' && (
          <>
            <View style={styles.testamentFilter}>
              {(['ALL', 'OT', 'NT'] as const).map((t) => (
                <TouchableOpacity key={t} style={[styles.filterChip, testament === t && styles.filterChipActive]} onPress={() => setTestament(t)}>
                  <Text style={[styles.filterChipText, testament === t && styles.filterChipTextActive]}>{t === 'ALL' ? 'All' : t === 'OT' ? 'Old Testament' : 'New Testament'}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <View style={styles.booksGrid}>
              {filteredBooks.map((b) => (
                <View key={b.name} style={[styles.bookCard, b.t === 'NT' ? styles.bookCardNT : styles.bookCardOT]}>
                  <Text style={styles.bookName}>{b.name}</Text>
                  <Text style={styles.bookChapters}>{b.chapters} ch.</Text>
                </View>
              ))}
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bg },
  header: { backgroundColor: Colors.card, paddingHorizontal: 16, paddingTop: 14, paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: Colors.border },
  headerTitle: { fontSize: 20, fontWeight: '600', color: Colors.text, marginBottom: 10 },
  searchWrap: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.bg, borderRadius: Radius.sm, paddingHorizontal: 10, borderWidth: 1, borderColor: Colors.border },
  searchIcon: { fontSize: 16, color: Colors.text3, marginRight: 6 },
  searchInput: { flex: 1, fontSize: 14, color: Colors.text, paddingVertical: 9 },
  tabs: { flexDirection: 'row', backgroundColor: Colors.card, borderBottomWidth: 1, borderBottomColor: Colors.border },
  tab: { flex: 1, paddingVertical: 11, alignItems: 'center', borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabActive: { borderBottomColor: Colors.primary },
  tabText: { fontSize: 13, color: Colors.text3, fontWeight: '500' },
  tabTextActive: { color: Colors.primary },
  content: { padding: 14, paddingBottom: 32 },
  dailyVerse: { backgroundColor: Colors.primary, borderRadius: Radius.lg, padding: 20, marginBottom: 20 },
  dailyLabel: { fontSize: 10, fontWeight: '600', color: 'rgba(255,255,255,0.7)', letterSpacing: 1, marginBottom: 8, textTransform: 'uppercase' },
  dailyText: { fontSize: 15, color: '#fff', fontStyle: 'italic', lineHeight: 24, marginBottom: 8 },
  dailyRef: { fontSize: 12, fontWeight: '600', color: 'rgba(255,255,255,0.85)', marginBottom: 14 },
  dailyBtn: { backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 8, paddingHorizontal: 14, paddingVertical: 6, alignSelf: 'flex-start' },
  dailyBtnText: { color: '#fff', fontSize: 12, fontWeight: '500' },
  hourlyLoading: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  hourlyLoadingText: { color: 'rgba(255,255,255,0.85)', fontSize: 13 },
  hourlyActions: { flexDirection: 'row', gap: 8 },
  sectionTitle: { fontSize: 14, fontWeight: '600', color: Colors.text, marginBottom: 10 },
  verseCard: { backgroundColor: Colors.card, borderRadius: Radius.md, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: Colors.border, ...Shadow.sm },
  verseCardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  verseRef: { fontSize: 13, fontWeight: '600', color: Colors.primary },
  verseActionIcon: { fontSize: 18, color: Colors.text3 },
  verseText: { fontSize: 14, color: Colors.text, lineHeight: 22, fontStyle: 'italic' },
  testamentFilter: { flexDirection: 'row', gap: 8, marginBottom: 14, flexWrap: 'wrap' },
  filterChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, backgroundColor: Colors.card, borderWidth: 1, borderColor: Colors.border },
  filterChipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  filterChipText: { fontSize: 12, color: Colors.text2, fontWeight: '500' },
  filterChipTextActive: { color: '#fff' },
  booksGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  bookCard: { width: '31%', borderRadius: Radius.sm, padding: 10, alignItems: 'center', borderWidth: 1 },
  bookCardOT: { backgroundColor: '#E1F5EE', borderColor: '#9FE1CB' },
  bookCardNT: { backgroundColor: Colors.accentLight, borderColor: '#CECBF6' },
  bookName: { fontSize: 12, fontWeight: '600', color: Colors.text, textAlign: 'center' },
  bookChapters: { fontSize: 10, color: Colors.text3, marginTop: 3 },
  empty: { alignItems: 'center', paddingVertical: 60 },
  emptyIcon: { fontSize: 48, marginBottom: 12, color: Colors.text3 },
  emptyTitle: { fontSize: 16, fontWeight: '600', color: Colors.text, marginBottom: 6 },
  emptySub: { fontSize: 13, color: Colors.text3, textAlign: 'center' },
});
