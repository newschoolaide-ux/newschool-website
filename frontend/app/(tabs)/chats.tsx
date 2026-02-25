import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Image,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useAuth } from '../../contexts/AuthContext';
import { useEventStore, Chat } from '../../stores/eventStore';

export default function ChatsScreen() {
  const { user, token } = useAuth();
  const { chats, isLoading, fetchChats } = useEventStore();
  const [refreshing, setRefreshing] = useState(false);
  const router = useRouter();
  const insets = useSafeAreaInsets();

  useEffect(() => {
    if (token) {
      fetchChats(token);
    }
  }, [token]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    if (token) {
      await fetchChats(token);
    }
    setRefreshing(false);
  }, [token]);

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return format(date, 'HH:mm');
    } else if (diffDays === 1) {
      return 'Hier';
    } else if (diffDays < 7) {
      return format(date, 'EEEE', { locale: fr });
    } else {
      return format(date, 'dd/MM/yyyy');
    }
  };

  const ChatItem = ({ chat }: { chat: Chat }) => (
    <TouchableOpacity
      style={styles.chatItem}
      onPress={() => router.push(`/chat/${chat.event_id}`)}
      activeOpacity={0.7}
    >
      <View style={styles.chatAvatar}>
        {chat.event_photo ? (
          <Image source={{ uri: chat.event_photo }} style={styles.avatarImage} />
        ) : (
          <View style={[styles.avatarImage, styles.avatarPlaceholder]}>
            <Ionicons name="calendar" size={24} color="#666" />
          </View>
        )}
      </View>
      <View style={styles.chatContent}>
        <View style={styles.chatHeader}>
          <Text style={styles.chatName} numberOfLines={1}>{chat.event_name}</Text>
          {chat.last_message && (
            <Text style={styles.chatTime}>{formatTime(chat.last_message.created_at)}</Text>
          )}
        </View>
        <View style={styles.chatPreview}>
          {chat.last_message ? (
            <Text style={styles.lastMessage} numberOfLines={1}>
              {chat.last_message.sender_name}: {chat.last_message.content}
            </Text>
          ) : (
            <Text style={styles.noMessages}>Aucun message</Text>
          )}
          {chat.unread_count > 0 && (
            <View style={styles.unreadBadge}>
              <Text style={styles.unreadText}>{chat.unread_count}</Text>
            </View>
          )}
        </View>
        <View style={styles.participantsInfo}>
          <Ionicons name="people-outline" size={12} color="#666" />
          <Text style={styles.participantsCount}>{chat.participants_count} participants</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Messages</Text>
      </View>

      <ScrollView
        style={styles.chatsList}
        contentContainerStyle={styles.chatsListContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#FF6B35"
          />
        }
      >
        {isLoading && chats.length === 0 ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#FF6B35" />
          </View>
        ) : chats.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="chatbubbles-outline" size={64} color="#444" />
            <Text style={styles.emptyTitle}>Aucune conversation</Text>
            <Text style={styles.emptySubtitle}>
              Rejoignez un événement pour commencer à discuter avec les participants !
            </Text>
            <TouchableOpacity
              style={styles.emptyButton}
              onPress={() => router.push('/(tabs)/home')}
            >
              <Text style={styles.emptyButtonText}>Explorer les événements</Text>
            </TouchableOpacity>
          </View>
        ) : (
          chats.map((chat) => <ChatItem key={chat.event_id} chat={chat} />)
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0A0A',
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#1A1A1A',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFF',
  },
  chatsList: {
    flex: 1,
  },
  chatsListContent: {
    paddingVertical: 8,
  },
  chatItem: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1A1A1A',
  },
  chatAvatar: {
    marginRight: 14,
  },
  avatarImage: {
    width: 56,
    height: 56,
    borderRadius: 28,
  },
  avatarPlaceholder: {
    backgroundColor: '#1A1A1A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  chatContent: {
    flex: 1,
    justifyContent: 'center',
  },
  chatHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  chatName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFF',
    flex: 1,
    marginRight: 8,
  },
  chatTime: {
    fontSize: 12,
    color: '#666',
  },
  chatPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  lastMessage: {
    fontSize: 14,
    color: '#888',
    flex: 1,
  },
  noMessages: {
    fontSize: 14,
    color: '#555',
    fontStyle: 'italic',
    flex: 1,
  },
  unreadBadge: {
    backgroundColor: '#FF6B35',
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  unreadText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '600',
  },
  participantsInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  participantsCount: {
    fontSize: 12,
    color: '#666',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 100,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 80,
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#FFF',
    marginTop: 16,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#888',
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 20,
  },
  emptyButton: {
    backgroundColor: '#FF6B35',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 24,
  },
  emptyButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
