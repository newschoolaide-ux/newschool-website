import { create } from 'zustand';

const EXPO_PUBLIC_BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

export interface Event {
  event_id: string;
  name: string;
  description: string;
  location_name: string;
  latitude: number;
  longitude: number;
  max_participants: number;
  current_participants: number;
  duration_hours: number;
  desired_nationalities: string[];
  theme?: string;
  photo?: string;
  creator_id: string;
  creator_name: string;
  creator_photo?: string;
  participants: Array<{
    user_id: string;
    first_name: string;
    photo?: string;
    joined_at: string;
  }>;
  status: string;
  created_at: string;
  start_time?: string;
  is_full: boolean;
  distance_km?: number;
}

export interface Message {
  message_id: string;
  event_id: string;
  sender_id: string;
  sender_name: string;
  sender_photo?: string;
  content: string;
  message_type: string;
  created_at: string;
  is_read: boolean;
}

export interface Chat {
  event_id: string;
  event_name: string;
  event_photo?: string;
  participants_count: number;
  last_message?: Message;
  unread_count: number;
}

interface EventStore {
  events: Event[];
  nearbyEvents: Event[];
  userCreatedEvents: Event[];
  userJoinedEvents: Event[];
  currentEvent: Event | null;
  chats: Chat[];
  messages: Message[];
  isLoading: boolean;
  error: string | null;
  
  // Actions
  fetchEvents: (token: string, filters?: any) => Promise<void>;
  fetchNearbyEvents: (token: string, lat: number, lng: number, radius?: number) => Promise<void>;
  fetchEvent: (token: string, eventId: string) => Promise<void>;
  createEvent: (token: string, eventData: any) => Promise<Event>;
  updateEvent: (token: string, eventId: string, eventData: any) => Promise<Event>;
  joinEvent: (token: string, eventId: string) => Promise<void>;
  leaveEvent: (token: string, eventId: string) => Promise<void>;
  deleteEvent: (token: string, eventId: string) => Promise<void>;
  fetchUserCreatedEvents: (token: string) => Promise<void>;
  fetchUserJoinedEvents: (token: string) => Promise<void>;
  
  // Chat actions
  fetchChats: (token: string) => Promise<void>;
  fetchMessages: (token: string, eventId: string) => Promise<void>;
  sendMessage: (token: string, eventId: string, content: string, type?: string) => Promise<void>;
  
  clearError: () => void;
}

