import { useEffect, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  FlatList, ActivityIndicator, Alert, Share, Image, TextInput, Modal, Pressable, KeyboardAvoidingView, Platform, Keyboard, ScrollView,
} from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import BottomSheet from '@gorhom/bottom-sheet';
import type { BottomSheetMethods } from '@gorhom/bottom-sheet/lib/typescript/types';
import * as Clipboard from 'expo-clipboard';
import * as Linking from 'expo-linking';
import * as ImagePicker from 'expo-image-picker';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { ensureUserProfile, supabase } from '@/lib/supabase';
import { guessImageContentType, guessImageExtension, uploadImageUriToStorage } from '@/lib/storage';
import { Colors, Radius, Shadow } from '@/lib/theme';
import type { Event, Post, User } from '@/lib/types';
import Composer from '@/components/Composer';
import CommentSheet from '@/components/CommentSheet';

type Tab = 'feed' | 'events';

export default function CommunityScreen() {
  const [tab, setTab] = useState<Tab>('feed');
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [showComposer, setShowComposer] = useState(false);

  const handlePostCreated = () => {
    setShowComposer(false);
    // We can add a state to trigger refresh in FeedTab if needed
  };

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session?.user) {
        const profile = await ensureUserProfile(session.user);
        if (profile) setCurrentUser(profile);
      }
      setAuthLoading(false);
    });
  }, []);

  if (authLoading) return <View style={styles.center}><ActivityIndicator color={Colors.primary} /></View>;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Community</Text>
        <View style={styles.tabsRow}>
          <View style={styles.tabs}>
            <TouchableOpacity style={[styles.tab, tab === 'feed' && styles.tabActive]} onPress={() => setTab('feed')}>
              <Text style={[styles.tabText, tab === 'feed' && styles.tabTextActive]}>Feed</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.tab, tab === 'events' && styles.tabActive]} onPress={() => setTab('events')}>
              <Text style={[styles.tabText, tab === 'events' && styles.tabTextActive]}>Events</Text>
            </TouchableOpacity>
          </View>
          {tab === 'feed' ? (
            <TouchableOpacity style={styles.addBtn} onPress={() => setShowComposer(true)}>
              <Text style={styles.addBtnText}>＋</Text>
            </TouchableOpacity>
          ) : <View style={{ width: 40, height: 40 }} />}
        </View>
      </View>
      
      {tab === 'feed'
        ? <FeedTab currentUser={currentUser} />
        : <EventsTab />}
      
      {showComposer && (
        <Composer
          onClose={handlePostCreated}
          currentUser={currentUser}
        />
      )}
    </SafeAreaView>
  );
}

