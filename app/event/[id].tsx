import { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Image, ActivityIndicator, Alert } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '@/lib/supabase';
import { Colors, Radius } from '@/lib/theme';
import type { Event } from '@/lib/types';

export default function EventDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const eventId = Array.isArray(id) ? id[0] : id;
  const [event, setEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);
  const [rsvped, setRsvped] = useState(false);
  const [attending, setAttending] = useState(0);
  const [rsvpSaving, setRsvpSaving] = useState(false);

  useEffect(() => {
    loadEvent();
  }, [eventId]);

  async function loadEvent() {
    if (!eventId) {
      setEvent(null);
      setLoading(false);
      return;
    }

    setLoading(true);

    const [{ data: eventData, error: eventError }, { count }, { data: authData }] = await Promise.all([
      supabase.from('events').select('*').eq('id', eventId).single(),
      supabase.from('event_rsvps').select('id', { count: 'exact', head: true }).eq('event_id', eventId),
      supabase.auth.getUser(),
    ]);

    if (eventError) {
      Alert.alert('Event error', eventError.message);
    }

    setEvent(eventData || null);
    setAttending(count || 0);

    const user = authData.user;
    if (user) {
      const { data: rsvpRow } = await supabase
        .from('event_rsvps')
        .select('id')
        .eq('event_id', eventId)
        .eq('user_id', user.id)
        .maybeSingle();
      setRsvped(!!rsvpRow);
    } else {
      setRsvped(false);
    }

    setLoading(false);
  }

  async function toggleRSVP() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return Alert.alert('Please sign in to RSVP');
    if (!eventId) return Alert.alert('Event unavailable', 'Could not determine which event to update.');
    if (rsvpSaving) return;

    setRsvpSaving(true);

    if (rsvped) {
      const { error } = await supabase.from('event_rsvps').delete().eq('event_id', eventId).eq('user_id', user.id);
      if (error) {
        const isRlsError = /row-level security|permission denied/i.test(error.message || '');
        Alert.alert(
          'RSVP update failed',
          isRlsError
            ? 'Your account is signed in, but the database policy is blocking RSVP updates. Ask an admin to apply the event RSVP policy script.'
            : error.message,
        );
      } else {
        setRsvped(false);
        setAttending((value) => Math.max(0, value - 1));
      }
    } else {
      const { error } = await supabase.from('event_rsvps').insert({ event_id: eventId, user_id: user.id, status: 'going' });
      if (error) {
        const isRlsError = /row-level security|permission denied/i.test(error.message || '');
        Alert.alert(
          'RSVP update failed',
          isRlsError
            ? 'Your account is signed in, but the database policy is blocking RSVP updates. Ask an admin to apply the event RSVP policy script.'
            : error.message,
        );
      } else {
        setRsvped(true);
        setAttending((value) => value + 1);
      }
    }

    setRsvpSaving(false);
    loadEvent();
  }

  const eventColor = (cat?: string) => ({ service: '#0F6E56', youth: '#3C3489', outreach: '#712B13', prayer: '#085041', conference: '#72243E' }[cat || ''] || Colors.primary);

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color={Colors.primary} /></View>;
  if (!event) return <View style={styles.center}><Text style={{ color: Colors.text2 }}>Event not found</Text></View>;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={[styles.hero, { backgroundColor: eventColor(event.category) }]}>
          {event.image_url && <Image source={{ uri: event.image_url }} style={StyleSheet.absoluteFillObject as any} />}
          <View style={styles.heroOverlay} />
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}><Text style={styles.backBtnText}>← Back</Text></TouchableOpacity>
          {event.category && <View style={styles.catBadge}><Text style={styles.catBadgeText}>{event.category}</Text></View>}
          <Text style={styles.heroTitle}>{event.title}</Text>
          {event.subtitle && <Text style={styles.heroSub}>{event.subtitle}</Text>}
        </View>
        <View style={styles.body}>
          <View style={styles.infoCard}>
            {[['📅 Date', new Date(event.event_date).toLocaleDateString('en-ZA', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })], ['🕐 Time', new Date(event.event_date).toLocaleTimeString('en-ZA', { hour: '2-digit', minute: '2-digit' })], ['📍 Location', event.location || 'TBC'], ['👥 Attending', `${attending} members registered`]].map(([k, v]) => (
              <View key={k as string} style={styles.infoRow}>
                <Text style={styles.infoKey}>{k}</Text>
                <Text style={styles.infoVal}>{v}</Text>
              </View>
            ))}
          </View>
          {event.description && (
            <View style={styles.descCard}>
              <Text style={styles.descTitle}>About this event</Text>
              <Text style={styles.descText}>{event.description}</Text>
            </View>
          )}
          <TouchableOpacity style={[styles.rsvpBtn, rsvped && styles.rsvpBtnDone, rsvpSaving && styles.rsvpBtnDisabled]} onPress={toggleRSVP} disabled={rsvpSaving}>
            <Text style={[styles.rsvpBtnText, rsvped && styles.rsvpBtnTextDone]}>{rsvpSaving ? 'Updating RSVP...' : rsvped ? '✓ Registered — tap to cancel' : 'RSVP — I will attend'}</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  hero: { height: 280, padding: 20, justifyContent: 'flex-end' },
  heroOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.52)' },
  backBtn: { position: 'absolute', top: 16, left: 16, backgroundColor: 'rgba(0,0,0,0.3)', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6 },
  backBtnText: { color: '#fff', fontSize: 13 },
  catBadge: { backgroundColor: 'rgba(255,255,255,0.2)', alignSelf: 'flex-start', borderRadius: 4, paddingHorizontal: 8, paddingVertical: 3, marginBottom: 8 },
  catBadgeText: { color: '#fff', fontSize: 10, fontWeight: '600', textTransform: 'capitalize' },
  heroTitle: { fontSize: 22, fontWeight: '600', color: '#fff', lineHeight: 28 },
  heroSub: { fontSize: 14, color: 'rgba(255,255,255,0.8)', marginTop: 6 },
  body: { padding: 16 },
  infoCard: { backgroundColor: Colors.card, borderRadius: Radius.md, padding: 14, marginBottom: 12, borderWidth: 1, borderColor: Colors.border },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: Colors.border },
  infoKey: { fontSize: 12, color: Colors.text3 },
  infoVal: { fontSize: 12, color: Colors.text, textAlign: 'right', maxWidth: '60%' },
  descCard: { backgroundColor: Colors.card, borderRadius: Radius.md, padding: 14, marginBottom: 16, borderWidth: 1, borderColor: Colors.border },
  descTitle: { fontSize: 13, fontWeight: '600', color: Colors.text3, marginBottom: 8 },
  descText: { fontSize: 14, color: Colors.text, lineHeight: 22 },
  rsvpBtn: { backgroundColor: Colors.primary, borderRadius: Radius.md, padding: 15, alignItems: 'center' },
  rsvpBtnDone: { backgroundColor: Colors.card, borderWidth: 2, borderColor: Colors.primary },
  rsvpBtnDisabled: { opacity: 0.7 },
  rsvpBtnText: { fontSize: 15, fontWeight: '700', color: '#fff' },
  rsvpBtnTextDone: { color: Colors.primary },
});
