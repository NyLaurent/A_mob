import { View, Text, StyleSheet, TextInput, TouchableOpacity, Image } from 'react-native';
import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import * as ImagePicker from 'expo-image-picker';
import { useRouter, Stack } from 'expo-router';
import { Image as ImageIcon, X } from 'lucide-react-native';

export default function CreatePostScreen() {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [imageUri, setImageUri] = useState<string | null>(null);
  const router = useRouter();

  async function pickImage() {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 1,
    });

    if (!result.canceled) {
      setImageUri(result.assets[0].uri);
    }
  }

  async function createPost() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      let image_url = null;
      if (imageUri) {
        // Upload image to Supabase Storage
        const fileName = `${user.id}/${Date.now()}.jpg`;
        const response = await fetch(imageUri);
        const blob = await response.blob();
        
        const { data: imageData, error: uploadError } = await supabase
          .storage
          .from('post-images')
          .upload(fileName, blob);

        if (uploadError) {
          console.error('Error uploading image:', uploadError);
          return;
        }

        // Get public URL
        const { data: { publicUrl } } = supabase
          .storage
          .from('post-images')
          .getPublicUrl(fileName);

        image_url = publicUrl;
      }

      // Create post
      const { error: postError } = await supabase
        .from('posts')
        .insert({
          user_id: user.id,
          title,
          content,
          image_url,
        });

      if (postError) {
        console.error('Error creating post:', postError);
        return;
      }

      // Navigate back to posts
      router.push('/posts');

    } catch (error) {
      console.error('Error in createPost:', error);
    }
  }

  return (
    <>
      <Stack.Screen 
        options={{
          title: 'Create Post',
          headerShown: true,
          headerLeft: () => (
            <TouchableOpacity onPress={() => router.back()}>
              <Text style={styles.cancelButton}>Cancel</Text>
            </TouchableOpacity>
          ),
          headerRight: () => (
            <TouchableOpacity 
              onPress={createPost}
              disabled={!title || !content}
            >
              <Text style={[
                styles.postButton,
                (!title || !content) && styles.postButtonDisabled
              ]}>
                Post
              </Text>
            </TouchableOpacity>
          ),
        }} 
      />
      <View style={styles.container}>
        <View style={styles.form}>
          <TextInput
            style={styles.titleInput}
            placeholder="Title"
            value={title}
            onChangeText={setTitle}
            placeholderTextColor="#666"
          />

          <TextInput
            style={styles.contentInput}
            placeholder="What's on your mind?"
            value={content}
            onChangeText={setContent}
            multiline
            placeholderTextColor="#666"
          />

          {imageUri ? (
            <View style={styles.imagePreviewContainer}>
              <Image source={{ uri: imageUri }} style={styles.imagePreview} />
              <TouchableOpacity 
                style={styles.removeImageButton}
                onPress={() => setImageUri(null)}
              >
                <X size={24} color="#fff" />
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity style={styles.addImageButton} onPress={pickImage}>
              <ImageIcon size={24} color="#666" />
              <Text style={styles.addImageText}>Add Image</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  form: {
    padding: 20,
  },
  titleInput: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 16,
    padding: 12,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
  },
  contentInput: {
    fontSize: 16,
    marginBottom: 16,
    padding: 12,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    height: 150,
    textAlignVertical: 'top',
  },
  cancelButton: {
    fontSize: 16,
    color: '#666',
    marginLeft: 16,
  },
  postButton: {
    fontSize: 16,
    color: '#000',
    fontWeight: '600',
    marginRight: 16,
  },
  postButtonDisabled: {
    color: '#ccc',
  },
  addImageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
  },
  addImageText: {
    marginLeft: 8,
    fontSize: 16,
    color: '#666',
  },
  imagePreviewContainer: {
    position: 'relative',
  },
  imagePreview: {
    width: '100%',
    height: 200,
    borderRadius: 8,
  },
  removeImageButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 20,
    padding: 8,
  },
}); 