import { useEffect, useState, useRef } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, Share, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '@/lib/supabase';
import { Colors, Radius } from '@/lib/theme';
import type { Note } from '@/lib/types';

export default function NoteDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const noteId = Array.isArray(id) ? id[0] : id;
  const [note, setNote] = useState<Note | null>(null);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [scripture, setScripture] = useState('');
  const [loading, setLoading] = useState(true);
  const [saved, setSaved] = useState(true);
  const [saveError, setSaveError] = useState<string | null>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!noteId) {
      setLoading(false);
      Alert.alert('Note not found', 'This note could not be opened.');
      return;
    }
    supabase.from('notes').select('*, sermons(title, pastor_name)').eq('id', noteId).single().then(({ data, error }) => {
      if (error) {
        Alert.alert('Unable to load note', error.message);
      }
      if (data) { setNote(data); setTitle(data.title); setBody(data.body || ''); setScripture(data.scripture_reference || ''); }
      setLoading(false);
    });

    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, [noteId]);

  function autoSave(newTitle: string, newBody: string, newScripture: string) {
    if (!noteId) return;
    setSaved(false);
    setSaveError(null);
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      const { error } = await supabase
        .from('notes')
        .update({ title: newTitle || 'Untitled note', body: newBody, scripture_reference: newScripture || null, updated_at: new Date().toISOString() })
        .eq('id', noteId);
      if (error) {
        setSaved(false);
        setSaveError(error.message);
        return;
      }
      setSaved(true);
      setSaveError(null);
    }, 800);
  }

  function handleTitleChange(t: string) { setTitle(t); autoSave(t, body, scripture); }
  function handleBodyChange(b: string) { setBody(b); autoSave(title, b, scripture); }
  function handleScriptureChange(s: string) { setScripture(s); autoSave(title, body, s); }

  async function shareNote() {
    await Share.share({ message: `${title}\n\n${body}${scripture ? `\n\nScripture: ${scripture}` : ''}\n\nShared from Reformed Church of John the Baptist` });
  }

  if (loading) return <View style={styles.center}><ActivityIndicator color={Colors.primary} /></View>;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.toolbar}>
          <TouchableOpacity onPress={() => router.back()} style={styles.toolbarBtn}><Text style={styles.toolbarBtnText}>← Done</Text></TouchableOpacity>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <View style={[{ width: 8, height: 8, borderRadius: 4 }, { backgroundColor: saveError ? Colors.danger : saved ? Colors.primary : Colors.gold }]} />
            <Text style={{ fontSize: 12, color: saveError ? Colors.danger : Colors.text3 }}>
              {saveError ? 'Save failed' : saved ? 'Saved' : 'Saving...'}
            </Text>
          </View>
          <TouchableOpacity onPress={shareNote} style={styles.toolbarBtn}><Text style={styles.toolbarBtnText}>Share ↑</Text></TouchableOpacity>
        </View>
        {saveError ? <Text style={styles.saveErrorText}>{saveError}</Text> : null}
        <ScrollView style={styles.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          {note?.sermons && <View style={styles.sermonTag}><Text style={styles.sermonTagText}>🎙 {note.sermons.title}</Text></View>}
          <Text style={styles.date}>{note?.created_at ? new Date(note.created_at).toLocaleDateString('en-ZA', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) : ''}</Text>
          <TextInput style={styles.titleInput} value={title} onChangeText={handleTitleChange} placeholder="Note title..." placeholderTextColor={Colors.text3} multiline />
          <View style={styles.scriptureWrap}>
            <Text style={styles.scriptureIcon}>✞</Text>
            <TextInput style={styles.scriptureInput} value={scripture} onChangeText={handleScriptureChange} placeholder="Scripture reference (e.g. John 3:16)" placeholderTextColor={Colors.text3} />
          </View>
          <View style={styles.divider} />
          <TextInput style={styles.bodyInput} value={body} onChangeText={handleBodyChange} placeholder={"Start writing your note here...\n\n• Key points from the sermon\n• Personal reflections\n• Prayer points"} placeholderTextColor={Colors.text3} multiline textAlignVertical="top" />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.card },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  toolbar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: Colors.border, backgroundColor: Colors.card },
  toolbarBtn: { paddingVertical: 4 },
  toolbarBtnText: { fontSize: 14, color: Colors.primary, fontWeight: '500' },
  saveErrorText: { color: Colors.danger, fontSize: 12, paddingHorizontal: 16, paddingTop: 8 },
  scroll: { flex: 1, paddingHorizontal: 20 },
  sermonTag: { backgroundColor: Colors.primaryLight, borderRadius: Radius.sm, paddingHorizontal: 10, paddingVertical: 6, marginTop: 16, alignSelf: 'flex-start' },
  sermonTagText: { fontSize: 12, color: Colors.primaryDark, fontWeight: '500' },
  date: { fontSize: 12, color: Colors.text3, marginTop: 12, marginBottom: 6 },
  titleInput: { fontSize: 24, fontWeight: '700', color: Colors.text, lineHeight: 32, marginBottom: 10 },
  scriptureWrap: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: Colors.accentLight, borderRadius: Radius.sm, paddingHorizontal: 12, paddingVertical: 9, marginBottom: 16 },
  scriptureIcon: { fontSize: 16, color: Colors.accent },
  scriptureInput: { flex: 1, fontSize: 13, color: Colors.accent, fontWeight: '500' },
  divider: { height: 1, backgroundColor: Colors.border, marginBottom: 16 },
  bodyInput: { fontSize: 16, color: Colors.text, lineHeight: 26, minHeight: 400, paddingBottom: 60 },
});
