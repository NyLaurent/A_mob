import { View, Text, StyleSheet, FlatList, TextInput, TouchableOpacity, Image, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import { useEffect, useState, useRef } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { Database } from '@/types/supabase';
import { ArrowLeft, Send } from 'lucide-react-native';
import React from 'react';

type Message = Database['public']['Tables']['messages']['Row'] & {
  profiles: Database['public']['Tables']['profiles']['Row'];
};

type Profile = Database['public']['Tables']['profiles']['Row'];

export default function ChatScreen() {
  const { chatId, otherUser } = useLocalSearchParams();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [currentUser, setCurrentUser] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const flatListRef = useRef<FlatList>(null);
  const router = useRouter();

  useEffect(() => {
    fetchMessages();
    fetchCurrentUser();
    const subscription = subscribeToMessages();
    return () => {
      subscription.unsubscribe();
    };
  }, []);

  async function fetchCurrentUser() {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data } = await supabase
        .from('profiles')
        .select()
        .eq('id', user.id)
        .single();
      setCurrentUser(data);
    }
  }

  async function fetchMessages() {
    setIsLoading(true);
    try {
      const { data } = await supabase
        .from('messages')
        .select(`
          *,
          profiles (*)
        `)
        .eq('chat_id', chatId)
        .order('created_at', { ascending: true });

      if (data) {
        setMessages(data as Message[]);
        // Delay scrolling to end until after render
        requestAnimationFrame(() => {
          flatListRef.current?.scrollToEnd({ animated: false });
        });
      }
    } catch (error) {
      console.error('Error fetching messages:', error);
    } finally {
      setIsLoading(false);
    }
  }

  function subscribeToMessages() {
    return supabase
      .channel(`chat:${chatId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `chat_id=eq.${chatId}`,
      }, async (payload) => {
        // Only fetch and add the new message if it wasn't sent by the current user
        if (payload.new.user_id !== currentUser?.id) {
          const { data } = await supabase
            .from('messages')
            .select(`
              *,
              profiles (*)
            `)
            .eq('id', payload.new.id)
            .single();

          if (data) {
            setMessages(prevMessages => [...prevMessages, data as Message]);
            setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 50);
          }
        }
      })
      .subscribe();
  }

  async function sendMessage() {
    if (!newMessage.trim() || !currentUser) return;

    // Create message object
    const newMessageObj: Message = {
      id: Date.now().toString(), // temporary ID for optimistic update
      chat_id: chatId as string,
      user_id: currentUser.id,
      content: newMessage.trim(),
      created_at: new Date().toISOString(),
      profiles: currentUser // include current user's profile
    };

    // Clear input immediately
    setNewMessage('');

    // Optimistically add message to UI
    setMessages(prevMessages => [...prevMessages, newMessageObj]);
    
    // Scroll to bottom immediately
    setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 50);

    // Send to Supabase
    const { error } = await supabase
      .from('messages')
      .insert({
        chat_id: chatId as string,
        user_id: currentUser.id,
        content: newMessageObj.content,
      });

    if (error) {
      console.error('Error sending message:', error);
      // Remove the optimistic message if there was an error
      setMessages(prevMessages => 
        prevMessages.filter(msg => msg.id !== newMessageObj.id)
      );
    }
  }

  const renderMessage = ({ item }: { item: Message }) => {
    const isOwnMessage = item.user_id === currentUser?.id;
    const messageDate = new Date(item.created_at);
    const time = messageDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const today = new Date();
    const isToday = messageDate.toDateString() === today.toDateString();
    const isYesterday = new Date(today.setDate(today.getDate() - 1)).toDateString() === messageDate.toDateString();
    
    let dateLabel = messageDate.toLocaleDateString();
    if (isToday) dateLabel = 'Today';
    if (isYesterday) dateLabel = 'Yesterday';

    return (
      <View style={[
        styles.messageContainer,
        isOwnMessage ? styles.ownMessage : styles.otherMessage
      ]}>
        {!isOwnMessage && (
          <Image
            source={{
              uri: item.profiles.avatar_url ||
                'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80'
            }}
            style={styles.avatar}
          />
        )}
        <View style={[
          styles.messageBubble,
          isOwnMessage ? styles.ownBubble : styles.otherBubble
        ]}>
          <Text style={[
            styles.messageText,
            isOwnMessage ? styles.ownMessageText : styles.otherMessageText
          ]}>
            {item.content}
          </Text>
          <View style={styles.messageMetadata}>
            <Text style={styles.messageTime}>{time}</Text>
            <Text style={styles.messageDate}>{dateLabel}</Text>
          </View>
        </View>
      </View>
    );
  };

  const memoizedRenderMessage = React.useCallback(({ item }: { item: Message }) => {
    const isOwnMessage = item.user_id === currentUser?.id;
    const messageDate = new Date(item.created_at);
    const time = messageDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const today = new Date();
    const isToday = messageDate.toDateString() === today.toDateString();
    const isYesterday = new Date(today.setDate(today.getDate() - 1)).toDateString() === messageDate.toDateString();
    
    let dateLabel = messageDate.toLocaleDateString();
    if (isToday) dateLabel = 'Today';
    if (isYesterday) dateLabel = 'Yesterday';

    return (
      <View style={[
        styles.messageContainer,
        isOwnMessage ? styles.ownMessage : styles.otherMessage
      ]}>
        {!isOwnMessage && (
          <Image
            source={{
              uri: item.profiles.avatar_url ||
                'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80'
            }}
            style={styles.avatar}
          />
        )}
        <View style={[
          styles.messageBubble,
          isOwnMessage ? styles.ownBubble : styles.otherBubble
        ]}>
          <Text style={[
            styles.messageText,
            isOwnMessage ? styles.ownMessageText : styles.otherMessageText
          ]}>
            {item.content}
          </Text>
          <View style={styles.messageMetadata}>
            <Text style={styles.messageTime}>{time}</Text>
            <Text style={styles.messageDate}>{dateLabel}</Text>
          </View>
        </View>
      </View>
    );
  }, [currentUser?.id]);

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={24} color="#000" />
        </TouchableOpacity>
        <View style={styles.headerInfo}>
          <Text style={styles.headerTitle}>{otherUser}</Text>
        </View>
      </View>

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#000" />
        </View>
      ) : (
        <FlatList
          ref={flatListRef}
          data={messages}
          renderItem={memoizedRenderMessage}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.messagesList}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: false })}
          onLayout={() => flatListRef.current?.scrollToEnd({ animated: false })}
          removeClippedSubviews={true}
          maxToRenderPerBatch={10}
          windowSize={10}
          getItemLayout={(data, index) => ({
            length: 80, // approximate height of message item
            offset: 80 * index,
            index,
          })}
        />
      )}

      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          placeholder="Type a message..."
          value={newMessage}
          onChangeText={setNewMessage}
          multiline
          maxLength={1000}
          returnKeyType="send"
          onSubmitEditing={sendMessage}
          enablesReturnKeyAutomatically={true}
        />
        <TouchableOpacity 
          style={[
            styles.sendButton,
            !newMessage.trim() && styles.sendButtonDisabled
          ]}
          onPress={sendMessage}
          disabled={!newMessage.trim()}
        >
          <Send size={24} color={newMessage.trim() ? '#000' : '#999'} />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  backButton: {
    padding: 8,
    marginRight: 12,
  },
  headerInfo: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  messagesList: {
    padding: 16,
  },
  messageContainer: {
    flexDirection: 'row',
    marginBottom: 16,
    maxWidth: '80%',
  },
  ownMessage: {
    alignSelf: 'flex-end',
    marginLeft: 50,
  },
  otherMessage: {
    alignSelf: 'flex-start',
    marginRight: 50,
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginRight: 8,
  },
  messageBubble: {
    padding: 12,
    borderRadius: 20,
    maxWidth: '100%',
  },
  ownBubble: {
    backgroundColor: '#000',
    borderTopRightRadius: 4,
  },
  otherBubble: {
    backgroundColor: '#f0f0f0',
    borderTopLeftRadius: 4,
  },
  messageText: {
    fontSize: 16,
    marginBottom: 4,
  },
  ownMessageText: {
    color: '#fff',
  },
  otherMessageText: {
    color: '#000',
  },
  messageMetadata: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    marginTop: 4,
  },
  messageTime: {
    fontSize: 12,
    color: '#999',
    marginRight: 6,
  },
  messageDate: {
    fontSize: 12,
    color: '#999',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    backgroundColor: '#fff',
  },
  input: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    borderRadius: 24,
    paddingHorizontal: 20,
    paddingVertical: 12,
    marginRight: 12,
    fontSize: 16,
    maxHeight: 100,
  },
  sendButton: {
    padding: 8,
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
}); 