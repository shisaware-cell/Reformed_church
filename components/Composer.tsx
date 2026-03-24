import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, Image, ActivityIndicator, Alert, KeyboardAvoidingView, Platform, Keyboard, ScrollView } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { supabase } from '../lib/supabase';
import { guessImageContentType, guessImageExtension, uploadImageUriToStorage } from '@/lib/storage';
import { Colors, Radius, Shadow } from '../lib/theme';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import type { User } from '../lib/types';

interface ComposerProps {
  onClose: () => void;
  currentUser: User | null;
}

const Composer: React.FC<ComposerProps> = ({ onClose, currentUser }) => {
  const [content, setContent] = useState('');
  const [image, setImage] = useState<string | null>(null);
  const [posting, setPosting] = useState(false);

  const pickImage = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) return Alert.alert('Permission needed', 'Please allow photo access to share images.');
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
      allowsEditing: true,
    });
    if (!result.canceled) {
      setImage(result.assets[0].uri);
    }
  };

  const submitPost = async () => {
    if (!content.trim() && !image) return;
    if (!currentUser) return Alert.alert('Not signed in', 'You need to be signed in to create a post.');

    setPosting(true);
    let imageUrl: string | null = null;

    if (image) {
      try {
        const ext = guessImageExtension(image);
        const path = `posts/${currentUser.id}/post_${Date.now()}.${ext}`;
        imageUrl = await uploadImageUriToStorage({
          bucket: 'post-images',
          path,
          uri: image,
          contentType: guessImageContentType(image),
        });
      } catch (e: any) {
        Alert.alert('Image upload failed', e.message);
        setPosting(false);
        return;
      }
    }

    const { error } = await supabase.from('posts').insert({
      user_id: currentUser.id,
      content: content.trim(),
      image_url: imageUrl,
    });

    if (error) {
      Alert.alert('Post failed', error.message);
    } else {
      setContent('');
      setImage(null);
      onClose();
    }
    setPosting(false);
  };

  return (
    <KeyboardAvoidingView
      style={styles.modalBackdrop}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 40 : 0}
    >
      <TouchableOpacity
        activeOpacity={1}
        onPress={Keyboard.dismiss}
        style={StyleSheet.absoluteFillObject}
      />
      <View style={styles.modalContainer}>
        {/* Fixed header — always visible */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Create Post</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Text style={styles.closeButtonText}>✕</Text>
          </TouchableOpacity>
        </View>

        {/* Scrollable content area only — buttons live outside */}
        <ScrollView
          style={styles.formScroll}
          contentContainerStyle={styles.formScrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <TextInput
            style={styles.input}
            placeholder="What's on your mind?"
            placeholderTextColor={Colors.text3}
            multiline
            value={content}
            onChangeText={setContent}
          />
          {image && (
            <View style={styles.previewWrap}>
              <Image source={{ uri: image }} style={styles.previewImage} />
              <TouchableOpacity style={styles.removeImageBtn} onPress={() => setImage(null)}>
                <Text style={styles.removeImageText}>✕</Text>
              </TouchableOpacity>
            </View>
          )}
          <View style={styles.actions}>
            <TouchableOpacity onPress={pickImage} style={styles.actionButton}>
              <MaterialCommunityIcons name="image-plus" size={20} color={Colors.primary} />
              <Text style={styles.actionButtonText}>{image ? 'Change photo' : 'Add photo'}</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>

        {/* Fixed footer — ALWAYS visible, outside ScrollView */}
        <View style={styles.footerActions}>
          <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.postButton, (posting || (!content.trim() && !image)) && styles.postButtonDisabled]}
            onPress={submitPost}
            disabled={posting || (!content.trim() && !image)}
          >
            {posting ? <ActivityIndicator color="#fff" /> : <Text style={styles.postButtonText}>Post</Text>}
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  modalBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    backgroundColor: Colors.card,
    borderRadius: Radius.xl,
    width: '90%',
    maxHeight: '86%',
    paddingTop: 20,
    paddingHorizontal: 20,
    paddingBottom: 0,
    ...Shadow.lg,
    overflow: 'hidden',
  },
  formScroll: {
    flexShrink: 1,
  },
  formScrollContent: {
    paddingBottom: 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.text,
  },
  closeButton: {
    padding: 5,
  },
  closeButtonText: {
    fontSize: 18,
    color: Colors.text2,
  },
  input: {
    minHeight: 100,
    textAlignVertical: 'top',
    fontSize: 16,
    color: Colors.text,
    padding: 10,
    backgroundColor: Colors.bg,
    borderRadius: Radius.md,
    marginBottom: 10,
  },
  previewWrap: {
    position: 'relative',
    marginBottom: 10,
  },
  previewImage: {
    width: '100%',
    height: 200,
    borderRadius: Radius.md,
  },
  removeImageBtn: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  removeImageText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 16,
  },
  actions: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: Colors.primaryLight,
    borderWidth: 1,
    borderColor: Colors.primary,
    borderRadius: Radius.md,
  },
  actionButtonText: {
    color: Colors.primary,
    fontWeight: '700',
    fontSize: 13,
  },
  footerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 14,
    paddingHorizontal: 0,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    marginTop: 8,
  },
  postButton: {
    backgroundColor: Colors.primary,
    paddingVertical: 14,
    paddingHorizontal: 18,
    borderRadius: Radius.md,
    alignItems: 'center',
    flex: 1,
  },
  cancelButton: {
    paddingVertical: 14,
    paddingHorizontal: 18,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.bg,
  },
  cancelButtonText: {
    color: Colors.text2,
    fontWeight: '700',
  },
  postButtonDisabled: {
    opacity: 0.6,
  },
  postButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
});

export default Composer;
