import { View, Text, StyleSheet, FlatList, Image, TouchableOpacity, TextInput, Modal } from 'react-native';
import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { Database } from '@/types/supabase';
import { Search, MessageSquare, Plus } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import React from 'react';

type Profile = Database['public']['Tables']['profiles']['Row'];
type ChatParticipant = Database['public']['Tables']['chat_participants']['Row'] & {
  unread_messages: number;
};
type Chat = Database['public']['Tables']['chats']['Row'] & {
  profiles: Profile;
  last_message?: Database['public']['Tables']['messages']['Row'] & {
    profiles: Profile;
  };
  messages: Array<Database['public']['Tables']['messages']['Row']>;
  unread_messages: number;
};

export default function MessagesScreen() {
  const [chats, setChats] = useState<Chat[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showUsersModal, setShowUsersModal] = useState(false);
  const [users, setUsers] = useState<Profile[]>([]);
  const router = useRouter();
  const flatListRef = React.useRef<FlatList>(null);
  const [totalUnreadMessages, setTotalUnreadMessages] = useState(0);

  useEffect(() => {
    fetchChats();
    subscribeToChats();
  }, []);

  async function fetchChats() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from('chat_participants')
      .select(`
        chat:chats (
          id,
          created_at,
          messages!messages_chat_id_fkey (
            id,
            content,
            created_at,
            user_id,
            profiles!messages_user_id_fkey (
              id,
              username
            )
          ),
          participants:chat_participants (
            profiles!chat_participants_user_id_fkey (
              id,
              username,
              avatar_url
            ),
            unread_messages
          )
        )
      `)
      .eq('user_id', user.id);

    if (data) {
      const formattedChats = data
        .map((item: any) => {
          const otherParticipant = item.chat.participants
            .find((p: any) => p.profiles.id !== user.id)?.profiles;
          
          // Sort messages by created_at in descending order to get the latest first
          const messages = item.chat.messages ? 
            [...item.chat.messages].sort((a, b) => 
              new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
            ) : [];
          
          const lastMessage = messages.length > 0 ? 
            {
              ...messages[0],
              profiles: messages[0].profiles
            } : null;
          
          const unreadMessages = item.chat.participants
            .find((p: any) => p.profiles.id === user.id)?.unread_messages || 0;
          
          return {
            ...item.chat,
            messages: messages,
            last_message: lastMessage,
            profiles: otherParticipant,
            unread_messages: unreadMessages,
            latest_message_time: lastMessage?.created_at || item.chat.created_at,
          };
        })
        // Sort chats by latest message time
        .sort((a, b) => 
          new Date(b.latest_message_time).getTime() - new Date(a.latest_message_time).getTime()
        );

      setChats(formattedChats);
      
      // Calculate total unread messages
      const total = formattedChats.reduce((sum, chat) => sum + (chat.unread_messages || 0), 0);
      setTotalUnreadMessages(total);
    }
  }

  async function subscribeToChats() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    return supabase
      .channel('chat-updates')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'messages',
      }, async (payload: any) => {
        if (payload.new.user_id !== user.id) {
          // Increment unread messages for the chat
          await supabase
            .from('chat_participants')
            .update({ unread_messages: supabase.rpc('increment_unread') })
            .eq('chat_id', payload.new.chat_id)
            .eq('user_id', user.id);

          fetchChats();
        }
      })
      .subscribe();
  }

  async function fetchUsers() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from('profiles')
      .select('*')
      .neq('id', user.id); // Don't include current user

    if (data) setUsers(data);
  }

  async function startChat(otherUserId: string) {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // First check if a chat already exists with this user
      const { data: existingChat } = await supabase
        .from('chat_participants')
        .select('chat_id')
        .eq('user_id', user.id)
        .in('chat_id', (
          await supabase
            .from('chat_participants')
            .select('chat_id')
            .eq('user_id', otherUserId)
        ).data?.map(row => row.chat_id) || []);

      if (existingChat && existingChat.length > 0) {
        // Chat already exists, navigate to it
        setShowUsersModal(false);
        router.push({
          pathname: '/chat',
          params: { 
            chatId: existingChat[0].chat_id,
            otherUser: users.find(u => u.id === otherUserId)?.username
          }
        });
        return;
      }

      // Create new chat
      const { data: chatData, error: chatError } = await supabase
        .from('chats')
        .insert({})
        .select()
        .single();

      if (chatError || !chatData) {
        console.error('Error creating chat:', chatError);
        return;
      }

      // Add participants
      const { error: participantsError } = await supabase
        .from('chat_participants')
        .insert([
          { chat_id: chatData.id, user_id: user.id },
          { chat_id: chatData.id, user_id: otherUserId }
        ]);

      if (participantsError) {
        console.error('Error adding participants:', participantsError);
        // Clean up the chat if participants couldn't be added
        await supabase.from('chats').delete().eq('id', chatData.id);
        return;
      }

      setShowUsersModal(false);
      router.push({
        pathname: '/chat',
        params: { 
          chatId: chatData.id,
          otherUser: users.find(u => u.id === otherUserId)?.username
        }
      });

    } catch (error) {
      console.error('Error in startChat:', error);
    }
  }

  async function markChatAsRead(chatId: string) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    await supabase
      .from('chat_participants')
      .update({ unread_messages: 0 })
      .eq('chat_id', chatId)
      .eq('user_id', user.id);

    // Refresh the chat list to update unread counts
    fetchChats();
  }

  const renderChatItem = ({ item }: { item: Chat }) => (
    <TouchableOpacity 
      style={[
        styles.chatItem,
        item.unread_messages > 0 && styles.unreadChat
      ]}
      onPress={() => {
        markChatAsRead(item.id);
        router.push({
          pathname: '/chat',
          params: { 
            chatId: item.id,
            otherUser: item.profiles?.username
          }
        });
      }}
    >
      <View style={styles.avatarContainer}>
        <Image
          source={{
            uri: item.profiles?.avatar_url ||
              'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80'
          }}
          style={styles.avatar}
        />
        {item.unread_messages > 0 && (
          <View style={styles.unreadBadge}>
            <Text style={styles.unreadBadgeText}>
              {item.unread_messages}
            </Text>
          </View>
        )}
      </View>
      <View style={styles.chatInfo}>
        <Text style={[
          styles.username,
          item.unread_messages > 0 && styles.unreadUsername
        ]}>
          {item.profiles?.username}
        </Text>
        <Text 
          style={[
            styles.lastMessage,
            item.unread_messages > 0 && styles.unreadLastMessage
          ]} 
          numberOfLines={1}
        >
          {item.last_message ? (
            <>
              {item.last_message.user_id === item.profiles?.id ? '' : 'You: '}
              {item.last_message.content}
            </>
          ) : 'Start a conversation'}
        </Text>
      </View>
      {item.last_message && (
        <Text style={[
          styles.time,
          item.unread_messages > 0 && styles.unreadTime
        ]}>
          {formatMessageTime(item.last_message.created_at)}
        </Text>
      )}
    </TouchableOpacity>
  );

  const renderHeader = () => (
    <View style={styles.header}>
      <Text style={styles.title}>Messages</Text>
      <TouchableOpacity 
        style={styles.newChatButton}
        onPress={() => {
          setShowUsersModal(true);
          fetchUsers();
        }}
      >
        <Plus size={24} color="#000" />
      </TouchableOpacity>
    </View>
  );

  const renderUsersModal = () => (
    <Modal
      visible={showUsersModal}
      animationType="slide"
      transparent={true}
      onRequestClose={() => setShowUsersModal(false)}
    >
      <View style={styles.modalContainer}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>New Chat</Text>
            <TouchableOpacity onPress={() => setShowUsersModal(false)}>
              <Text style={styles.closeButton}>✕</Text>
            </TouchableOpacity>
          </View>
          
          <FlatList
            data={users}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <TouchableOpacity 
                style={styles.userItem}
                onPress={() => startChat(item.id)}
              >
                <Image
                  source={{
                    uri: item.avatar_url ||
                      'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80'
                  }}
                  style={styles.userAvatar}
                />
                <View style={styles.userInfo}>
                  <Text style={styles.userName}>{item.username}</Text>
                  <Text style={styles.userRole}>{item.role}</Text>
                </View>
              </TouchableOpacity>
            )}
          />
        </View>
      </View>
    </Modal>
  );

  return (
    <View style={styles.container}>
      {renderHeader()}

      <View style={styles.searchContainer}>
        <Search size={20} color="#666" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search messages..."
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      {chats.length === 0 ? (
        <View style={styles.emptyState}>
          <MessageSquare size={48} color="#999" />
          <Text style={styles.emptyStateText}>No messages yet</Text>
          <Text style={styles.emptyStateSubtext}>
            Start a conversation with other users
          </Text>
        </View>
      ) : (
        <FlatList
          ref={flatListRef}
          data={chats}
          renderItem={renderChatItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.chatList}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: false })}
          onLayout={() => flatListRef.current?.scrollToEnd({ animated: false })}
          inverted={false}
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
      {renderUsersModal()}
    </View>
  );
}

