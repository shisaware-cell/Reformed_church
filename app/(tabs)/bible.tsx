import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Share, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, Radius, Shadow } from '@/lib/theme';

type BibleBook = { name: string; chapters: number };
type Verse = { number: number; text: string };

const KJV_BOOKS: BibleBook[] = [
  { name: 'Genesis', chapters: 50 }, { name: 'Exodus', chapters: 40 }, { name: 'Leviticus', chapters: 27 },
  { name: 'Numbers', chapters: 36 }, { name: 'Deuteronomy', chapters: 34 }, { name: 'Joshua', chapters: 24 },
  { name: 'Judges', chapters: 21 }, { name: 'Ruth', chapters: 4 }, { name: '1 Samuel', chapters: 31 },
  { name: '2 Samuel', chapters: 24 }, { name: '1 Kings', chapters: 22 }, { name: '2 Kings', chapters: 25 },
  { name: '1 Chronicles', chapters: 29 }, { name: '2 Chronicles', chapters: 36 }, { name: 'Ezra', chapters: 10 },
  { name: 'Nehemiah', chapters: 13 }, { name: 'Esther', chapters: 10 }, { name: 'Job', chapters: 42 },
  { name: 'Psalms', chapters: 150 }, { name: 'Proverbs', chapters: 31 }, { name: 'Ecclesiastes', chapters: 12 },
  { name: 'Song of Solomon', chapters: 8 }, { name: 'Isaiah', chapters: 66 }, { name: 'Jeremiah', chapters: 52 },
  { name: 'Lamentations', chapters: 5 }, { name: 'Ezekiel', chapters: 48 }, { name: 'Daniel', chapters: 12 },
  { name: 'Hosea', chapters: 14 }, { name: 'Joel', chapters: 3 }, { name: 'Amos', chapters: 9 },
  { name: 'Obadiah', chapters: 1 }, { name: 'Jonah', chapters: 4 }, { name: 'Micah', chapters: 7 },
  { name: 'Nahum', chapters: 3 }, { name: 'Habakkuk', chapters: 3 }, { name: 'Zephaniah', chapters: 3 },
  { name: 'Haggai', chapters: 2 }, { name: 'Zechariah', chapters: 14 }, { name: 'Malachi', chapters: 4 },
  { name: 'Matthew', chapters: 28 }, { name: 'Mark', chapters: 16 }, { name: 'Luke', chapters: 24 },
  { name: 'John', chapters: 21 }, { name: 'Acts', chapters: 28 }, { name: 'Romans', chapters: 16 },
  { name: '1 Corinthians', chapters: 16 }, { name: '2 Corinthians', chapters: 13 }, { name: 'Galatians', chapters: 6 },
  { name: 'Ephesians', chapters: 6 }, { name: 'Philippians', chapters: 4 }, { name: 'Colossians', chapters: 4 },
  { name: '1 Thessalonians', chapters: 5 }, { name: '2 Thessalonians', chapters: 3 }, { name: '1 Timothy', chapters: 6 },
  { name: '2 Timothy', chapters: 4 }, { name: 'Titus', chapters: 3 }, { name: 'Philemon', chapters: 1 },
  { name: 'Hebrews', chapters: 13 }, { name: 'James', chapters: 5 }, { name: '1 Peter', chapters: 5 },
  { name: '2 Peter', chapters: 3 }, { name: '1 John', chapters: 5 }, { name: '2 John', chapters: 1 },
  { name: '3 John', chapters: 1 }, { name: 'Jude', chapters: 1 }, { name: 'Revelation', chapters: 22 },
];

