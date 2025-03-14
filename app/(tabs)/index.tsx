import { View, Text, StyleSheet, ScrollView, Image } from 'react-native';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Database } from '@/types/supabase';

type Profile = Database['public']['Tables']['profiles']['Row'];
type Post = Database['public']['Tables']['posts']['Row'];
type Story = Database['public']['Tables']['stories']['Row'];

export default function HomeScreen() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [stories, setStories] = useState<Story[]>([]);

  useEffect(() => {
    fetchProfile();
    fetchPosts();
    fetchStories();
  }, []);

  async function fetchProfile() {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data } = await supabase
        .from('profiles')
        .select()
        .eq('id', user.id)
        .single();
      setProfile(data);
    }
  }

  async function fetchPosts() {
    const { data } = await supabase
      .from('posts')
      .select(`
        *,
        profiles (username, avatar_url)
      `)
      .order('created_at', { ascending: false })
      .limit(10);
    if (data) setPosts(data);
  }

  async function fetchStories() {
    const { data } = await supabase
      .from('stories')
      .select(`
        *,
        profiles (username, avatar_url)
      `)
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false });
    if (data) setStories(data);
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.greeting}>
          Hello, {profile?.username || 'User'}
        </Text>
      </View>

      {/* Stories */}
      <ScrollView horizontal style={styles.storiesContainer}>
        {stories.map((story) => (
          <View key={story.id} style={styles.storyItem}>
            <Image
              source={{ uri: story.image_url }}
              style={styles.storyImage}
            />
            <Text style={styles.storyUsername}>
              {(story as any).profiles?.username}
            </Text>
          </View>
        ))}
      </ScrollView>

      {/* Posts */}
      <View style={styles.posts}>
        {posts.map((post) => (
          <View key={post.id} style={styles.postCard}>
            {post.image_url && (
              <Image
                source={{ uri: post.image_url }}
                style={styles.postImage}
              />
            )}
            <View style={styles.postContent}>
              <Text style={styles.postTitle}>{post.title}</Text>
              <Text style={styles.postText}>{post.content}</Text>
              <Text style={styles.postMeta}>
                By {(post as any).profiles?.username} • {new Date(post.created_at).toLocaleDateString()}
              </Text>
            </View>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    padding: 20,
    paddingTop: 60,
    backgroundColor: '#fff',
  },
  greeting: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  storiesContainer: {
    padding: 20,
    backgroundColor: '#fff',
  },
  storyItem: {
    marginRight: 15,
    alignItems: 'center',
  },
  storyImage: {
    width: 70,
    height: 70,
    borderRadius: 35,
    borderWidth: 2,
    borderColor: '#000',
  },
  storyUsername: {
    marginTop: 5,
    fontSize: 12,
  },
  posts: {
    padding: 20,
  },
  postCard: {
    backgroundColor: '#fff',
    borderRadius: 15,
    marginBottom: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  postImage: {
    width: '100%',
    height: 200,
  },
  postContent: {
    padding: 15,
  },
  postTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  postText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  postMeta: {
    fontSize: 12,
    color: '#999',
  },
});