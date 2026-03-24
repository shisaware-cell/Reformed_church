import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { Redirect } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { Colors, Radius, Shadow } from '@/lib/theme';
import Logo from '@/components/Logo';

export default function IndexRoute() {
  const [loading, setLoading] = useState(true);
  const [targetRoute, setTargetRoute] = useState<'/(auth)/login' | '/(tabs)'>('/(auth)/login');

  useEffect(() => {
    let mounted = true;

    async function bootstrap() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!mounted) return;
      setTargetRoute(session?.user ? '/(tabs)' : '/(auth)/login');
      setLoading(false);
    }

    bootstrap();

    return () => {
      mounted = false;
    };
  }, []);

  if (loading) {
    return (
      <View style={styles.screen}>
        <View style={styles.loaderCard}>
          <View style={styles.loaderLogoWrap}><Logo size="large" /></View>
          <Text style={styles.loaderTitle}>Reformed Church of John the Baptist</Text>
          <Text style={styles.loaderSubtitle}>Preparing your experience</Text>
          <ActivityIndicator color={Colors.primary} style={styles.loaderSpinner} />
        </View>
      </View>
    );
  }

  return <Redirect href={targetRoute} />;
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.bg,
    padding: 24,
  },
  loaderCard: {
    width: '100%',
    maxWidth: 360,
    alignItems: 'center',
    backgroundColor: Colors.card,
    borderRadius: Radius.xl,
    paddingHorizontal: 28,
    paddingVertical: 36,
    borderWidth: 1,
    borderColor: Colors.border,
    ...Shadow.lg,
  },
  loaderLogoWrap: {
    width: 116,
    height: 116,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.bg,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    marginBottom: 20,
  },
  loaderTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: Colors.text,
    textAlign: 'center',
    letterSpacing: -0.4,
  },
  loaderSubtitle: {
    marginTop: 8,
    fontSize: 13,
    color: Colors.text3,
    textAlign: 'center',
  },
  loaderSpinner: {
    marginTop: 24,
  },
});
