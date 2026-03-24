import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { router, Link } from 'expo-router';
import { ensureUserProfile, supabase } from '@/lib/supabase';
import { Colors, Radius, Shadow } from '@/lib/theme';
import Logo from '@/components/Logo';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleLogin() {
    if (!email || !password) return Alert.alert('Missing fields', 'Please enter your email and password');
    setLoading(true);
    const { data, error } = await supabase.auth.signInWithPassword({ email: email.trim().toLowerCase(), password });
    if (error) Alert.alert('Sign in failed', error.message);
    else {
      if (data.user) await ensureUserProfile(data.user);
      router.replace('/(tabs)');
    }
    setLoading(false);
  }

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <View style={styles.brand}>
          <View style={styles.logoWrap}><Logo size="large" /></View>
          <Text style={styles.brandName}>Reformed Church of John the Baptist</Text>
        </View>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Welcome back</Text>
          <Text style={styles.cardSub}>Sign in to continue</Text>
          <View style={styles.fieldWrap}>
            <Text style={styles.fieldLabel}>Email address</Text>
            <TextInput style={styles.field} value={email} onChangeText={setEmail} placeholder="you@example.com" placeholderTextColor={Colors.text3} keyboardType="email-address" autoCapitalize="none" autoCorrect={false} />
          </View>
          <View style={styles.fieldWrap}>
            <Text style={styles.fieldLabel}>Password</Text>
            <TextInput style={styles.field} value={password} onChangeText={setPassword} placeholder="Enter your password" placeholderTextColor={Colors.text3} secureTextEntry />
          </View>
          <TouchableOpacity style={[styles.btn, loading && { opacity: 0.65 }]} onPress={handleLogin} disabled={loading}>
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Sign in</Text>}
          </TouchableOpacity>
          <View style={styles.switchRow}>
            <Text style={styles.switchText}>New to the community? </Text>
            <Link href="/(auth)/register"><Text style={styles.switchLink}>Create account</Text></Link>
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
  logoWrap: { width: 112, height: 112, borderRadius: 28, overflow: 'hidden', backgroundColor: Colors.card, alignItems: 'center', justifyContent: 'center', marginBottom: 18, borderWidth: 1, borderColor: Colors.border, ...Shadow.lg },
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
