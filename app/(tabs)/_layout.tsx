import { Tabs } from 'expo-router';
import { Chrome as Home, MessageSquare, FileText, User, Plus } from 'lucide-react-native';
import { TouchableOpacity, StyleSheet, View } from 'react-native';
import { BlurView } from 'expo-blur';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { RealtimeChannel } from '@supabase/supabase-js';

export default function TabLayout() {
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    fetchUnreadCount();
    let subscription: RealtimeChannel;
    
    // Subscribe to both messages and chat_participants tables
    const setupSubscription = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      subscription = supabase
        .channel('unread-notifications')
        .on('postgres_changes', {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `recipient_id=eq.${user.id}`,
        }, () => {
          fetchUnreadCount();
        })
        .on('postgres_changes', {
          event: 'UPDATE',
          schema: 'public',
          table: 'chat_participants',
          filter: `user_id=eq.${user.id}`,
        }, () => {
          fetchUnreadCount();
        })
        .subscribe();
    };

    setupSubscription();
    
    return () => {
      if (subscription) subscription.unsubscribe();
    };
  }, []);

  async function fetchUnreadCount() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get all unread messages count
      const { data, error } = await supabase
        .from('chat_participants')
        .select('unread_messages')
        .eq('user_id', user.id);

      if (error) {
        console.error('Error fetching unread count:', error);
        return;
      }

      if (data) {
        const total = data.reduce((sum, item) => sum + (item.unread_messages || 0), 0);
        setUnreadCount(total);
      }
    } catch (error) {
      console.error('Error in fetchUnreadCount:', error);
    }
  }

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: styles.tabBar,
        tabBarShowLabel: false,
        tabBarBackground: () => (
          <BlurView intensity={100} style={StyleSheet.absoluteFill} />
        ),
      }}>
      <Tabs.Screen
        name="index"
        options={{
          tabBarIcon: ({ color }) => <Home size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="messages"
        options={{
          tabBarIcon: ({ color }) => <MessageSquare size={24} color={color} />,
          title: 'Messages',
          tabBarBadge: unreadCount > 0 ? unreadCount : undefined,
          tabBarBadgeStyle: {
            backgroundColor: '#ff3b30',
          }
        }}
      />
      <Tabs.Screen
        name="create"
        options={{
          tabBarIcon: () => (
            <View style={styles.createButton}>
              <Plus size={24} color="#fff" />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="posts"
        options={{
          tabBarIcon: ({ color }) => <FileText size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          tabBarIcon: ({ color }) => <User size={24} color={color} />,
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
    borderRadius: 20,
    height: 65,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    borderTopWidth: 0,
    elevation: 0,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 10,
    },
    shadowOpacity: 0.25,
    shadowRadius: 10,
  },
  createButton: {
    width: 48,
    height: 48,
    backgroundColor: '#000',
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 35,
  },
});