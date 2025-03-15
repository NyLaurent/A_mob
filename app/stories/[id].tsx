import { View, Text, StyleSheet, Image, TouchableOpacity, Dimensions } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Database } from '@/types/supabase';
import { X } from 'lucide-react-native';

type Story = Database['public']['Tables']['stories']['Row'] & {
  profiles: Database['public']['Tables']['profiles']['Row'];
};

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

export default function StoryViewScreen() {
  const { id } = useLocalSearchParams();
  const [story, setStory] = useState<Story | null>(null);
  const router = useRouter();

  useEffect(() => {
    fetchStory();
  }, [id]);

  async function fetchStory() {
    const { data } = await supabase
      .from('stories')
      .select(`
        *,
        profiles (*)
      `)
      .eq('id', id)
      .single();

    if (data) setStory(data as Story);
  }

  if (!story) return null;

  return (
    <View style={styles.container}>
      <Image
        source={{ uri: story.image_url }}
        style={styles.storyImage}
        resizeMode="cover"
      />
      
      <View style={styles.header}>
        <View style={styles.userInfo}>
          <Image
            source={{
              uri: story.profiles?.avatar_url ||
                'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80'
            }}
            style={styles.avatar}
          />
          <View>
            <Text style={styles.username}>{story.profiles?.username}</Text>
            <Text style={styles.timestamp}>
              {new Date(story.created_at).toLocaleTimeString()}
            </Text>
          </View>
        </View>
        
        <TouchableOpacity 
          style={styles.closeButton}
          onPress={() => router.back()}
        >
          <X size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      {story.caption && (
        <View style={styles.captionContainer}>
          <Text style={styles.caption}>{story.caption}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  storyImage: {
    width: screenWidth,
    height: screenHeight,
    position: 'absolute',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingTop: 60,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
    borderWidth: 2,
    borderColor: '#fff',
  },
  username: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  timestamp: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 12,
    marginTop: 2,
  },
  closeButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  captionContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  caption: {
    color: '#fff',
    fontSize: 16,
    lineHeight: 24,
  },
}); 