import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { router, Link } from 'expo-router';
import { ensureUserProfile, supabase } from '@/lib/supabase';
import { Colors, Radius, Shadow } from '@/lib/theme';
import Logo from '@/components/Logo';

export default function RegisterScreen() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleRegister() {
    if (!name || !email || !password) return Alert.alert('Missing fields', 'Please fill in all fields');
    if (password.length < 6) return Alert.alert('Weak password', 'Password must be at least 6 characters');
    setLoading(true);
    const cleanName = name.trim();
    const cleanEmail = email.trim().toLowerCase();
    const { data, error } = await supabase.auth.signUp({
      email: cleanEmail,
      password,
      options: { data: { name: cleanName } },
    });
    if (error) { Alert.alert('Registration failed', error.message); setLoading(false); return; }
    if (data.user) {
      await ensureUserProfile(data.user, cleanName);
      router.replace('/(tabs)');
    }
    setLoading(false);
  }

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <View style={styles.brand}>
          <View style={styles.logoWrap}><Logo size="large" /></View>
          <Text style={styles.brandName}>Join our community</Text>
          <Text style={styles.brandTag}>Reformed Church of John the Baptist</Text>
        </View>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Create account</Text>
          <Text style={styles.cardSub}>Start your faith journey with us</Text>
          {[
            { label: 'Full name', value: name, set: setName, placeholder: 'Your full name', cap: 'words' as const },
            { label: 'Email address', value: email, set: setEmail, placeholder: 'you@example.com', kb: 'email-address' as const },
            { label: 'Password', value: password, set: setPassword, placeholder: 'At least 6 characters', secure: true },
          ].map((f) => (
            <View key={f.label} style={styles.fieldWrap}>
              <Text style={styles.fieldLabel}>{f.label}</Text>
              <TextInput style={styles.field} value={f.value} onChangeText={f.set} placeholder={f.placeholder} placeholderTextColor={Colors.text3} keyboardType={f.kb} autoCapitalize={f.cap || (f.kb ? 'none' : 'sentences')} secureTextEntry={f.secure} autoCorrect={false} />
            </View>
          ))}
          <TouchableOpacity style={[styles.btn, loading && { opacity: 0.65 }]} onPress={handleRegister} disabled={loading}>
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Create account</Text>}
          </TouchableOpacity>
          <View style={styles.switchRow}>
            <Text style={styles.switchText}>Already a member? </Text>
            <Link href="/(auth)/login"><Text style={styles.switchLink}>Sign in</Text></Link>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: Colors.bg },
  container: { flexGrow: 1, justifyContent: 'center', padding: 24, paddingBottom: 48 },
  brand: { alignItems: 'center', marginBottom: 40 },
  logoWrap: { width: 112, height: 112, borderRadius: 28, backgroundColor: Colors.card, alignItems: 'center', justifyContent: 'center', marginBottom: 18, borderWidth: 1, borderColor: Colors.border, ...Shadow.lg },
  brandName: { fontSize: 20, fontWeight: '800', color: Colors.text, letterSpacing: -0.4, textAlign: 'center' },
  brandTag: { fontSize: 12, color: Colors.text3, marginTop: 4, letterSpacing: 0.3 },
  card: { backgroundColor: Colors.card, borderRadius: Radius.xl, padding: 26, borderWidth: 1, borderColor: Colors.border, ...Shadow.md },
  cardTitle: { fontSize: 22, fontWeight: '800', color: Colors.text, letterSpacing: -0.4, marginBottom: 4 },
  cardSub: { fontSize: 14, color: Colors.text2, marginBottom: 24 },
  fieldWrap: { marginBottom: 16 },
  fieldLabel: { fontSize: 12, fontWeight: '700', color: Colors.text2, marginBottom: 7, letterSpacing: 0.2 },
  field: { backgroundColor: Colors.bg, borderRadius: Radius.sm, paddingHorizontal: 14, paddingVertical: 13, fontSize: 15, color: Colors.text, borderWidth: 1.5, borderColor: Colors.border },
  btn: { backgroundColor: Colors.primary, borderRadius: Radius.md, paddingVertical: 15, alignItems: 'center', marginTop: 8, ...Shadow.sm },
  btnText: { color: '#fff', fontWeight: '800', fontSize: 16, letterSpacing: 0.2 },
  switchRow: { flexDirection: 'row', justifyContent: 'center', marginTop: 20 },
  switchText: { fontSize: 14, color: Colors.text2 },
  switchLink: { fontSize: 14, color: Colors.primary, fontWeight: '700' },
});