function FeedTab({ currentUser }: { currentUser: User | null; }) {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [liked, setLiked] = useState<Record<string, boolean>>({});
  const [failedAvatars, setFailedAvatars] = useState<Record<string, boolean>>({});
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [menuPost, setMenuPost] = useState<Post | null>(null);
  const [editingPost, setEditingPost] = useState<Post | null>(null);
  const [editContent, setEditContent] = useState('');
  const [editImageUri, setEditImageUri] = useState<string | null>(null);
  const [editImageChanged, setEditImageChanged] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);
  const commentSheetRef = useRef<BottomSheetMethods>(null);

  async function loadPosts() {
    setLoading(true);
    const { data: rawPosts, error } = await supabase
      .from('posts')
      .select('*, user:users(name, profile_image_url)')
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) {
      Alert.alert('Error fetching posts', error.message);
      setLoading(false);
      return;
    }

    const basePosts = (rawPosts as any[] || []) as Post[];
    const postIds = basePosts.map((p) => p.id);
    const userIds = [...new Set(basePosts.map((p) => p.user_id).filter(Boolean))] as string[];

    const [{ data: userRows }, { data: commentRows }, { data: likeRows }] = await Promise.all([
      userIds.length
        ? supabase.from('users').select('id, name, profile_image_url').in('id', userIds)
        : Promise.resolve({ data: [] as any[] }),
      postIds.length
        ? supabase.from('post_comments').select('post_id').in('post_id', postIds)
        : Promise.resolve({ data: [] as any[] }),
      postIds.length
        ? supabase.from('post_likes').select('post_id').in('post_id', postIds)
        : Promise.resolve({ data: [] as any[] }),
    ]);

    const profileMap: Record<string, { name: string; profile_image_url?: string }> = {};
    (userRows || []).forEach((u: any) => {
      profileMap[u.id] = { name: u.name || 'Member', profile_image_url: u.profile_image_url || undefined };
    });

    const commentsByPost: Record<string, number> = {};
    (commentRows || []).forEach((c: any) => {
      commentsByPost[c.post_id] = (commentsByPost[c.post_id] || 0) + 1;
    });

    const likesByPost: Record<string, number> = {};
    (likeRows || []).forEach((l: any) => {
      likesByPost[l.post_id] = (likesByPost[l.post_id] || 0) + 1;
    });

    const merged = basePosts.map((p) => {
      const isCurrentUsersPost = !!currentUser?.id && p.user_id === currentUser.id;
      const resolvedUser = isCurrentUsersPost
        ? {
          name: currentUser?.name || profileMap[p.user_id]?.name || p.user?.name || 'Member',
          profile_image_url: currentUser?.profile_image_url || profileMap[p.user_id]?.profile_image_url || p.user?.profile_image_url,
        }
        : (profileMap[p.user_id] || p.user || { name: 'Member' });

      return {
        ...p,
        user: resolvedUser,
        comments_count: commentsByPost[p.id] || 0,
        likes_count: likesByPost[p.id] ?? p.likes_count ?? 0,
      };
    });

    setPosts(merged);

    if (currentUser?.id) {
      const { data: likesData } = await supabase
        .from('post_likes')
        .select('post_id')
        .eq('user_id', currentUser.id);
      const likeMap: Record<string, boolean> = {};
      (likesData || []).forEach((l) => { likeMap[l.post_id] = true; });
      setLiked(likeMap);
    }
    setLoading(false);
  }

  useEffect(() => {
    loadPosts();
    const channel = supabase
      .channel('realtime:posts')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'posts' }, () => {
        loadPosts();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentUser]);

  const handleOpenComments = (post: Post) => {
    setSelectedPost(post);
    commentSheetRef.current?.snapToIndex(0);
  };

  const handleLike = async (post: Post) => {
    if (!currentUser) return Alert.alert('Please sign in to like posts');
    
    const isLiked = liked[post.id];
    setLiked(prev => ({ ...prev, [post.id]: !isLiked }));
    setPosts((prev) => prev.map((p) => {
      if (p.id !== post.id) return p;
      const nextLikes = Math.max(0, (p.likes_count || 0) + (isLiked ? -1 : 1));
      return { ...p, likes_count: nextLikes };
    }));

    let error: any = null;
    if (isLiked) {
      const { error: unlikeError } = await supabase.from('post_likes').delete().match({ post_id: post.id, user_id: currentUser.id });
      error = unlikeError;
    } else {
      const { error: likeError } = await supabase.from('post_likes').insert({ post_id: post.id, user_id: currentUser.id });
      error = likeError;
    }

    if (error) {
      setLiked(prev => ({ ...prev, [post.id]: isLiked }));
      setPosts((prev) => prev.map((p) => {
        if (p.id !== post.id) return p;
        const restoredLikes = Math.max(0, (p.likes_count || 0) + (isLiked ? 1 : -1));
        return { ...p, likes_count: restoredLikes };
      }));
      if (String(error.message || '').toLowerCase().includes('row-level security')) {
        Alert.alert(
          'Like failed',
          'Your database blocks likes via RLS. Run policy SQL for post_likes and then retry.'
        );
      } else {
        Alert.alert('Like failed', error.message || 'Please try again');
      }
    }
  };

  const openPostMenu = (post: Post) => setMenuPost(post);

  const openEditPost = (post: Post) => {
    setMenuPost(null);
    setEditingPost(post);
    setEditContent(post.content || '');
    setEditImageUri(post.image_url || null);
    setEditImageChanged(false);
  };

  const pickEditImage = async () => {
    if (!editingPost) return;
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Permission needed', 'Please allow photo access to change your post image.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
      allowsEditing: true,
    });
    if (!result.canceled) {
      setEditImageUri(result.assets[0].uri);
      setEditImageChanged(true);
    }
  };

  const removeEditImage = () => {
    setEditImageUri(null);
    setEditImageChanged(true);
  };

  const savePostEdit = async () => {
    if (!editingPost) return;
    setSavingEdit(true);

    let nextImageUrl = editingPost.image_url || null;

    if (editImageChanged) {
      if (!editImageUri) {
        nextImageUrl = null;
      } else if (!editImageUri.startsWith('http')) {
        try {
          const ext = guessImageExtension(editImageUri);
          const path = `posts/${editingPost.user_id}/post_${editingPost.id}_${Date.now()}.${ext}`;
          nextImageUrl = await uploadImageUriToStorage({
            bucket: 'post-images',
            path,
            uri: editImageUri,
            contentType: guessImageContentType(editImageUri),
          });
        } catch (uploadError: any) {
          Alert.alert('Image upload failed', uploadError?.message || 'Please try again');
          setSavingEdit(false);
          return;
        }
      } else {
        nextImageUrl = editImageUri;
      }
    }

    const nextUpdatedAt = new Date().toISOString();
    const { error: updateError } = await supabase
      .from('posts')
      .update({
        content: editContent.trim(),
        image_url: nextImageUrl,
        updated_at: nextUpdatedAt,
      })
      .eq('id', editingPost.id)
      .eq('user_id', editingPost.user_id);

    if (updateError) {
      Alert.alert('Edit failed', updateError.message);
    } else {
      const { data: postAfterUpdate } = await supabase
        .from('posts')
        .select('id, content, image_url, updated_at')
        .eq('id', editingPost.id)
        .maybeSingle();

      if (editImageChanged && postAfterUpdate && (postAfterUpdate.image_url || null) !== (nextImageUrl || null)) {
        Alert.alert(
          'Image update blocked',
          'Your database policy allowed editing text but blocked image_url update. Apply the posts/storage SQL fix and retry.'
        );
      }

      setPosts((prev) => prev.map((p) => (p.id === editingPost.id
        ? {
          ...p,
          content: postAfterUpdate?.content ?? editContent.trim(),
          image_url: (postAfterUpdate?.image_url ?? nextImageUrl) || undefined,
          updated_at: postAfterUpdate?.updated_at ?? nextUpdatedAt,
        }
        : p)));
      setEditingPost(null);
      setEditContent('');
      setEditImageUri(null);
      setEditImageChanged(false);
      await loadPosts();
    }
    setSavingEdit(false);
  };

  const deletePost = async (post: Post) => {
    setMenuPost(null);
    Alert.alert('Delete post', 'This action cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          const { error } = await supabase.from('posts').delete().eq('id', post.id).eq('user_id', post.user_id);
          if (error) {
            Alert.alert('Delete failed', error.message);
            return;
          }
          setPosts((prev) => prev.filter((p) => p.id !== post.id));
        },
      },
    ]);
  };

  const copyPostLink = async (post: Post) => {
    const deepLink = `${Linking.createURL('/(tabs)/community')}?postId=${post.id}`;
    await Clipboard.setStringAsync(deepLink);
    setMenuPost(null);
    Alert.alert('Copied', 'Post link copied to clipboard.');
  };

  const handleShare = async (post: Post) => {
    try {
      await Share.share({
        message: `Check out this post from Reformed Church of John the Baptist community!`,
      });
    } catch (error) {
      Alert.alert('Error', 'Could not share post.');
    }
  };

  const renderPost = ({ item }: { item: Post }) => (
    <View style={styles.postCard}>
      <View style={styles.postHeader}>
        {item.user?.profile_image_url && !failedAvatars[item.id] ? (
          <Image
            source={{ uri: `${item.user.profile_image_url}${item.user.profile_image_url.includes('?') ? '&' : '?'}v=${new Date(item.created_at).getTime()}` }}
            style={styles.postAvatar}
            onError={() => setFailedAvatars((prev) => ({ ...prev, [item.id]: true }))}
          />
        ) : (
          <View style={styles.postAvatarFallback}>
            <Text style={styles.postAvatarFallbackText}>
              {(item.user?.name || 'Member').trim().charAt(0).toUpperCase()}
            </Text>
          </View>
        )}
        <View>
          <Text style={styles.postUserName}>{item.user?.name || 'Member'}</Text>
          <Text style={styles.postDate}>{new Date(item.created_at).toLocaleDateString()}</Text>
        </View>
        {currentUser?.id === item.user_id && (
          <TouchableOpacity style={styles.moreBtn} onPress={() => openPostMenu(item)}>
            <Text style={styles.moreBtnText}>⋯</Text>
          </TouchableOpacity>
        )}
      </View>
      {item.content && <Text style={styles.postContent}>{item.content}</Text>}
      {item.image_url && (
        <Image
          source={{ uri: `${item.image_url}${item.image_url.includes('?') ? '&' : '?'}v=${new Date(item.updated_at || item.created_at).getTime()}` }}
          style={styles.postImage}
          resizeMode="cover"
        />
      )}
      <View style={styles.postActions}>
        <TouchableOpacity style={styles.actionBtn} onPress={() => handleLike(item)} activeOpacity={0.85}>
          <Text style={[styles.actionIcon, liked[item.id] && styles.likedText]}>{liked[item.id] ? '♥' : '♡'}</Text>
          <Text style={[styles.actionCount, liked[item.id] && styles.likedText]}>{item.likes_count || 0}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionBtn} onPress={() => handleOpenComments(item)} activeOpacity={0.85}>
          <MaterialCommunityIcons name="comment-outline" size={18} color={Colors.text2} />
          <Text style={styles.actionCount}>{item.comments_count ?? 0}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionBtn} onPress={() => handleShare(item)} activeOpacity={0.85}>
          <Text style={styles.actionIcon}>↗</Text>
          <Text style={styles.actionCount}>Share</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  if (loading && !posts.length) return <View style={styles.center}><ActivityIndicator color={Colors.primary} /></View>;

  return (
    <>
      <FlatList
        data={posts}
        renderItem={renderPost}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.feedContainer}
        ListEmptyComponent={<Text style={styles.emptyFeed}>No posts yet. Be the first to share!</Text>}
        refreshing={loading}
        onRefresh={loadPosts}
      />
      <CommentSheet 
        post={selectedPost}
        commentSheetRef={commentSheetRef}
        onClose={() => setSelectedPost(null)}
      />

      <Modal
        visible={!!menuPost}
        transparent
        animationType="slide"
        onRequestClose={() => setMenuPost(null)}
      >
        <Pressable style={styles.menuBackdrop} onPress={() => setMenuPost(null)}>
          <View style={styles.menuSheet}>
            <TouchableOpacity style={styles.menuItem} onPress={() => menuPost && openEditPost(menuPost)}>
              <Text style={styles.menuItemText}>Edit post</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.menuItem} onPress={() => menuPost && copyPostLink(menuPost)}>
              <Text style={styles.menuItemText}>Copy link</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.menuItem} onPress={() => menuPost && deletePost(menuPost)}>
              <Text style={[styles.menuItemText, { color: Colors.danger }]}>Delete post</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Modal>

      <Modal
        visible={!!editingPost}
        transparent
        animationType="fade"
        onRequestClose={() => setEditingPost(null)}
      >
        <KeyboardAvoidingView
          style={styles.editBackdrop}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 40 : 0}
        >
          <TouchableOpacity
            activeOpacity={1}
            onPress={Keyboard.dismiss}
            style={StyleSheet.absoluteFillObject}
          />
          <View style={styles.editCard}>
            <Text style={styles.editTitle}>Edit post</Text>
            <ScrollView
              style={styles.editScroll}
              contentContainerStyle={styles.editScrollContent}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              <TextInput
                style={styles.editInput}
                value={editContent}
                onChangeText={setEditContent}
                multiline
                placeholder="Update your post..."
                placeholderTextColor={Colors.text3}
              />
              <View style={styles.editImageSection}>
                {editImageUri ? (
                  <Image source={{ uri: editImageUri }} style={styles.editImagePreview} resizeMode="cover" />
                ) : (
                  <View style={styles.editImagePlaceholder}>
                    <Text style={styles.editImagePlaceholderText}>No image selected</Text>
                  </View>
                )}
                <View style={styles.editImageActions}>
                  <TouchableOpacity style={styles.editSecondaryBtn} onPress={pickEditImage}>
                    <Text style={styles.editSecondaryBtnText}>{editImageUri ? 'Change image' : 'Add image'}</Text>
                  </TouchableOpacity>
                  {editImageUri ? (
                    <TouchableOpacity style={styles.editSecondaryBtn} onPress={removeEditImage}>
                      <Text style={[styles.editSecondaryBtnText, { color: Colors.danger }]}>Remove</Text>
                    </TouchableOpacity>
                  ) : null}
                </View>
              </View>
            </ScrollView>
            <View style={styles.editActions}>
              <TouchableOpacity style={styles.editCancelBtn} onPress={() => setEditingPost(null)}>
                <Text style={styles.editCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.editSaveBtn, savingEdit && { opacity: 0.6 }]} onPress={savePostEdit} disabled={savingEdit}>
                <Text style={styles.editSaveText}>{savingEdit ? 'Saving...' : 'Save'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </>
  );
}

