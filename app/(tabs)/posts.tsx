import { View, Text, StyleSheet, FlatList, Image, TouchableOpacity, RefreshControl, TextInput } from 'react-native';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Database } from '@/types/supabase';
import { Heart, MessageCircle, Share2 } from 'lucide-react-native';
import { useRouter } from 'expo-router';

type Post = Database['public']['Tables']['posts']['Row'] & {
  profiles: Database['public']['Tables']['profiles']['Row'];
};

export default function PostsScreen() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const router = useRouter();
  const [likedPosts, setLikedPosts] = useState<Set<string>>(new Set());
  const [likeCounts, setLikeCounts] = useState<Record<string, number>>({});
  const [showComments, setShowComments] = useState<string | null>(null);
  const [newComment, setNewComment] = useState('');

  useEffect(() => {
    fetchPosts();
  }, []);

  async function fetchPosts() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from('posts')
      .select(`
        *,
        profiles (*)
      `)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching posts:', error);
      return;
    }

    if (data) {
      console.log('Fetched posts:', data);
      setPosts(data as Post[]);
    }
  }

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchPosts();
    setRefreshing(false);
  };

  const renderPost = ({ item }: { item: Post }) => (
    <TouchableOpacity
      key={item.id}
      style={styles.postCard}
      onPress={() => router.push(`/posts/${item.id}`)}
    >
      {item.image_url && (
        <Image
          source={{ uri: item.image_url }}
          style={styles.postImage}
          resizeMode="cover"
        />
      )}
      <View style={styles.postContent}>
        <Text style={styles.postTitle}>{item.title}</Text>
        {item.category && (
          <View style={styles.categoryBadge}>
            <Text style={styles.categoryText}>{item.category}</Text>
          </View>
        )}
        <Text style={styles.postText} numberOfLines={2}>
          {item.short_description || ""}
        </Text>
        <TouchableOpacity
          style={styles.readMoreButton}
          onPress={() => router.push(`/posts/${item.id}`)}
        >
          <Text style={styles.readMoreText}>Read More</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Posts</Text>
      </View>

      <FlatList
        data={posts}
        renderItem={renderPost}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.postsList}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
          />
        }
        removeClippedSubviews={true}
        maxToRenderPerBatch={5}
        windowSize={10}
        initialNumToRender={5}
        onEndReachedThreshold={0.5}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 20,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
  },
  postsList: {
    padding: 16,
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
  postHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  username: {
    fontSize: 16,
    fontWeight: '600',
  },
  timestamp: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
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
  postActions: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    padding: 12,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
  },
  actionText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#666',
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
  commentsSection: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  commentInput: {
    backgroundColor: '#f5f5f5',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    fontSize: 14,
  },
  storyPreview: {
    width: '100%',
    height: 400,
    marginVertical: 16,
  },
  captionInput: {
    fontSize: 16,
    padding: 16,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#fff',
  },
  modalContent: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
});