export default function BibleScreen() {
  const [book, setBook] = useState<BibleBook>(KJV_BOOKS[0]);
  const [chapter, setChapter] = useState(1);
  const [verses, setVerses] = useState<Verse[]>([]);
  const [reference, setReference] = useState('Genesis 1');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedVerseNumbers, setSelectedVerseNumbers] = useState<number[]>([]);

  useEffect(() => {
    loadChapter(book.name, chapter);
  }, [book.name, chapter]);

  const selectedText = useMemo(() => {
    const chosen = verses.filter((v) => selectedVerseNumbers.includes(v.number));
    if (!chosen.length) return '';
    return chosen.map((v) => `${v.number}. ${v.text.trim()}`).join('\n');
  }, [selectedVerseNumbers, verses]);

  async function loadChapter(bookName: string, chapterNumber: number) {
    setLoading(true);
    setError(null);
    setSelectedVerseNumbers([]);
    try {
      const query = encodeURIComponent(`${bookName} ${chapterNumber}`);
      const response = await fetch(`https://bible-api.com/${query}?translation=kjv`);
      if (!response.ok) throw new Error('Could not load chapter from Bible API.');
      const payload = await response.json();
      const fetchedVerses: Verse[] = (payload.verses || []).map((v: any) => ({
        number: v.verse,
        text: v.text || '',
      }));
      if (!fetchedVerses.length) throw new Error('No verses returned for this chapter.');
      setVerses(fetchedVerses);
      setReference(payload.reference || `${bookName} ${chapterNumber}`);
    } catch (e: any) {
      setVerses([]);
      setError(e?.message || 'Could not load chapter.');
    } finally {
      setLoading(false);
    }
  }

  function goPrevChapter() {
    if (chapter > 1) setChapter((c) => c - 1);
  }

  function goNextChapter() {
    if (chapter < book.chapters) setChapter((c) => c + 1);
  }

  function selectBook(nextBook: BibleBook) {
    setBook(nextBook);
    setChapter(1);
  }

  function toggleVerse(number: number) {
    setSelectedVerseNumbers((prev) =>
      prev.includes(number) ? prev.filter((n) => n !== number) : [...prev, number]
    );
  }

  async function shareSelection() {
    if (!selectedText) return;
    await Share.share({
      message: `${reference} (KJV)\n\n${selectedText}\n\nShared from Reformed Church of John the Baptist`,
    });
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Bible (KJV)</Text>
        <Text style={styles.subtitle}>Read the Old King James Version and select verses to share.</Text>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.bookRow}>
        {KJV_BOOKS.map((b) => {
          const active = b.name === book.name;
          return (
            <TouchableOpacity key={b.name} style={[styles.bookChip, active && styles.bookChipActive]} onPress={() => selectBook(b)}>
              <Text style={[styles.bookChipText, active && styles.bookChipTextActive]}>{b.name}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <View style={styles.chapterBar}>
        <TouchableOpacity style={styles.chapterBtn} onPress={goPrevChapter} disabled={chapter <= 1}>
          <Text style={[styles.chapterBtnText, chapter <= 1 && styles.chapterBtnTextDisabled]}>◀</Text>
        </TouchableOpacity>
        <Text style={styles.chapterLabel}>{reference}</Text>
        <TouchableOpacity style={styles.chapterBtn} onPress={goNextChapter} disabled={chapter >= book.chapters}>
          <Text style={[styles.chapterBtnText, chapter >= book.chapters && styles.chapterBtnTextDisabled]}>▶</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.selectionBar}>
        <Text style={styles.selectionText}>Selected verses: {selectedVerseNumbers.length}</Text>
        <TouchableOpacity style={[styles.shareBtn, !selectedVerseNumbers.length && styles.shareBtnDisabled]} onPress={shareSelection} disabled={!selectedVerseNumbers.length}>
          <Text style={styles.shareBtnText}>Share selection</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.list} contentContainerStyle={styles.listContent}>
        {loading ? (
          <View style={styles.centerBox}>
            <ActivityIndicator color={Colors.primary} />
            <Text style={styles.helperText}>Loading chapter...</Text>
          </View>
        ) : error ? (
          <View style={styles.centerBox}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : (
          verses.map((v) => {
            const active = selectedVerseNumbers.includes(v.number);
            return (
              <TouchableOpacity key={`${reference}-${v.number}`} style={[styles.verseCard, active && styles.verseCardActive]} onPress={() => toggleVerse(v.number)}>
                <Text style={[styles.verseNo, active && styles.verseNoActive]}>{v.number}</Text>
                <Text style={[styles.verseText, active && styles.verseTextActive]}>{v.text.trim()}</Text>
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bg },
  header: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8 },
  title: { fontSize: 22, fontWeight: '700', color: Colors.text },
  subtitle: { fontSize: 13, color: Colors.text2, marginTop: 3 },
  bookRow: { paddingHorizontal: 12, gap: 8, paddingBottom: 8 },
  bookChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.card,
  },
  bookChipActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  bookChipText: { fontSize: 12, color: Colors.text2, fontWeight: '600' },
  bookChipTextActive: { color: Colors.white },
  chapterBar: {
    marginHorizontal: 16,
    backgroundColor: Colors.card,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  chapterBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primaryLight,
  },
  chapterBtnText: { color: Colors.primary, fontWeight: '700', fontSize: 14 },
  chapterBtnTextDisabled: { opacity: 0.4 },
  chapterLabel: { fontSize: 14, fontWeight: '700', color: Colors.text },
  selectionBar: {
    marginHorizontal: 16,
    marginTop: 10,
    marginBottom: 8,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  selectionText: { fontSize: 12, color: Colors.text2, fontWeight: '600' },
  shareBtn: {
    backgroundColor: Colors.primary,
    borderRadius: Radius.sm,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  shareBtnDisabled: { opacity: 0.4 },
  shareBtnText: { color: Colors.white, fontSize: 12, fontWeight: '700' },
  list: { flex: 1 },
  listContent: { paddingHorizontal: 14, paddingBottom: 24 },
  verseCard: {
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    padding: 12,
    marginBottom: 8,
    flexDirection: 'row',
    gap: 10,
    ...Shadow.sm,
  },
  verseCardActive: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primaryLight,
  },
  verseNo: {
    minWidth: 24,
    fontSize: 12,
    fontWeight: '700',
    color: Colors.primary,
    marginTop: 2,
  },
  verseNoActive: { color: Colors.primaryDark },
  verseText: { flex: 1, fontSize: 14, lineHeight: 22, color: Colors.text },
  verseTextActive: { color: Colors.primaryDeep },
  centerBox: { alignItems: 'center', justifyContent: 'center', paddingVertical: 42 },
  helperText: { marginTop: 8, color: Colors.text2, fontSize: 13 },
  errorText: { color: Colors.danger, fontSize: 13, textAlign: 'center', paddingHorizontal: 16 },
});