function formatMessageTime(timestamp: string) {
  const messageDate = new Date(timestamp);
  const now = new Date();
  const diffInHours = (now.getTime() - messageDate.getTime()) / (1000 * 60 * 60);
  
  if (diffInHours < 24) {
    // Today - show time
    return messageDate.toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit'
    });
  } else if (diffInHours < 48) {
    // Yesterday
    return 'Yesterday';
  } else if (diffInHours < 168) {
    // Within a week - show day name
    return messageDate.toLocaleDateString([], { weekday: 'short' });
  } else {
    // Older - show date
    return messageDate.toLocaleDateString([], {
      month: 'short',
      day: 'numeric'
    });
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#f5f5f5',
    marginHorizontal: 20,
    marginVertical: 12,
    borderRadius: 12,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#333',
  },
  chatList: {
    paddingHorizontal: 20,
  },
  chatItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 16,
  },
  chatInfo: {
    flex: 1,
    marginRight: 16,
  },
  username: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
    color: '#000',
  },
  lastMessage: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  time: {
    fontSize: 12,
    color: '#999',
    alignSelf: 'flex-start',
    marginTop: 2,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  newChatButton: {
    padding: 8,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    height: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  closeButton: {
    fontSize: 24,
    color: '#666',
  },
  userItem: {
    flexDirection: 'row',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    alignItems: 'center',
  },
  userAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  userInfo: {
    marginLeft: 12,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
  },
  userRole: {
    fontSize: 14,
    color: '#666',
    textTransform: 'capitalize',
  },
  unreadChat: {
    backgroundColor: '#f8f9fa',
  },
  unreadUsername: {
    fontWeight: '700',
    color: '#000',
  },
  unreadLastMessage: {
    color: '#000',
    fontWeight: '600',
  },
  unreadTime: {
    color: '#000',
    fontWeight: '600',
  },
  avatarContainer: {
    position: 'relative',
  },
  unreadBadge: {
    position: 'absolute',
    right: -2,
    top: -2,
    backgroundColor: '#ff3b30',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  unreadBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
});