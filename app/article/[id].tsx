import { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Image, ActivityIndicator, Share, Dimensions } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '@/lib/supabase';
import { Colors, Radius } from '@/lib/theme';
import type { Article } from '@/lib/types';

const { width } = Dimensions.get('window');

export default function ArticleScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [article, setArticle] = useState<Article | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.from('articles').select('*').eq('id', id).single().then(({ data }) => { if (data) setArticle(data); setLoading(false); });
  }, [id]);

  async function share() {
    if (!article) return;
    await Share.share({ message: `${article.title}\n\n${article.subtitle || ''}\n\n${article.article_url || ''}` });
  }

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color={Colors.primary} /></View>;
  if (!article) return <View style={styles.center}><Text style={{ fontSize: 16, color: Colors.text2 }}>Article not found</Text><TouchableOpacity style={styles.backBtn} onPress={() => router.back()}><Text style={styles.backBtnText}>Go back</Text></TouchableOpacity></View>;

  const bodyText = article.body || '';
  const paragraphs = bodyText.split('\n').filter((p) => p.trim().length > 0);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.nav}>
        <TouchableOpacity onPress={() => router.back()} style={styles.navBtn}><Text style={styles.navBtnText}>← Back</Text></TouchableOpacity>
        <Text style={styles.navTitle} numberOfLines={1}>{article.category || 'Article'}</Text>
        <TouchableOpacity onPress={share} style={styles.navBtn}><Text style={styles.navBtnText}>Share ↑</Text></TouchableOpacity>
      </View>
      <ScrollView showsVerticalScrollIndicator={false}>
        {article.cover_image_url ? (
          <View style={styles.heroWrap}>
            <Image source={{ uri: article.cover_image_url }} style={styles.heroImg} />
            <View style={styles.heroOverlay} />
            <View style={styles.heroContent}>
              {article.category && <View style={styles.heroCat}><Text style={styles.heroCatText}>{article.category.toUpperCase()}</Text></View>}
              <Text style={styles.heroTitle}>{article.title}</Text>
              {article.subtitle && <Text style={styles.heroSub}>{article.subtitle}</Text>}
            </View>
          </View>
        ) : (
          <View style={styles.heroPlain}>
            {article.category && <View style={styles.heroCat}><Text style={styles.heroCatText}>{article.category.toUpperCase()}</Text></View>}
            <Text style={[styles.heroTitle, { color: '#fff', marginTop: 8 }]}>{article.title}</Text>
            {article.subtitle && <Text style={[styles.heroSub, { color: 'rgba(255,255,255,0.8)' }]}>{article.subtitle}</Text>}
          </View>
        )}
        <View style={styles.meta}>
          {article.read_time_minutes && <View style={styles.pill}><Text style={styles.pillText}>{article.read_time_minutes} min read</Text></View>}
        </View>
        <View style={styles.bodyWrap}>
          {paragraphs.map((p, i) => <Text key={i} style={styles.bodyText}>{p}</Text>)}
          {paragraphs.length === 0 && <Text style={styles.bodyText}>No content available.</Text>}
        </View>
        <View style={styles.shareBar}>
          <TouchableOpacity style={styles.shareBtn} onPress={share}><Text style={styles.shareBtnText}>🔗 Share this article</Text></TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  backBtn: { backgroundColor: Colors.primary, borderRadius: Radius.sm, paddingHorizontal: 24, paddingVertical: 10, marginTop: 16 },
  backBtnText: { color: '#fff', fontWeight: '600', fontSize: 14 },
  nav: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 13, backgroundColor: Colors.card, borderBottomWidth: 1, borderBottomColor: Colors.border },
  navBtn: { padding: 4, minWidth: 60 },
  navBtnText: { fontSize: 14, color: Colors.primary, fontWeight: '500' },
  navTitle: { flex: 1, fontSize: 14, fontWeight: '600', color: Colors.text, textAlign: 'center', marginHorizontal: 8 },
  heroWrap: { height: 270, position: 'relative' },
  heroImg: { width: '100%', height: 270 },
  heroOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.48)' },
  heroContent: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 20 },
  heroPlain: { backgroundColor: Colors.primary, padding: 26, paddingBottom: 22 },
  heroCat: { backgroundColor: Colors.primary, alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 4, marginBottom: 8 },
  heroCatText: { color: '#fff', fontSize: 10, fontWeight: '600', letterSpacing: 0.5 },
  heroTitle: { fontSize: 22, fontWeight: '600', color: '#fff', lineHeight: 30 },
  heroSub: { fontSize: 14, color: 'rgba(255,255,255,0.8)', marginTop: 7 },
  meta: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: Colors.border, backgroundColor: Colors.card },
  metaAvatar: { width: 34, height: 34, borderRadius: 17, backgroundColor: Colors.accent, alignItems: 'center', justifyContent: 'center' },
  metaAvatarText: { color: Colors.accentLight, fontSize: 14, fontWeight: '600' },
  metaName: { fontSize: 13, fontWeight: '600', color: Colors.text },
  metaDate: { fontSize: 11, color: Colors.text3, marginTop: 1 },
  pill: { backgroundColor: Colors.bg, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4, borderWidth: 1, borderColor: Colors.border },
  pillText: { fontSize: 11, color: Colors.text2 },
  bodyWrap: { padding: 18, paddingBottom: 8 },
  bodyText: { fontSize: 16, color: Colors.text, lineHeight: 26, marginBottom: 16 },
  shareBar: { margin: 16, marginBottom: 40, alignItems: 'center' },
  shareBtn: { backgroundColor: Colors.primaryLight, borderRadius: Radius.sm, paddingHorizontal: 20, paddingVertical: 10 },
  shareBtnText: { fontSize: 13, color: Colors.primaryDark, fontWeight: '500' },
});
