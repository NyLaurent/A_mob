import {
  View,
  Text,
  StyleSheet,
  Image,
  ScrollView,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Database } from '@/types/supabase';
import { ArrowLeft, Heart, MessageCircle, Send } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type Post = Database['public']['Tables']['posts']['Row'] & {
  profiles: Database['public']['Tables']['profiles']['Row'];
};

type Comment = Database['public']['Tables']['comments']['Row'];
type Profile = Database['public']['Tables']['profiles']['Row'];

export default function PostDetailsScreen() {
  const { id } = useLocalSearchParams();
  const [post, setPost] = useState<Post | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [isLiked, setIsLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [userId, setUserId] = useState<string | null>(null);
  const [commentProfiles, setCommentProfiles] = useState<
    Record<string, Profile>
  >({});
  const router = useRouter();

  useEffect(() => {
    fetchCurrentUser();
    fetchPost();
    fetchComments();
    checkIfLiked();
    fetchLikeCount();
  }, [id]);

  async function fetchCurrentUser() {
    const { data } = await supabase.auth.getUser();
    if (data?.user) {
      setUserId(data.user.id);
    }
  }

  async function fetchPost() {
    const { data, error } = await supabase
      .from('posts')
      .select(
        `
        *,
        profiles (*)
      `,
      )
      .eq('id', id)
      .single();

    if (error) {
      console.error('Error fetching post:', error);
      return;
    }

    if (data) setPost(data as Post);
  }

  async function fetchComments() {
    const { data: commentsData, error: commentsError } = await supabase
      .from('comments')
      .select('*')
      .eq('post_id', id)
      .order('created_at', { ascending: true });

    if (commentsError) {
      console.error('Error fetching comments:', commentsError);
      return;
    }

    if (commentsData && commentsData.length > 0) {
      setComments(commentsData as Comment[]);

      const userIds = [
        ...new Set(commentsData.map((comment) => comment.user_id)),
      ];

      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .in('id', userIds);

      if (profilesError) {
        console.error('Error fetching comment profiles:', profilesError);
        return;
      }

      if (profilesData) {
        const profileMap: Record<string, Profile> = {};
        profilesData.forEach((profile) => {
          profileMap[profile.id] = profile;
        });
        setCommentProfiles(profileMap);
      }
    } else {
      setComments([]);
    }
  }

  async function checkIfLiked() {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from('likes')
      .select('*')
      .eq('post_id', id)
      .eq('user_id', user.id)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('Error checking like status:', error);
      return;
    }

    setIsLiked(!!data);
  }

  async function fetchLikeCount() {
    const { count, error } = await supabase
      .from('likes')
      .select('*', { count: 'exact', head: true })
      .eq('post_id', id);

    if (error) {
      console.error('Error fetching like count:', error);
      return;
    }

    setLikeCount(count || 0);
  }

  async function handleLike() {
    if (!userId) {
      alert('Please login to like posts');
      return;
    }

    try {
      if (isLiked) {
        // Unlike
        const { error } = await supabase
          .from('likes')
          .delete()
          .eq('post_id', id)
          .eq('user_id', userId);

        if (error) throw error;
        setIsLiked(false);
        setLikeCount((prev) => prev - 1);
      } else {
        // Like
        const { error } = await supabase.from('likes').insert({
          post_id: id as string,
          user_id: userId,
        });

        if (error) throw error;
        setIsLiked(true);
        setLikeCount((prev) => prev + 1);
      }
    } catch (error) {
      console.error('Error toggling like:', error);
      alert('Failed to update like');
    }
  }

  async function submitComment() {
    if (!newComment.trim() || !userId) return;

    try {
      const { data, error } = await supabase
        .from('comments')
        .insert({
          post_id: id as string,
          user_id: userId,
          content: newComment.trim(),
        })
        .select('*')
        .single();

      if (error) {
        console.error('Error adding comment:', error);
        return;
      }

      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (profileData) {
        setCommentProfiles((prev) => ({
          ...prev,
          [userId]: profileData,
        }));
      }

      setComments((prev) => [...prev, data as Comment]);
      setNewComment('');
    } catch (error) {
      console.error('Error in submitComment:', error);
    }
  }

  if (!post) return null;

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={{ flex: 1 }}
    >
      <SafeAreaView style={styles.container}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <ArrowLeft size={24} color="#000" />
        </TouchableOpacity>

        <ScrollView style={styles.scrollContainer}>
          <View style={styles.header}>
            <View style={styles.authorInfo}>
              <Image
                source={{
                  uri:
                    post.profiles?.avatar_url ||
                    'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80',
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
              <TouchableOpacity
                style={styles.actionButton}
                onPress={handleLike}
              >
                <Heart
                  size={24}
                  color={isLiked ? '#ff3b30' : '#666'}
                  fill={isLiked ? '#ff3b30' : 'none'}
                />
                <Text style={styles.actionText}>
                  {likeCount} {likeCount === 1 ? 'Like' : 'Likes'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.actionButton}>
                <MessageCircle size={24} color="#666" />
                <Text style={styles.actionText}>
                  {comments.length}{' '}
                  {comments.length === 1 ? 'Comment' : 'Comments'}
                </Text>
              </TouchableOpacity>
            </View>

            <View style={styles.commentsSection}>
              <Text style={styles.commentsHeader}>Comments</Text>

              {comments.length === 0 ? (
                <Text style={styles.noComments}>
                  No comments yet. Be the first to comment!
                </Text>
              ) : (
                comments.map((comment) => {
                  const profile = commentProfiles[comment.user_id];
                  return (
                    <View key={comment.id} style={styles.commentItem}>
                      <Image
                        source={{
                          uri:
                            profile?.avatar_url ||
                            'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80',
                        }}
                        style={styles.commentAvatar}
                      />
                      <View style={styles.commentContent}>
                        <Text style={styles.commentUsername}>
                          {profile?.username || 'Anonymous'}
                        </Text>
                        <Text style={styles.commentText}>
                          {comment.content}
                        </Text>
                        <Text style={styles.commentDate}>
                          {new Date(comment.created_at).toLocaleString()}
                        </Text>
                      </View>
                    </View>
                  );
                })
              )}
            </View>
          </View>
        </ScrollView>

        <View style={styles.commentInputContainer}>
          <TextInput
            style={styles.commentInput}
            placeholder="Add a comment..."
            value={newComment}
            onChangeText={setNewComment}
            multiline
          />
          <TouchableOpacity
            style={[
              styles.sendButton,
              !newComment.trim() && styles.sendButtonDisabled,
            ]}
            onPress={submitComment}
            disabled={!newComment.trim()}
          >
            <Send size={20} color={newComment.trim() ? '#fff' : '#ccc'} />
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  scrollContainer: {
    flex: 1,
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
    marginBottom: 24,
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
  commentsSection: {
    marginTop: 8,
  },
  commentsHeader: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  noComments: {
    color: '#666',
    fontStyle: 'italic',
    marginBottom: 16,
  },
  commentItem: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  commentAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginRight: 12,
  },
  commentContent: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    padding: 12,
    borderRadius: 12,
  },
  commentUsername: {
    fontWeight: 'bold',
    marginBottom: 4,
  },
  commentText: {
    fontSize: 14,
    marginBottom: 4,
  },
  commentDate: {
    fontSize: 12,
    color: '#999',
  },
  commentInputContainer: {
    flexDirection: 'row',
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: '#eee',
    alignItems: 'center',
  },
  commentInput: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    maxHeight: 100,
  },
  sendButton: {
    backgroundColor: '#0066ff',
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  sendButtonDisabled: {
    backgroundColor: '#f0f0f0',
  },
});
