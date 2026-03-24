import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, TextInput, TouchableOpacity, FlatList, StyleSheet, ActivityIndicator, Image, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import BottomSheet, { BottomSheetFlatList, BottomSheetTextInput } from '@gorhom/bottom-sheet';
import type { BottomSheetMethods } from '@gorhom/bottom-sheet/lib/typescript/types';
import { supabase } from '../lib/supabase';
import { PostComment, Post as PostType } from '../lib/types';
import { Colors, Radius, Shadow } from '../lib/theme';

interface CommentSheetProps {
  post: PostType | null;
  commentSheetRef: React.RefObject<BottomSheetMethods | null>;
  onClose: () => void;
}

const CommentSheet: React.FC<CommentSheetProps> = ({ post, commentSheetRef, onClose }) => {
  const [comments, setComments] = useState<PostComment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [replyTo, setReplyTo] = useState<PostComment | null>(null);
  const [loading, setLoading] = useState(true);
  const snapPoints = useMemo(() => ['100%'], []);

  type ThreadItem = { comment: PostComment; depth: number };

  const threadedComments = useMemo<ThreadItem[]>(() => {
    const byParent: Record<string, PostComment[]> = {};
    const topLevel: PostComment[] = [];

    for (const c of comments) {
      if (c.parent_comment_id) {
        (byParent[c.parent_comment_id] ||= []).push(c);
      } else {
        topLevel.push(c);
      }
    }

    const sortByCreatedAt = (a: PostComment, b: PostComment) => {
      const at = new Date(a.created_at).getTime();
      const bt = new Date(b.created_at).getTime();
      return at - bt;
    };

    topLevel.sort(sortByCreatedAt);
    for (const parentId of Object.keys(byParent)) {
      byParent[parentId].sort(sortByCreatedAt);
    }

    const out: ThreadItem[] = [];
    const visit = (comment: PostComment, depth: number) => {
      out.push({ comment, depth });
      const kids = byParent[comment.id] || [];
      for (const child of kids) visit(child, Math.min(depth + 1, 2));
    };

    for (const c of topLevel) visit(c, 0);
    return out;
  }, [comments]);

  useEffect(() => {
    if (post?.id) {
      fetchComments();
    }
    setReplyTo(null);
    setNewComment('');
  }, [post?.id]);

  const fetchComments = async () => {
    if (!post?.id) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('post_comments')
      .select('*, user:users(name, profile_image_url)')
      .eq('post_id', post.id)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching comments:', error);
    } else {
      setComments(data as any);
    }
    setLoading(false);
  };

  const handleAddComment = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!newComment.trim() || !user?.id || !post?.id) return;

    const { data, error } = await supabase
      .from('post_comments')
      .insert([
        {
          content: newComment.trim(),
          user_id: user.id,
          post_id: post.id,
          parent_comment_id: replyTo?.id ?? null,
        },
      ])
      .select('*, user:users(name, profile_image_url)')
      .single();

    if (error) {
      console.error('Error adding comment:', error);
      if (error.code === '42703') {
        Alert.alert(
          'Database update needed',
          'The posts table is missing comments_count. Please run: ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS comments_count integer NOT NULL DEFAULT 0;'
        );
      } else {
        Alert.alert('Comment failed', error.message || 'Please try again');
      }
    } else if (data) {
      setComments((prev) => [...prev, data as any]);
      setNewComment('');
      setReplyTo(null);
    }
  };

  const renderComment = ({ item }: { item: ThreadItem }) => (
    <View style={[styles.commentContainer, item.depth > 0 && { marginLeft: 18 * item.depth }]}>
      {item.comment.user?.profile_image_url ? (
        <Image source={{ uri: item.comment.user.profile_image_url + '?v=' + new Date(item.comment.created_at).getTime() }} style={styles.avatar} />
      ) : (
        <View style={styles.avatarFallback}>
          <Text style={styles.avatarFallbackText}>
            {(item.comment.user?.name || 'Member').trim().charAt(0).toUpperCase()}
          </Text>
        </View>
      )}
      <View style={styles.commentContent}>
        <Text style={styles.userName}>{item.comment.user?.name || 'Member'}</Text>
        <Text style={styles.commentText}>{item.comment.content}</Text>
        <View style={styles.commentMetaRow}>
          <Text style={styles.commentMetaText}>{new Date(item.comment.created_at).toLocaleString()}</Text>
          <TouchableOpacity onPress={() => setReplyTo(item.comment)} activeOpacity={0.85}>
            <Text style={styles.replyText}>Reply</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  return (
    <BottomSheet
      ref={commentSheetRef}
      index={-1}
      snapPoints={snapPoints}
      enablePanDownToClose
      onClose={onClose}
      enableDynamicSizing={false}
      backgroundStyle={{ backgroundColor: Colors.card }}
      handleIndicatorStyle={{ backgroundColor: Colors.text3 }}
    >
      <KeyboardAvoidingView 
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        <View style={styles.container}>
          <View style={styles.header}>
            <TouchableOpacity onPress={() => commentSheetRef.current?.close()} style={styles.closeBtn} hitSlop={10}>
              <Text style={styles.closeBtnText}>✕</Text>
            </TouchableOpacity>
            <Text style={styles.title}>Comments</Text>
            <View style={{ width: 34 }} />
          </View>
          {loading ? (
            <ActivityIndicator color={Colors.primary} style={{ flex: 1 }} />
          ) : (
            <BottomSheetFlatList
              data={threadedComments}
              renderItem={renderComment}
              keyExtractor={(item: ThreadItem) => item.comment.id.toString()}
              contentContainerStyle={styles.listContent}
              ListEmptyComponent={<Text style={styles.noComments}>No comments yet. Be the first!</Text>}
            />
          )}
          {replyTo && (
            <View style={styles.replyBanner}>
              <Text style={styles.replyBannerText}>Replying to {replyTo.user?.name || 'Member'}</Text>
              <TouchableOpacity onPress={() => setReplyTo(null)} hitSlop={10}>
                <Text style={styles.replyBannerClose}>✕</Text>
              </TouchableOpacity>
            </View>
          )}
          <View style={styles.inputContainer}>
            <BottomSheetTextInput
              style={styles.input}
              placeholder={replyTo ? 'Write a reply…' : 'Add a comment…'}
              placeholderTextColor={Colors.text3}
              value={newComment}
              onChangeText={setNewComment}
            />
            <TouchableOpacity style={styles.sendButton} onPress={handleAddComment}>
              <Text style={styles.sendButtonText}>{replyTo ? 'Reply' : 'Post'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </BottomSheet>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 8,
    paddingBottom: 12,
  },
  closeBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeBtnText: {
    color: Colors.text2,
    fontSize: 20,
    fontWeight: '700',
    lineHeight: 22,
  },
  title: {
    fontSize: 16,
    fontWeight: '800',
    color: Colors.text,
    textAlign: 'center',
    letterSpacing: 0.3,
  },
  listContent: {
    paddingBottom: 20,
  },
  commentContainer: {
    flexDirection: 'row',
    marginBottom: 20,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    marginRight: 12,
    backgroundColor: Colors.border,
  },
  avatarFallback: {
    width: 36,
    height: 36,
    borderRadius: 18,
    marginRight: 12,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarFallbackText: {
    color: Colors.primary,
    fontSize: 14,
    fontWeight: '800',
  },
  commentContent: {
    flex: 1,
  },
  userName: {
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 4,
    fontSize: 14,
  },
  commentText: {
    color: Colors.text2,
    fontSize: 15,
    lineHeight: 21,
  },
  commentMetaRow: {
    marginTop: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  commentMetaText: {
    color: Colors.text3,
    fontSize: 12,
  },
  replyText: {
    color: Colors.primary,
    fontWeight: '700',
    fontSize: 12,
  },
  replyBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  replyBannerText: {
    color: Colors.text2,
    fontSize: 13,
    fontWeight: '700',
  },
  replyBannerClose: {
    color: Colors.text3,
    fontSize: 16,
    fontWeight: '700',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    padding: 12,
    paddingBottom: Platform.OS === 'ios' ? 30 : 12,
  },
  input: {
    flex: 1,
    backgroundColor: Colors.bg,
    borderRadius: Radius.lg,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 15,
    color: Colors.text,
    marginRight: 10,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  sendButton: {
    backgroundColor: Colors.primary,
    borderRadius: Radius.md,
    paddingVertical: 12,
    paddingHorizontal: 20,
    ...Shadow.sm,
  },
  sendButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 15,
  },
  noComments: {
    textAlign: 'center',
    color: Colors.text3,
    marginTop: 40,
    fontSize: 15,
  },
});

export default CommentSheet;
