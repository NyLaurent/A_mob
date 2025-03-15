import { View, Text, StyleSheet, Image, ScrollView, TouchableOpacity } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Database } from '@/types/supabase';
import { ArrowLeft, Heart, MessageCircle } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type Post = Database['public']['Tables']['posts']['Row'] & {
  profiles: Database['public']['Tables']['profiles']['Row'];
};

export default function PostDetailsScreen() {
  const { id } = useLocalSearchParams();
  const [post, setPost] = useState<Post | null>(null);
  const router = useRouter();

  useEffect(() => {
    fetchPost();
  }, [id]);

  async function fetchPost() {
    const { data, error } = await supabase
      .from('posts')
      .select(`
        *,
        profiles (*)
      `)
      .eq('id', id)
      .single();

    if (error) {
      console.error('Error fetching post:', error);
      return;
    }

    if (data) setPost(data as Post);
  }

  if (!post) return null;

  return (
    <SafeAreaView style={styles.container}>
      <TouchableOpacity 
        style={styles.backButton}
        onPress={() => router.back()}
      >
        <ArrowLeft size={24} color="#000" />
      </TouchableOpacity>
      
      <ScrollView>
        <View style={styles.header}>
          <View style={styles.authorInfo}>
            <Image
              source={{
                uri: post.profiles?.avatar_url ||
                  'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80'
              }}
              style={styles.avatar}
            />
            <View>
              <Text style={styles.username}>{post.profiles?.username}</Text>
              <Text style={styles.date}>
                {new Date(post.created_at).toLocaleDateString()}
              </Text>
            </View>
          </View>
        </View>

        {post.image_url && (
          <Image
            source={{ uri: post.image_url }}
            style={styles.postImage}
            resizeMode="cover"
          />
        )}

        <View style={styles.content}>
          <Text style={styles.title}>{post.title}</Text>
          
          {post.category && (
            <View style={styles.categoryBadge}>
              <Text style={styles.categoryText}>{post.category}</Text>
            </View>
          )}
          
          <Text style={styles.description}>{post.short_description}</Text>
          <Text style={styles.text}>{post.content}</Text>
          
          <View style={styles.actions}>
            <TouchableOpacity style={styles.actionButton}>
              <Heart size={24} color="#666" />
              <Text style={styles.actionText}>Like</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.actionButton}>
              <MessageCircle size={24} color="#666" />
              <Text style={styles.actionText}>Comment</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  backButton: {
    padding: 16,
  },
  header: {
    padding: 16,
  },
  authorInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  username: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  date: {
    fontSize: 14,
    color: '#666',
  },
  postImage: {
    width: '100%',
    height: 250,
  },
  content: {
    padding: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  categoryBadge: {
    backgroundColor: '#e6f7ff',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
    marginBottom: 16,
  },
  categoryText: {
    color: '#0066ff',
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  description: {
    fontSize: 18,
    fontWeight: '500',
    marginBottom: 16,
    lineHeight: 24,
  },
  text: {
    fontSize: 16,
    lineHeight: 24,
    color: '#333',
    marginBottom: 24,
  },
  actions: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: '#eee',
    paddingTop: 16,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 24,
    paddingVertical: 8,
  },
  actionText: {
    marginLeft: 8,
    fontSize: 16,
    color: '#666',
  },
}); 