export const useEventStore = create<EventStore>((set, get) => ({
  events: [],
  nearbyEvents: [],
  userCreatedEvents: [],
  userJoinedEvents: [],
  currentEvent: null,
  chats: [],
  messages: [],
  isLoading: false,
  error: null,

  fetchEvents: async (token, filters = {}) => {
    set({ isLoading: true, error: null });
    try {
      const params = new URLSearchParams();
      if (filters.latitude) params.append('latitude', filters.latitude);
      if (filters.longitude) params.append('longitude', filters.longitude);
      if (filters.radius_km) params.append('radius_km', filters.radius_km);
      if (filters.theme) params.append('theme', filters.theme);
      if (filters.search) params.append('search', filters.search);
      
      const response = await fetch(`${EXPO_PUBLIC_BACKEND_URL}/api/events?${params}`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      
      if (!response.ok) throw new Error('Failed to fetch events');
      
      const data = await response.json();
      set({ events: data, isLoading: false });
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
    }
  },

  fetchNearbyEvents: async (token, lat, lng, radius = 10) => {
    set({ isLoading: true, error: null });
    try {
      const response = await fetch(
        `${EXPO_PUBLIC_BACKEND_URL}/api/events/nearby?latitude=${lat}&longitude=${lng}&radius_km=${radius}`,
        { headers: { 'Authorization': `Bearer ${token}` } }
      );
      
      if (!response.ok) throw new Error('Failed to fetch nearby events');
      
      const data = await response.json();
      set({ nearbyEvents: data, isLoading: false });
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
    }
  },

  fetchEvent: async (token, eventId) => {
    set({ isLoading: true, error: null });
    try {
      const response = await fetch(`${EXPO_PUBLIC_BACKEND_URL}/api/events/${eventId}`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      
      if (!response.ok) throw new Error('Failed to fetch event');
      
      const data = await response.json();
      set({ currentEvent: data, isLoading: false });
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
    }
  },

  createEvent: async (token, eventData) => {
    set({ isLoading: true, error: null });
    try {
      const response = await fetch(`${EXPO_PUBLIC_BACKEND_URL}/api/events`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(eventData),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Failed to create event');
      }
      
      const data = await response.json();
      set((state) => ({ 
        events: [data, ...state.events],
        userCreatedEvents: [data, ...state.userCreatedEvents],
        isLoading: false 
      }));
      return data;
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
      throw error;
    }
  },

  updateEvent: async (token, eventId, eventData) => {
    set({ isLoading: true, error: null });
    try {
      const response = await fetch(`${EXPO_PUBLIC_BACKEND_URL}/api/events/${eventId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(eventData),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Failed to update event');
      }
      
      const data = await response.json();
      set((state) => ({ 
        events: state.events.map(e => e.event_id === eventId ? data : e),
        userCreatedEvents: state.userCreatedEvents.map(e => e.event_id === eventId ? data : e),
        currentEvent: data,
        isLoading: false 
      }));
      return data;
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
      throw error;
    }
  },

  joinEvent: async (token, eventId) => {
    try {
      const response = await fetch(`${EXPO_PUBLIC_BACKEND_URL}/api/events/${eventId}/join`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Failed to join event');
      }
      
      // Refresh event data
      await get().fetchEvent(token, eventId);
    } catch (error: any) {
      set({ error: error.message });
      throw error;
    }
  },

  leaveEvent: async (token, eventId) => {
    try {
      const response = await fetch(`${EXPO_PUBLIC_BACKEND_URL}/api/events/${eventId}/leave`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Failed to leave event');
      }
      
      // Refresh event data
      await get().fetchEvent(token, eventId);
    } catch (error: any) {
      set({ error: error.message });
      throw error;
    }
  },

  deleteEvent: async (token, eventId) => {
    try {
      const response = await fetch(`${EXPO_PUBLIC_BACKEND_URL}/api/events/${eventId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` },
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Failed to delete event');
      }
      
      set((state) => ({
        events: state.events.filter(e => e.event_id !== eventId),
        userCreatedEvents: state.userCreatedEvents.filter(e => e.event_id !== eventId),
      }));
    } catch (error: any) {
      set({ error: error.message });
      throw error;
    }
  },

  fetchUserCreatedEvents: async (token) => {
    try {
      const response = await fetch(`${EXPO_PUBLIC_BACKEND_URL}/api/events/user/created`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      
      if (!response.ok) throw new Error('Failed to fetch user events');
      
      const data = await response.json();
      set({ userCreatedEvents: data });
    } catch (error: any) {
      set({ error: error.message });
    }
  },

  fetchUserJoinedEvents: async (token) => {
    try {
      const response = await fetch(`${EXPO_PUBLIC_BACKEND_URL}/api/events/user/joined`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      
      if (!response.ok) throw new Error('Failed to fetch joined events');
      
      const data = await response.json();
      set({ userJoinedEvents: data });
    } catch (error: any) {
      set({ error: error.message });
    }
  },

  fetchChats: async (token) => {
    try {
      const response = await fetch(`${EXPO_PUBLIC_BACKEND_URL}/api/chats`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      
      if (!response.ok) throw new Error('Failed to fetch chats');
      
      const data = await response.json();
      set({ chats: data });
    } catch (error: any) {
      set({ error: error.message });
    }
  },

  fetchMessages: async (token, eventId) => {
    try {
      const response = await fetch(`${EXPO_PUBLIC_BACKEND_URL}/api/events/${eventId}/messages`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      
      if (!response.ok) throw new Error('Failed to fetch messages');
      
      const data = await response.json();
      set({ messages: data });
    } catch (error: any) {
      set({ error: error.message });
    }
  },

  sendMessage: async (token, eventId, content, type = 'text') => {
    try {
      const response = await fetch(`${EXPO_PUBLIC_BACKEND_URL}/api/events/${eventId}/messages`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ content, message_type: type }),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Failed to send message');
      }
      
      const message = await response.json();
      set((state) => ({ messages: [...state.messages, message] }));
    } catch (error: any) {
      set({ error: error.message });
      throw error;
    }
  },

  clearError: () => set({ error: null }),
}));
