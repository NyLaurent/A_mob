import { View, Text, StyleSheet, Image, ScrollView, TouchableOpacity } from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { ArrowLeft, Heart, MessageCircle } from 'lucide-react-native';

export default function PostDetailsScreen() {
  const params = useLocalSearchParams();
  const id = params.id;
  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    console.log("Post ID from params:", id); // Debug log
    if (id) {
      fetchPost();
    } else {
      setLoading(false);
    }
  }, [id]);

  async function fetchPost() {
    try {
      console.log("Fetching post with ID:", id); // Debug log
      
      const { data, error } = await supabase
        .from('posts')
        .select(`
          *,
          profiles (
            id,
            username,
            avatar_url
          )
        `)
        .eq('id', id)
        .single();

      if (error) {
        console.error('Error fetching post:', error);
        return;
      }

      console.log("Post data received:", data); // Debug log
      setPost(data);
    } catch (error) {
      console.error('Error in fetchPost:', error);
    } finally {
      setLoading(false);
    }
  }

  // Rest of the component remains the same
  // ...
} 