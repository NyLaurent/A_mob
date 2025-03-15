import { View, Text, StyleSheet, ScrollView, Image, TouchableOpacity } from 'react-native';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Database } from '@/types/supabase';
import { useRouter } from 'expo-router';
import { Plus } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import { Camera } from 'lucide-react-native';

type Profile = Database['public']['Tables']['profiles']['Row'];
type Post = Database['public']['Tables']['posts']['Row'];
type Story = Database['public']['Tables']['stories']['Row'];

export default function HomeScreen() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [stories, setStories] = useState<Story[]>([]);
  const router = useRouter();
  const [storyImage, setStoryImage] = useState<string | null>(null);
  const [storyCaption, setStoryCaption] = useState('');
  const [showStoryForm, setShowStoryForm] = useState(false);

  useEffect(() => {
    fetchProfile();
    fetchPosts();
    fetchStories();
  }, []);

  async function fetchProfile() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('profiles')
        .select('id, username, full_name, avatar_url, role, created_at, updated_at')
        .eq('id', user.id)
        .single();

      if (error) {
        console.error('Error fetching profile:', error);
        return;
      }

      if (data) {
        setProfile(data);
      }
    } catch (error) {
      console.error('Error in fetchProfile:', error);
    }
  }

  async function fetchPosts() {
    const { data } = await supabase
      .from('posts')
      .select(`
        *,
        profiles (
          id,
          username,
          avatar_url
        )
      `)
      .order('created_at', { ascending: false })
      .limit(5);
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

  async function handleAddStory() {
    try {
      // Request permissions first
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permissionResult.granted) {
        alert('Permission to access camera roll is required!');
        return;
      }

      // Pick the image
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [9, 16],
        quality: 0.7,
        base64: true,
      });

      console.log('Image picker result:', result);

      if (!result.canceled) {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          alert('Please login first');
          return;
        }

        // Log the base64 string length to make sure we have data
        console.log('Base64 string length:', result.assets[0].base64?.length);

        // Create story with base64 image
        const { data, error: storyError } = await supabase
          .from('stories')
          .insert({
            user_id: user.id,
            image_url: result.assets[0].uri,
            caption: '',
          })
          .select()
          .single();

        if (storyError) {
          console.error('Error creating story:', storyError);
          alert('Failed to create story: ' + storyError.message);
          return;
        }

        console.log('Story created successfully:', data);
        
        // Refresh stories
        await fetchStories();
        
        alert('Story created successfully!');
      }
    } catch (error) {
      console.error('Detailed error in handleAddStory:', error);
      alert('Failed to create story: ' + (error as Error).message);
    }
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.greeting}>
          Hello, {profile?.username || 'Guest'}
        </Text>
      </View>

      {/* Stories */}
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        style={styles.storiesContainer}
        contentContainerStyle={styles.storiesList}
      >
        <TouchableOpacity 
          style={styles.storyItem}
          onPress={handleAddStory}
        >
          <View style={styles.addStoryButton}>
            <Plus size={24} color="#666" />
          </View>
          <Text style={styles.storyUsername}>Add Story</Text>
        </TouchableOpacity>

        {stories.map((story) => (
          <TouchableOpacity 
            key={story.id} 
            style={styles.storyItem}
            onPress={() => router.push(`/stories/${story.id}`)}
          >
            <View style={styles.storyRing}>
              <Image
                source={{ uri: story.image_url }}
                style={styles.storyImage}
              />
            </View>
            <Text style={styles.storyUsername} numberOfLines={1}>
              {story.profiles?.username}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Posts */}
      <View style={styles.posts}>
        {posts.map((post) => (
          <View key={post.id} style={styles.postCard}>
            <View style={styles.postHeader}>
              <Image
                source={{
                  uri: (post as any).profiles?.avatar_url ||
                    'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80'
                }}
                style={styles.authorAvatar}
              />
              <View style={styles.authorInfo}>
                <Text style={styles.authorName}>
                  {(post as any).profiles?.username}
                </Text>
                <Text style={styles.postDate}>
                  {new Date(post.created_at).toLocaleDateString()}
                </Text>
              </View>
            </View>
            
            {post.image_url && (
              <Image
                source={{ uri: post.image_url }}
                style={styles.postImage}
              />
            )}
            <View style={styles.postContent}>
              <Text style={styles.postTitle}>{post.title}</Text>
              <Text 
                style={styles.postText}
                numberOfLines={3}
              >
                {post.content}
              </Text>
              <TouchableOpacity 
                style={styles.readMoreButton}
                onPress={() => router.push('/posts')}
              >
                <Text style={styles.readMoreText}>Read More</Text>
              </TouchableOpacity>
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
    height: 104,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  storiesList: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  storyItem: {
    marginRight: 12,
    alignItems: 'center',
  },
  storyRing: {
    width: 68,
    height: 68,
    borderRadius: 34,
    padding: 2,
    backgroundColor: '#000',
  },
  storyImage: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 2,
    borderColor: '#fff',
  },
  storyUsername: {
    marginTop: 4,
    fontSize: 12,
    textAlign: 'center',
    width: 64,
  },
  addStoryButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  posts: {
    padding: 20,
  },
  postHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
  },
  authorAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  authorInfo: {
    flex: 1,
  },
  authorName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
  },
  postDate: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
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
    marginBottom: 12,
    lineHeight: 20,
  },
  readMoreButton: {
    alignSelf: 'flex-start',
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: '#f5f5f5',
    borderRadius: 15,
  },
  readMoreText: {
    fontSize: 14,
    color: '#000',
    fontWeight: '500',
  },
});