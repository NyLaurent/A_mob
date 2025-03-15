import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  TextInput,
} from 'react-native';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Database } from '@/types/supabase';
import { useRouter } from 'expo-router';
import { Plus, Heart, MessageCircle } from 'lucide-react-native';
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
  const [likedPosts, setLikedPosts] = useState<Set<string>>(new Set());
  const [likeCounts, setLikeCounts] = useState<Record<string, number>>({});
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    fetchProfile();
    fetchPosts();
    fetchStories();
    fetchCurrentUser();
  }, []);

  async function fetchProfile() {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('profiles')
        .select(
          'id, username, full_name, avatar_url, role, created_at, updated_at',
        )
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
      .select(
        `
        *,
        profiles (
          id,
          username,
          avatar_url
        )
      `,
      )
      .order('created_at', { ascending: false })
      .limit(5);
    if (data) setPosts(data);
  }

  async function fetchStories() {
    try {
      const { data, error } = await supabase
        .from('stories')
        .select(
          `
          *,
          profiles (username, avatar_url)
        `,
        )
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching stories:', error);
        return;
      }

      console.log('Fetched stories:', data);
      if (data) setStories(data);
    } catch (error) {
      console.error('Error in fetchStories:', error);
    }
  }

  async function fetchCurrentUser() {
    const { data } = await supabase.auth.getUser();
    if (data?.user) {
      setUserId(data.user.id);
      fetchLikedPosts(data.user.id);
    }
  }

  async function fetchLikedPosts(userId: string) {
    const { data, error } = await supabase
      .from('likes')
      .select('post_id')
      .eq('user_id', userId);

    if (error) {
      console.error('Error fetching liked posts:', error);
      return;
    }

    if (data) {
      const likedPostIds = new Set(data.map((like) => like.post_id));
      setLikedPosts(likedPostIds);
    }
  }

  async function fetchLikeCounts() {
    const { data, error } = await supabase
      .from('likes')
      .select('post_id, count')
      .group('post_id');

    if (error) {
      console.error('Error fetching like counts:', error);
      return;
    }

    if (data) {
      const counts: Record<string, number> = {};
      data.forEach((item) => {
        counts[item.post_id] = item.count;
      });
      setLikeCounts(counts);
    }
  }

  async function handleAddStory() {
    try {
      // Request permissions first
      const permissionResult =
        await ImagePicker.requestMediaLibraryPermissionsAsync();
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
        // Set the image and show the caption input form
        setStoryImage(result.assets[0].uri);
        setShowStoryForm(true);
      }
    } catch (error) {
      console.error('Detailed error in handleAddStory:', error);
      alert('Failed to select image: ' + (error as Error).message);
    }
  }

  async function submitStory() {
    try {
      if (!storyImage) {
        alert('Please select an image first');
        return;
      }

      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        alert('Please login first');
        return;
      }

      // Set expiration date to 24 hours from now
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 24);

      // Create story with image, caption and expiration
      const { data, error: storyError } = await supabase
        .from('stories')
        .insert({
          user_id: user.id,
          image_url: storyImage,
          caption: storyCaption,
          expires_at: expiresAt.toISOString(),
        })
        .select()
        .single();

      if (storyError) {
        console.error('Error creating story:', storyError);
        alert('Failed to create story: ' + storyError.message);
        return;
      }

      console.log('Story created successfully:', data);

      // Reset form and refresh stories
      setStoryImage(null);
      setStoryCaption('');
      setShowStoryForm(false);
      await fetchStories();

      alert('Story created successfully!');
    } catch (error) {
      console.error('Detailed error in submitStory:', error);
      alert('Failed to create story: ' + (error as Error).message);
    }
  }

  async function handleLike(postId: string, event: any) {
    event.stopPropagation(); // Prevent navigation to post details

    if (!userId) {
      alert('Please login to like posts');
      return;
    }

    try {
      const isLiked = likedPosts.has(postId);

      if (isLiked) {
        // Unlike
        const { error } = await supabase
          .from('likes')
          .delete()
          .eq('post_id', postId)
          .eq('user_id', userId);

        if (error) throw error;

        // Update state
        const newLikedPosts = new Set(likedPosts);
        newLikedPosts.delete(postId);
        setLikedPosts(newLikedPosts);

        setLikeCounts((prev) => ({
          ...prev,
          [postId]: (prev[postId] || 1) - 1,
        }));
      } else {
        // Like
        const { error } = await supabase.from('likes').insert({
          post_id: postId,
          user_id: userId,
        });

        if (error) throw error;

        // Update state
        const newLikedPosts = new Set(likedPosts);
        newLikedPosts.add(postId);
        setLikedPosts(newLikedPosts);

        setLikeCounts((prev) => ({
          ...prev,
          [postId]: (prev[postId] || 0) + 1,
        }));
      }
    } catch (error) {
      console.error('Error toggling like:', error);
      alert('Failed to update like');
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
        <TouchableOpacity style={styles.storyItem} onPress={handleAddStory}>
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

      {/* Story Form Modal */}
      {showStoryForm && (
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Create Story</Text>
              <TouchableOpacity
                onPress={() => {
                  setShowStoryForm(false);
                  setStoryImage(null);
                  setStoryCaption('');
                }}
              >
                <Text style={styles.closeButton}>X</Text>
              </TouchableOpacity>
            </View>

            {storyImage && (
              <Image
                source={{ uri: storyImage }}
                style={styles.previewImage}
                resizeMode="cover"
              />
            )}

            <TextInput
              style={styles.captionInput}
              placeholder="Add a caption..."
              value={storyCaption}
              onChangeText={setStoryCaption}
              multiline
            />

            <TouchableOpacity style={styles.submitButton} onPress={submitStory}>
              <Text style={styles.submitButtonText}>Post Story</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Posts */}
      <View style={styles.posts}>
        {posts.map((post) => (
          <TouchableOpacity
            key={post.id}
            style={styles.postCard}
            onPress={() => router.push(`/posts/${post.id}`)}
          >
            {post.image_url && (
              <Image
                source={{ uri: post.image_url }}
                style={styles.postImage}
                resizeMode="cover"
              />
            )}
            <View style={styles.postContent}>
              <Text style={styles.postTitle}>{post.title}</Text>
              {post.category && (
                <View style={styles.categoryBadge}>
                  <Text style={styles.categoryText}>{post.category}</Text>
                </View>
              )}
              <Text style={styles.postText} numberOfLines={2}>
                {post.short_description || ''}
              </Text>

              <View style={styles.postActions}>
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={(e) => handleLike(post.id, e)}
                >
                  <Heart
                    size={18}
                    color={likedPosts.has(post.id) ? '#ff3b30' : '#666'}
                    fill={likedPosts.has(post.id) ? '#ff3b30' : 'none'}
                  />
                  <Text style={styles.actionText}>
                    {likeCounts[post.id] || 0}{' '}
                    {likeCounts[post.id] === 1 ? 'Like' : 'Likes'}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={() => router.push(`/posts/${post.id}`)}
                >
                  <MessageCircle size={18} color="#666" />
                  <Text style={styles.actionText}>Comment</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.readMoreButton}
                  onPress={() => router.push(`/posts/${post.id}`)}
                >
                  <Text style={styles.readMoreText}>Read More</Text>
                </TouchableOpacity>
              </View>
            </View>
          </TouchableOpacity>
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
  postCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 16,
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
    height: 150,
  },
  postContent: {
    padding: 15,
  },
  postTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  categoryBadge: {
    backgroundColor: '#e6f7ff',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
    marginBottom: 8,
  },
  categoryText: {
    color: '#0066ff',
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
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
  postActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  actionText: {
    marginLeft: 4,
    fontSize: 14,
    color: '#666',
  },
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  modalContent: {
    width: '90%',
    backgroundColor: 'white',
    borderRadius: 15,
    padding: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  modalHeader: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  closeButton: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#666',
  },
  previewImage: {
    width: '100%',
    height: 300,
    borderRadius: 10,
    marginBottom: 15,
  },
  captionInput: {
    width: '100%',
    height: 80,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    padding: 10,
    marginBottom: 15,
    textAlignVertical: 'top',
  },
  submitButton: {
    width: '100%',
    backgroundColor: '#0066ff',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
  },
  submitButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
});
