import { useCallback, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, TextInput, RefreshControl, ActivityIndicator, Alert } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '@/lib/supabase';
import { Colors, Radius, Shadow } from '@/lib/theme';
import type { Note } from '@/lib/types';

export default function NotesScreen() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [userId, setUserId] = useState<string | null>(null);

  async function load() {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) {
      setUserId(null);
      setNotes([]);
      setLoading(false);
      setRefreshing(false);
      return;
    }
    setUserId(session.user.id);
    const { data, error } = await supabase
      .from('notes')
      .select('*, sermons(title, pastor_name)')
      .eq('user_id', session.user.id)
      .order('updated_at', { ascending: false });
    if (error) {
      Alert.alert('Unable to load notes', error.message);
    }
    if (data) setNotes(data);
    setLoading(false); setRefreshing(false);
  }

  useFocusEffect(
    useCallback(() => {
      load();
    }, [])
  );

  async function createNote() {
    let uid = userId;
    if (!uid) {
      const { data: { session } } = await supabase.auth.getSession();
      uid = session?.user?.id || null;
      if (uid) setUserId(uid);
    }
    if (!uid) {
      Alert.alert('Not signed in', 'Please sign out and sign in again.');
      return;
    }
    const { data, error } = await supabase
      .from('notes')
      .insert({ user_id: uid, title: 'Untitled note', body: '' })
      .select()
      .single();
    if (error) {
      Alert.alert('Unable to create note', error.message);
      return;
    }
    if (data) router.push(`/note/${data.id}` as any);
  }

  async function deleteNote(id: string) {
    Alert.alert('Delete note', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => { await supabase.from('notes').delete().eq('id', id); setNotes((ns) => ns.filter((n) => n.id !== id)); } },
    ]);
  }

  const filtered = notes.filter((n) => n.title.toLowerCase().includes(search.toLowerCase()) || n.body.toLowerCase().includes(search.toLowerCase()));
  const formatDate = (d: string) => new Date(d).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' });

  if (loading) return <View style={styles.center}><ActivityIndicator color={Colors.primary} /></View>;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <View><Text style={styles.headerTitle}>My notes</Text><Text style={styles.headerSub}>{notes.length} note{notes.length !== 1 ? 's' : ''}</Text></View>
        <TouchableOpacity style={styles.newBtn} onPress={createNote}><Text style={styles.newBtnText}>+ New</Text></TouchableOpacity>
      </View>
      <View style={styles.searchWrap}>
        <Text style={styles.searchIcon}>⌕</Text>
        <TextInput style={styles.searchInput} placeholder="Search notes..." placeholderTextColor={Colors.text3} value={search} onChangeText={setSearch} />
        {search.length > 0 && <TouchableOpacity onPress={() => setSearch('')}><Text style={{ fontSize: 14, color: Colors.text3 }}>✕</Text></TouchableOpacity>}
      </View>
      <ScrollView showsVerticalScrollIndicator={false} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={Colors.primary} />} contentContainerStyle={styles.list}>
        {filtered.length === 0 && (
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>✎</Text>
            <Text style={styles.emptyTitle}>{search ? 'No notes found' : 'No notes yet'}</Text>
            <Text style={styles.emptySub}>{search ? 'Try a different search' : 'Tap "+ New" to write your first note'}</Text>
          </View>
        )}
        {filtered.map((note) => (
          <TouchableOpacity key={note.id} style={styles.noteCard} onPress={() => router.push(`/note/${note.id}` as any)} onLongPress={() => deleteNote(note.id)} activeOpacity={0.85}>
            <View style={styles.noteCardTop}>
              <View style={styles.noteIconWrap}><Text style={styles.noteIcon}>✎</Text></View>
              <View style={styles.noteInfo}>
                <Text style={styles.noteTitle} numberOfLines={1}>{note.title}</Text>
                <Text style={styles.notePreview} numberOfLines={2}>{note.body || 'Empty note'}</Text>
              </View>
            </View>
            <View style={styles.noteMeta}>
              {note.sermons && <View style={styles.sermonTag}><Text style={styles.sermonTagText}>🎙 {note.sermons.title}</Text></View>}
              {note.scripture_reference && <View style={styles.scriptureTag}><Text style={styles.scriptureTagText}>✞ {note.scripture_reference}</Text></View>}
            </View>
            <Text style={styles.noteDate}>{formatDate(note.updated_at)}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, backgroundColor: Colors.card, borderBottomWidth: 1, borderBottomColor: Colors.border },
  headerTitle: { fontSize: 20, fontWeight: '600', color: Colors.text },
  headerSub: { fontSize: 12, color: Colors.text3, marginTop: 2 },
  newBtn: { backgroundColor: Colors.primary, borderRadius: Radius.sm, paddingHorizontal: 14, paddingVertical: 7 },
  newBtnText: { color: '#fff', fontWeight: '600', fontSize: 13 },
  searchWrap: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.card, marginHorizontal: 14, marginVertical: 10, borderRadius: Radius.sm, paddingHorizontal: 12, borderWidth: 1, borderColor: Colors.border },
  searchIcon: { fontSize: 16, color: Colors.text3, marginRight: 6 },
  searchInput: { flex: 1, fontSize: 14, color: Colors.text, paddingVertical: 10 },
  list: { padding: 14, paddingTop: 4, paddingBottom: 32 },
  noteCard: { backgroundColor: Colors.card, borderRadius: Radius.md, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: Colors.border, ...Shadow.sm },
  noteCardTop: { flexDirection: 'row', gap: 12, marginBottom: 8 },
  noteIconWrap: { width: 40, height: 40, borderRadius: 10, backgroundColor: Colors.primaryLight, alignItems: 'center', justifyContent: 'center' },
  noteIcon: { fontSize: 18, color: Colors.primary },
  noteInfo: { flex: 1 },
  noteTitle: { fontSize: 14, fontWeight: '600', color: Colors.text, marginBottom: 3 },
  notePreview: { fontSize: 13, color: Colors.text2, lineHeight: 18 },
  noteMeta: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 8 },
  sermonTag: { backgroundColor: Colors.primaryLight, borderRadius: 4, paddingHorizontal: 6, paddingVertical: 3 },
  sermonTagText: { fontSize: 10, color: Colors.primaryDark },
  scriptureTag: { backgroundColor: Colors.accentLight, borderRadius: 4, paddingHorizontal: 6, paddingVertical: 3 },
  scriptureTagText: { fontSize: 10, color: Colors.accent },
  noteDate: { fontSize: 10, color: Colors.text3 },
  empty: { alignItems: 'center', paddingVertical: 60 },
  emptyIcon: { fontSize: 48, marginBottom: 12, color: Colors.text3 },
  emptyTitle: { fontSize: 16, fontWeight: '600', color: Colors.text, marginBottom: 6 },
  emptySub: { fontSize: 13, color: Colors.text3, textAlign: 'center', lineHeight: 20 },
});
