import React, { useEffect, useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Image,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { Text } from '../../components/ui/Text';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';

const EXPO_PUBLIC_BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

interface UserProfile {
  user_id: string;
  first_name: string;
  photo?: string;
  bio?: string;
  languages: string[];
  gender?: string;
  subscription_tier: string;
  created_at: string;
}

export default function UserProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { token } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchProfile();
  }, [id]);

  const fetchProfile = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`${EXPO_PUBLIC_BACKEND_URL}/api/users/${id}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Utilisateur non trouvé');
      }

      const data = await response.json();
      setProfile(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const getGenderLabel = (gender?: string) => {
    switch (gender) {
      case 'male': return 'Homme';
      case 'female': return 'Femme';
      default: return 'Non spécifié';
    }
  };

  if (isLoading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color="#D946EF" />
      </View>
    );
  }

  if (error || !profile) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#F5F3FA" />
        </TouchableOpacity>
        <View style={styles.centered}>
          <Text style={styles.errorText}>{error || 'Utilisateur non trouvé'}</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
        <Ionicons name="arrow-back" size={24} color="#F5F3FA" />
      </TouchableOpacity>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <View style={styles.avatarContainer}>
            {profile.photo ? (
              <Image source={{ uri: profile.photo }} style={styles.avatar} />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Text style={styles.avatarText}>
                  {profile.first_name.charAt(0).toUpperCase()}
                </Text>
              </View>
            )}
            {profile.subscription_tier === 'ambassador' && (
              <View style={styles.badge}>
                <Ionicons name="star" size={14} color="#F5F3FA" />
              </View>
            )}
          </View>
          <Text style={styles.name}>{profile.first_name}</Text>
        </View>

        <View style={styles.infoSection}>
          {profile.bio && (
            <View style={styles.infoCard}>
              <Text style={styles.infoLabel}>Bio</Text>
              <Text style={styles.infoValue}>{profile.bio}</Text>
            </View>
          )}

          <View style={styles.infoCard}>
            <Text style={styles.infoLabel}>Genre</Text>
            <Text style={styles.infoValue}>{getGenderLabel(profile.gender)}</Text>
          </View>

          {profile.languages && profile.languages.length > 0 && (
            <View style={styles.infoCard}>
              <Text style={styles.infoLabel}>Langues</Text>
              <View style={styles.languagesContainer}>
                {profile.languages.map((lang, index) => (
                  <View key={index} style={styles.languageChip}>
                    <Text style={styles.languageText}>{lang}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          <View style={styles.infoCard}>
            <Text style={styles.infoLabel}>Membre depuis</Text>
            <Text style={styles.infoValue}>
              {new Date(profile.created_at).toLocaleDateString('fr-FR', {
                year: 'numeric',
                month: 'long',
              })}
            </Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0C0A12',
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  header: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  avatarContainer: {
    position: 'relative',
  },
  avatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 3,
    borderColor: '#D946EF',
  },
  avatarPlaceholder: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#D946EF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#F5F3FA',
  },
  badge: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    backgroundColor: '#FFD700',
    borderRadius: 12,
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  name: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#F5F3FA',
    marginTop: 16,
  },
  tier: {
    fontSize: 14,
    color: '#D946EF',
    marginTop: 4,
  },
  infoSection: {
    gap: 16,
  },
  infoCard: {
    backgroundColor: '#16131F',
    borderRadius: 12,
    padding: 16,
  },
  infoLabel: {
    fontSize: 12,
    color: '#A39DB3',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  infoValue: {
    fontSize: 16,
    color: '#F5F3FA',
  },
  languagesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  languageChip: {
    backgroundColor: '#221E2D',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  languageText: {
    color: '#F5F3FA',
    fontSize: 14,
  },
  errorText: {
    color: '#A39DB3',
    fontSize: 16,
  },
});
