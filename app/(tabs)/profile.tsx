import { useCallback, useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, TextInput, Alert, ActivityIndicator, Switch, Image } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { ensureUserProfile, supabase } from '@/lib/supabase';
import { guessImageContentType, guessImageExtension, uploadImageUriToStorage } from '@/lib/storage';
import { configureNotifications, loadNotificationPrefs, registerPushToken, saveNotificationPrefs } from '@/lib/notifications';
import { Colors, Radius, Shadow } from '@/lib/theme';
import type { User } from '@/lib/types';

export default function ProfileScreen() {
  const [user, setUser] = useState<User | null>(null);
  const [stats, setStats] = useState({ posts: 0, notes: 0, events: 0 });
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [notifEvents, setNotifEvents] = useState(true);
  const [notifArticles, setNotifArticles] = useState(true);
  const [notifAnnouncements, setNotifAnnouncements] = useState(true);

  async function load() {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) {
      setLoading(false);
      return;
    }

    const profile = await ensureUserProfile(session.user);
    if (profile) {
      setUser(profile);
      setEditName(profile.name || '');
    }

    const [postsR, notesR, eventsRGoing] = await Promise.all([
      supabase.from('posts').select('id', { count: 'exact', head: true }).eq('user_id', session.user.id),
      supabase.from('notes').select('id', { count: 'exact', head: true }).eq('user_id', session.user.id),
      supabase.from('event_rsvps').select('id', { count: 'exact', head: true }).eq('user_id', session.user.id).eq('status', 'going'),
    ]);
    let eventsCount = eventsRGoing.count || 0;
    if (eventsRGoing.error) {
      const { count } = await supabase.from('event_rsvps').select('id', { count: 'exact', head: true }).eq('user_id', session.user.id);
      eventsCount = count || 0;
    }
    setStats({ posts: postsR.count || 0, notes: notesR.count || 0, events: eventsCount });
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [])
  );

  useEffect(() => {
    if (!user?.id) return;

    let mounted = true;

    (async () => {
      configureNotifications();
      const prefs = await loadNotificationPrefs(user.id);
      if (!mounted) return;
      setNotifAnnouncements(prefs.announcements);
      setNotifEvents(prefs.events);
      setNotifArticles(prefs.articles);
      await registerPushToken(user.id);
    })();

    return () => {
      mounted = false;
    };
  }, [user?.id]);

  async function updateNotificationPrefs(next: { announcements?: boolean; events?: boolean; articles?: boolean }) {
    if (!user?.id) return;

    const prefs = {
      announcements: next.announcements ?? notifAnnouncements,
      events: next.events ?? notifEvents,
      articles: next.articles ?? notifArticles,
    };

    await saveNotificationPrefs(user.id, prefs);
  }

  async function saveProfile() {
    if (!user || !editName.trim()) return;
    setSaving(true);
    await supabase.from('users').update({ name: editName.trim() }).eq('id', user.id);
    setUser((u) => u ? { ...u, name: editName.trim() } : u);
    setEditing(false); setSaving(false);
  }

  async function uploadAvatar() {
    if (!user) return;
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) { Alert.alert('Permission needed', 'Allow photo access in Settings'); return; }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.7, allowsEditing: true, aspect: [1, 1] });
    if (result.canceled) return;
    setUploadingAvatar(true);
    try {
      const uri = result.assets[0].uri;
      const ext = guessImageExtension(uri);
      const path = `avatars/${user.id}/avatar_${Date.now()}.${ext}`;
      const url = await uploadImageUriToStorage({
        bucket: 'profile-images',
        path,
        uri,
        contentType: guessImageContentType(uri),
      });
      await supabase.from('users').update({ profile_image_url: url }).eq('id', user.id);
      setUser((u) => u ? { ...u, profile_image_url: url } : u);
    } catch (e: any) {
      Alert.alert('Upload failed', e.message || 'Try again');
    } finally { setUploadingAvatar(false); }
  }

  async function signOut() {
    Alert.alert('Sign out', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign out', style: 'destructive', onPress: async () => { await supabase.auth.signOut(); router.replace('/(auth)/login'); } },
    ]);
  }

  if (loading) return <View style={styles.center}><ActivityIndicator color={Colors.primary} /></View>;

  let memberSince = '';
  try { if (user?.created_at) memberSince = new Date(user.created_at).toLocaleDateString('en-ZA', { month: 'long', year: 'numeric' }); } catch {}

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false}>

        {/* Banner */}
        <View style={styles.banner}>
          <View style={styles.bannerPattern} />
          <TouchableOpacity onPress={uploadAvatar} style={styles.avatarWrap} disabled={uploadingAvatar}>
            {uploadingAvatar
              ? <View style={styles.avatar}><ActivityIndicator color="#fff" /></View>
              : user?.profile_image_url
                ? <Image source={{ uri: user.profile_image_url + '?v=' + Date.now() }} style={styles.avatarImg} />
                : <View style={styles.avatar}><Text style={styles.avatarInitial}>{(user?.name || user?.email || 'Member')[0]?.toUpperCase() || 'M'}</Text></View>}
            <View style={styles.avatarCam}><Text style={{ fontSize: 11 }}>📷</Text></View>
          </TouchableOpacity>

          {editing ? (
            <View style={styles.editRow}>
              <TextInput style={styles.nameInput} value={editName} onChangeText={setEditName} autoFocus selectTextOnFocus />
              <TouchableOpacity style={styles.savePill} onPress={saveProfile} disabled={saving}>
                {saving ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.savePillText}>Save</Text>}
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setEditing(false)}><Text style={styles.cancelText}>✕</Text></TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity style={styles.nameRow} onPress={() => setEditing(true)}>
              <Text style={styles.name}>{user?.name || user?.email?.split('@')[0] || 'Member'}</Text>
              <Text style={styles.nameEditIcon}>✎</Text>
            </TouchableOpacity>
          )}
          <Text style={styles.email}>{user?.email}</Text>
          <View style={styles.pillRow}>
            <View style={styles.pill}>
              <View style={styles.rolePillRow}>
                <MaterialCommunityIcons
                  name={user?.role === 'admin' ? 'shield-crown-outline' : 'account-circle-outline'}
                  size={14}
                  color="#fff"
                />
                <Text style={styles.pillText}>{user?.role === 'admin' ? 'Admin' : 'Member'}</Text>
              </View>
            </View>
            {memberSince ? <View style={styles.pill}><Text style={styles.pillText}>Since {memberSince}</Text></View> : null}
          </View>
        </View>

        {/* Stats */}
        <View style={styles.statsRow}>
          {[['Posts', stats.posts, '✍'], ['Notes', stats.notes, '✎'], ['Attending', stats.events, '📅']].map(([l, v, ic]) => (
            <View key={l as string} style={styles.statCard}>
              <Text style={styles.statIcon}>{ic}</Text>
              <Text style={styles.statNum}>{v}</Text>
              <Text style={styles.statLabel}>{l}</Text>
            </View>
          ))}
        </View>

        {/* Notifications */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Notifications</Text>
          <View style={styles.card}>
            <View style={[styles.row, styles.rowBorder]}>
              <Text style={styles.rowLabel}>Announcements</Text>
              <Switch
                value={notifAnnouncements}
                onValueChange={(value) => {
                  setNotifAnnouncements(value);
                  updateNotificationPrefs({ announcements: value });
                }}
                trackColor={{ false: Colors.border, true: Colors.primaryLight }}
                thumbColor={notifAnnouncements ? Colors.primary : Colors.text3}
              />
            </View>

            <View style={[styles.row, styles.rowBorder]}>
              <Text style={styles.rowLabel}>Event alerts</Text>
              <Switch
                value={notifEvents}
                onValueChange={(value) => {
                  setNotifEvents(value);
                  updateNotificationPrefs({ events: value });
                }}
                trackColor={{ false: Colors.border, true: Colors.primaryLight }}
                thumbColor={notifEvents ? Colors.primary : Colors.text3}
              />
            </View>

            <View style={styles.row}>
              <Text style={styles.rowLabel}>New articles</Text>
              <Switch
                value={notifArticles}
                onValueChange={(value) => {
                  setNotifArticles(value);
                  updateNotificationPrefs({ articles: value });
                }}
                trackColor={{ false: Colors.border, true: Colors.primaryLight }}
                thumbColor={notifArticles ? Colors.primary : Colors.text3}
              />
            </View>
          </View>
        </View>

        <View style={[styles.section, { marginBottom: 48 }]}>
          <TouchableOpacity style={styles.signOutBtn} onPress={signOut}>
            <Text style={styles.signOutText}>Sign out</Text>
          </TouchableOpacity>
          <Text style={styles.version}>Reformed Church of John the Baptist · v1.0.0</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  banner: { backgroundColor: Colors.primary, paddingTop: 28, paddingBottom: 28, alignItems: 'center', paddingHorizontal: 24, position: 'relative', overflow: 'hidden' },
  bannerPattern: { position: 'absolute', top: -40, right: -40, width: 160, height: 160, borderRadius: 80, backgroundColor: 'rgba(255,255,255,0.05)' },
  avatarWrap: { position: 'relative', marginBottom: 14 },
  avatarImg: { width: 90, height: 90, borderRadius: 45, borderWidth: 3, borderColor: 'rgba(255,255,255,0.6)' },
  avatar: { width: 90, height: 90, borderRadius: 45, backgroundColor: 'rgba(255,255,255,0.18)', alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: 'rgba(255,255,255,0.5)' },
  avatarInitial: { fontSize: 36, fontWeight: '800', color: '#fff' },
  avatarCam: { position: 'absolute', bottom: 2, right: 2, backgroundColor: Colors.card, width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: Colors.primary },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  name: { fontSize: 22, fontWeight: '800', color: '#fff', letterSpacing: -0.4 },
  nameEditIcon: { fontSize: 14, color: 'rgba(255,255,255,0.6)' },
  editRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  nameInput: { backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 8, color: '#fff', fontSize: 16, fontWeight: '700', minWidth: 160 },
  savePill: { backgroundColor: Colors.gold, borderRadius: Radius.full, paddingHorizontal: 14, paddingVertical: 6 },
  savePillText: { color: Colors.primaryDeep, fontWeight: '800', fontSize: 13 },
  cancelText: { color: 'rgba(255,255,255,0.7)', fontSize: 18 },
  email: { fontSize: 13, color: 'rgba(255,255,255,0.7)', marginTop: 4, marginBottom: 12 },
  pillRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap', justifyContent: 'center' },
  pill: { backgroundColor: 'rgba(255,255,255,0.18)', borderRadius: Radius.full, paddingHorizontal: 12, paddingVertical: 4 },
  rolePillRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  pillText: { fontSize: 11, color: '#fff', fontWeight: '600' },
  statsRow: { flexDirection: 'row', margin: 16, gap: 10 },
  statCard: { flex: 1, backgroundColor: Colors.card, borderRadius: Radius.md, padding: 14, alignItems: 'center', borderWidth: 1, borderColor: Colors.borderLight, ...Shadow.xs },
  statIcon: { fontSize: 20, marginBottom: 6 },
  statNum: { fontSize: 22, fontWeight: '800', color: Colors.primary, letterSpacing: -0.4 },
  statLabel: { fontSize: 11, color: Colors.text3, marginTop: 2, fontWeight: '500' },
  section: { paddingHorizontal: 16, marginBottom: 10 },
  sectionLabel: { fontSize: 11, fontWeight: '800', color: Colors.text3, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 },
  card: { backgroundColor: Colors.card, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.borderLight, overflow: 'hidden', ...Shadow.xs },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14 },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: Colors.borderLight },
  rowLabel: { fontSize: 14, color: Colors.text, fontWeight: '500' },
  signOutBtn: { backgroundColor: Colors.dangerLight, borderRadius: Radius.md, padding: 15, alignItems: 'center', borderWidth: 1, borderColor: '#f5c6c2', marginBottom: 10 },
  signOutText: { color: Colors.danger, fontWeight: '700', fontSize: 14 },
  version: { fontSize: 11, color: Colors.text3, textAlign: 'center' },
});