function EventsTab() {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);

  const loadEvents = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('events')
      .select('*')
      .eq('is_published', true)
      .order('event_date', { ascending: true });

    if (error) {
      Alert.alert('Events error', error.message);
    } else {
      setEvents((data as Event[]) || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadEvents();
  }, []);

  const renderEvent = ({ item }: { item: Event }) => {
    const accent = ({ service: '#0F6E56', youth: '#3C3489', outreach: '#712B13', prayer: '#085041', conference: '#72243E' }[item.category || ''] || Colors.primary);
    const fromLabel = new Date(item.event_date).toLocaleString('en-ZA', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
    const toLabel = new Date(item.end_date || item.event_date).toLocaleString('en-ZA', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });

    return (
      <TouchableOpacity
        style={styles.eventCard}
        onPress={() => router.push(`/event/${item.id}` as any)}
        activeOpacity={0.9}
      >
        <View style={styles.eventMedia}>
          {item.image_url ? (
            <Image source={{ uri: item.image_url }} style={styles.eventImage} resizeMode="cover" />
          ) : (
            <View style={[styles.eventImage, { backgroundColor: accent }]} />
          )}
          <View style={styles.eventImageOverlay} />
          <View style={styles.eventDateBadge}>
            <Text style={styles.eventDay}>{new Date(item.event_date).toLocaleDateString('en-ZA', { month: 'short' }).toUpperCase()}</Text>
            <Text style={styles.eventDateNum}>{new Date(item.event_date).getDate()}</Text>
          </View>
          {item.category ? (
            <View style={[styles.eventCategoryBadge, { backgroundColor: accent }]}> 
              <Text style={styles.eventCategoryText}>{item.category}</Text>
            </View>
          ) : null}
        </View>

        <View style={styles.eventBody}>
          <Text style={styles.eventTitle} numberOfLines={2}>{item.title}</Text>
          {!!item.subtitle && <Text style={styles.eventSubtitle} numberOfLines={2}>{item.subtitle}</Text>}
          <Text style={styles.eventMeta}>From: {fromLabel}</Text>
          <Text style={styles.eventMetaSecondary}>To: {toLabel}</Text>
          {item.location ? <Text style={styles.eventLocation}>📍 {item.location}</Text> : null}
        </View>
      </TouchableOpacity>
    );
  };

  if (loading && !events.length) return <View style={styles.center}><ActivityIndicator color={Colors.primary} /></View>;

  return (
    <FlatList
      data={events}
      renderItem={renderEvent}
      keyExtractor={(item) => item.id}
      contentContainerStyle={styles.eventsContainer}
      refreshing={loading}
      onRefresh={loadEvents}
      ListEmptyComponent={<Text style={styles.emptyFeed}>No published events yet.</Text>}
    />
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bg },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.bg },
  header: { paddingHorizontal: 20, paddingTop: 10, paddingBottom: 12, backgroundColor: Colors.bg, borderBottomWidth: 1, borderColor: Colors.border },
  headerTitle: { fontSize: 28, fontWeight: '800', color: Colors.text, letterSpacing: -0.6 },
  tabsRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 16 },
  tabs: { flexDirection: 'row', backgroundColor: Colors.card, borderRadius: Radius.lg, padding: 4, ...Shadow.sm, borderWidth: 1, borderColor: Colors.border },
  tab: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: Radius.md },
  tabActive: { backgroundColor: Colors.primary },
  tabText: { color: Colors.text2, fontWeight: '700', fontSize: 14 },
  tabTextActive: { color: '#fff' },
  addBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: Colors.primary, justifyContent: 'center', alignItems: 'center', ...Shadow.md },
  addBtnText: { color: '#fff', fontSize: 24, fontWeight: '600', lineHeight: 28 },
  feedContainer: { padding: 16, paddingBottom: 50 },
  postCard: { backgroundColor: Colors.card, borderRadius: Radius.xl, marginBottom: 20, ...Shadow.md, borderWidth: 1, borderColor: Colors.border },
  postHeader: { flexDirection: 'row', alignItems: 'center', padding: 16 },
  postAvatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: Colors.border, marginRight: 12 },
  postAvatarFallback: { width: 44, height: 44, borderRadius: 22, backgroundColor: Colors.primaryLight, marginRight: 12, alignItems: 'center', justifyContent: 'center' },
  postAvatarFallbackText: { color: Colors.primary, fontSize: 16, fontWeight: '800' },
  moreBtn: { marginLeft: 'auto', width: 30, height: 30, alignItems: 'center', justifyContent: 'center' },
  moreBtnText: { fontSize: 22, lineHeight: 24, color: Colors.text2, fontWeight: '700' },
  postUserName: { fontSize: 16, fontWeight: '700', color: Colors.text },
  postDate: { fontSize: 12, color: Colors.text3, marginTop: 2 },
  postContent: { fontSize: 16, color: Colors.text2, paddingHorizontal: 16, paddingBottom: 16, lineHeight: 23 },
  postImage: { width: '100%', height: 300, borderTopLeftRadius: 0, borderTopRightRadius: 0, borderBottomLeftRadius: Radius.xl, borderBottomRightRadius: Radius.xl, backgroundColor: Colors.border },
  postActions: { flexDirection: 'row', justifyContent: 'space-around', paddingVertical: 10, borderTopWidth: 1, borderColor: Colors.border },
  actionBtn: { paddingHorizontal: 10, paddingVertical: 6, flexDirection: 'row', alignItems: 'center', gap: 6 },
  actionIcon: { color: Colors.text2, fontSize: 18, fontWeight: '700', lineHeight: 18 },
  actionCount: { color: Colors.text2, fontWeight: '700', fontSize: 13 },
  likedText: { color: Colors.danger },
  emptyFeed: { textAlign: 'center', color: Colors.text3, marginTop: 50, fontSize: 16 },
  eventsContainer: { padding: 14, paddingBottom: 24 },
  eventCard: { backgroundColor: Colors.card, borderRadius: Radius.xl, borderWidth: 1, borderColor: Colors.border, marginBottom: 16, overflow: 'hidden', ...Shadow.md },
  eventMedia: { height: 188, position: 'relative', backgroundColor: Colors.border },
  eventImage: { width: '100%', height: '100%' },
  eventImageOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(8, 16, 24, 0.28)' },
  eventDateBadge: { position: 'absolute', left: 14, top: 14, width: 62, height: 62, borderRadius: Radius.md, backgroundColor: 'rgba(255,255,255,0.92)', alignItems: 'center', justifyContent: 'center' },
  eventDay: { color: Colors.primaryDark, fontSize: 10, fontWeight: '800', letterSpacing: 0.5 },
  eventDateNum: { color: Colors.primary, fontSize: 22, fontWeight: '900', lineHeight: 24 },
  eventCategoryBadge: { position: 'absolute', right: 14, bottom: 14, borderRadius: Radius.full, paddingHorizontal: 10, paddingVertical: 6 },
  eventCategoryText: { color: '#fff', fontSize: 11, fontWeight: '800', textTransform: 'capitalize' },
  eventBody: { padding: 16 },
  eventTitle: { color: Colors.text, fontSize: 18, fontWeight: '800', lineHeight: 23 },
  eventSubtitle: { color: Colors.text2, fontSize: 14, marginTop: 6, lineHeight: 19 },
  eventMeta: { color: Colors.primary, fontSize: 12, marginTop: 12, fontWeight: '700' },
  eventMetaSecondary: { color: Colors.text2, fontSize: 12, marginTop: 4, fontWeight: '700' },
  eventLocation: { color: Colors.text3, fontSize: 13, marginTop: 8, fontWeight: '600' },
  chatContainer: { flex: 1, backgroundColor: Colors.bg },
  chatList: { paddingHorizontal: 14, paddingTop: 10, paddingBottom: 90 },
  chatIntroCard: { backgroundColor: Colors.card, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.border, padding: 12, marginBottom: 12 },
  chatIntroTitle: { color: Colors.text, fontSize: 15, fontWeight: '800', marginBottom: 4 },
  chatIntroText: { color: Colors.text2, fontSize: 13, lineHeight: 18 },
  chatPromptRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 },
  chatPromptChip: { backgroundColor: Colors.bg, borderWidth: 1, borderColor: Colors.border, borderRadius: Radius.sm, paddingVertical: 6, paddingHorizontal: 10 },
  chatPromptChipText: { color: Colors.text2, fontSize: 12, fontWeight: '700' },
  chatRow: { flexDirection: 'row', marginBottom: 10, justifyContent: 'flex-start' },
  chatRowMine: { justifyContent: 'flex-end' },
  chatBubble: { maxWidth: '82%', borderRadius: Radius.md, paddingHorizontal: 12, paddingVertical: 8, borderWidth: 1, borderColor: Colors.border },
  chatBubbleOther: { backgroundColor: Colors.card },
  chatBubbleMine: { backgroundColor: Colors.primary },
  chatName: { color: Colors.primary, fontWeight: '700', fontSize: 12, marginBottom: 4 },
  chatNameMine: { color: 'rgba(255,255,255,0.9)' },
  chatText: { color: Colors.text2, fontSize: 14, lineHeight: 20 },
  chatTextMine: { color: '#fff' },
  chatReplyBtn: { marginTop: 6, alignSelf: 'flex-start' },
  chatReplyText: { color: Colors.primary, fontSize: 12, fontWeight: '700' },
  chatReplyTextMine: { color: 'rgba(255,255,255,0.9)' },
  chatTime: { color: Colors.text3, fontSize: 10, marginTop: 4 },
  chatTimeMine: { color: 'rgba(255,255,255,0.8)', textAlign: 'right' },
  chatReplyBanner: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 8, borderTopWidth: 1, borderColor: Colors.border, backgroundColor: Colors.primaryLight },
  chatReplyBannerText: { color: Colors.primaryDark, fontSize: 12, fontWeight: '700' },
  chatReplyBannerClose: { color: Colors.primary, fontSize: 12, fontWeight: '800' },
  chatInputRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, paddingHorizontal: 12, paddingVertical: 10, borderTopWidth: 1, borderColor: Colors.border, backgroundColor: Colors.card },
  chatInput: { flex: 1, maxHeight: 90, backgroundColor: Colors.bg, borderWidth: 1, borderColor: Colors.border, borderRadius: Radius.md, paddingHorizontal: 12, paddingVertical: 10, color: Colors.text, fontSize: 14 },
  chatSendBtn: { backgroundColor: Colors.primary, borderRadius: Radius.md, paddingHorizontal: 14, paddingVertical: 11 },
  chatSendBtnText: { color: '#fff', fontWeight: '700' },
  menuBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', justifyContent: 'flex-end' },
  menuSheet: { backgroundColor: Colors.card, borderTopLeftRadius: Radius.lg, borderTopRightRadius: Radius.lg, paddingVertical: 8, borderTopWidth: 1, borderColor: Colors.border },
  menuItem: { paddingVertical: 14, paddingHorizontal: 18 },
  menuItemText: { color: Colors.text, fontSize: 15, fontWeight: '700' },
  editBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 18 },
  editCard: { backgroundColor: Colors.card, borderRadius: Radius.lg, width: '100%', maxHeight: '85%', borderWidth: 1, borderColor: Colors.border, overflow: 'hidden' },
  editTitle: { color: Colors.text, fontSize: 17, fontWeight: '800', paddingHorizontal: 16, paddingTop: 16, paddingBottom: 10 },
  editScroll: { flexGrow: 0 },
  editScrollContent: { paddingHorizontal: 16, paddingBottom: 12 },
  editInput: { minHeight: 120, backgroundColor: Colors.bg, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.border, paddingHorizontal: 12, paddingVertical: 10, color: Colors.text, fontSize: 14, textAlignVertical: 'top' },
  editImageSection: { marginTop: 12, marginBottom: 8 },
  editImagePreview: { width: '100%', height: 180, borderRadius: Radius.md, backgroundColor: Colors.border },
  editImagePlaceholder: { width: '100%', height: 80, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.bg, alignItems: 'center', justifyContent: 'center' },
  editImagePlaceholderText: { color: Colors.text3, fontSize: 13, fontWeight: '600' },
  editImageActions: { flexDirection: 'row', gap: 8, marginTop: 8 },
  editSecondaryBtn: { flex: 1, paddingVertical: 8, paddingHorizontal: 12, borderRadius: Radius.md, backgroundColor: Colors.bg, borderWidth: 1, borderColor: Colors.border },
  editSecondaryBtnText: { color: Colors.text2, fontWeight: '700', fontSize: 13, textAlign: 'center' },
  editActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10, paddingHorizontal: 16, paddingBottom: 16, paddingTop: 12, borderTopWidth: 1, borderTopColor: Colors.border, backgroundColor: Colors.card },
  editCancelBtn: { paddingVertical: 10, paddingHorizontal: 14, borderRadius: Radius.md, backgroundColor: Colors.bg, borderWidth: 1, borderColor: Colors.border },
  editCancelText: { color: Colors.text2, fontWeight: '700' },
  editSaveBtn: { paddingVertical: 10, paddingHorizontal: 16, borderRadius: Radius.md, backgroundColor: Colors.primary },
  editSaveText: { color: '#fff', fontWeight: '700' },
});
