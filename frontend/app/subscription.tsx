import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';

const EXPO_PUBLIC_BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

interface Tier {
  tier: string;
  price: number;
  monthly_limit: number;
  features: string[];
}

const TIER_ICONS: Record<string, string> = {
  free: 'gift-outline',
  standard: 'rocket-outline',
  ambassador: 'star-outline',
};

const TIER_COLORS: Record<string, string> = {
  free: '#666',
  standard: '#D946EF',
  ambassador: '#FFD700',
};

const TIER_NAMES: Record<string, string> = {
  free: 'Gratuit',
  standard: 'Standard',
  ambassador: 'Ambassadeur',
};

export default function SubscriptionScreen() {
  const { user, token, refreshUser } = useAuth();
  const [tiers, setTiers] = useState<Tier[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [upgrading, setUpgrading] = useState<string | null>(null);
  const router = useRouter();
  const insets = useSafeAreaInsets();

  useEffect(() => {
    fetchTiers();
  }, []);

  const fetchTiers = async () => {
    try {
      const response = await fetch(`${EXPO_PUBLIC_BACKEND_URL}/api/subscriptions/tiers`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        setTiers(data);
      }
    } catch (error) {
      console.error('Error fetching tiers:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpgrade = async (tierName: string) => {
    if (tierName === user?.subscription_tier) return;
    if (tierName === 'free') return;

    Alert.alert(
      'Confirmer l\'abonnement',
      `Voulez-vous passer à l'abonnement ${TIER_NAMES[tierName]} ?\n\n⚠️ Note: Ceci est une simulation. Dans la version finale, vous serez redirigé vers le paiement.`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Confirmer',
          onPress: async () => {
            setUpgrading(tierName);
            try {
              const response = await fetch(`${EXPO_PUBLIC_BACKEND_URL}/api/subscriptions/upgrade`, {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${token}`,
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({ tier: tierName }),
              });

              if (response.ok) {
                await refreshUser();
                Alert.alert('Succès', `Vous êtes maintenant ${TIER_NAMES[tierName]} !`);
              } else {
                const error = await response.json();
                Alert.alert('Erreur', error.detail || 'Une erreur est survenue');
              }
            } catch (error) {
              Alert.alert('Erreur', 'Impossible de mettre à jour l\'abonnement');
            } finally {
              setUpgrading(null);
            }
          },
        },
      ]
    );
  };

  const currentTierIndex = tiers.findIndex(t => t.tier === user?.subscription_tier);

  if (isLoading) {
    return (
      <View style={[styles.container, styles.loadingContainer]}>
        <ActivityIndicator size="large" color="#D946EF" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity style={styles.closeButton} onPress={() => router.back()}>
          <Ionicons name="close" size={24} color="#FFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Abonnements</Text>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        <View style={styles.intro}>
          <Ionicons name="diamond" size={48} color="#D946EF" />
          <Text style={styles.introTitle}>Passez au niveau supérieur</Text>
          <Text style={styles.introText}>
            Débloquez plus de créations et participations à des New School chaque mois
          </Text>
        </View>

        {tiers.map((tier, index) => {
          const isCurrentTier = tier.tier === user?.subscription_tier;
          const isPremium = tier.price > 0;
          const isDowngrade = index < currentTierIndex;

          return (
            <TouchableOpacity
              key={tier.tier}
              style={[
                styles.tierCard,
                isCurrentTier && styles.tierCardActive,
                { borderColor: TIER_COLORS[tier.tier] || '#D946EF' }
              ]}
              onPress={() => handleUpgrade(tier.tier)}
              disabled={isCurrentTier || isDowngrade || tier.tier === 'free'}
              activeOpacity={0.8}
            >
              {tier.tier === 'ambassador' && (
                <View style={styles.popularBadge}>
                  <Text style={styles.popularBadgeText}>RECOMMANDÉ</Text>
                </View>
              )}
              
              <View style={styles.tierHeader}>
                <View style={[styles.tierIcon, { backgroundColor: TIER_COLORS[tier.tier] || '#D946EF' }]}>
                  <Ionicons name={TIER_ICONS[tier.tier] as any || 'star'} size={24} color="#FFF" />
                </View>
                <View style={styles.tierInfo}>
                  <Text style={styles.tierName}>{TIER_NAMES[tier.tier] || tier.tier}</Text>
                  <Text style={styles.tierPrice}>
                    {tier.price === 0 ? 'Gratuit' : `${tier.price.toFixed(2).replace('.', ',')}€/mois`}
                  </Text>
                </View>
                {isCurrentTier && (
                  <View style={styles.currentBadge}>
                    <Ionicons name="checkmark" size={16} color="#FFF" />
                    <Text style={styles.currentBadgeText}>Actuel</Text>
                  </View>
                )}
              </View>

              <View style={styles.limitBadge}>
                <Ionicons name="calendar" size={16} color="#D946EF" />
                <Text style={styles.limitText}>
                  {tier.monthly_limit === -1 
                    ? 'Illimité' 
                    : `${tier.monthly_limit} création${tier.monthly_limit > 1 ? 's' : ''} ou participation${tier.monthly_limit > 1 ? 's' : ''} / mois`}
                </Text>
              </View>

              <View style={styles.featuresList}>
                {tier.features.map((feature, featureIndex) => (
                  <View key={featureIndex} style={styles.featureItem}>
                    <Ionicons name="checkmark-circle" size={18} color={TIER_COLORS[tier.tier] || '#D946EF'} />
                    <Text style={styles.featureText}>{feature}</Text>
                  </View>
                ))}
              </View>

              {isPremium && !isCurrentTier && !isDowngrade && (
                <TouchableOpacity
                  style={[styles.upgradeButton, { backgroundColor: TIER_COLORS[tier.tier] || '#D946EF' }]}
                  onPress={() => handleUpgrade(tier.tier)}
                  disabled={upgrading === tier.tier}
                >
                  {upgrading === tier.tier ? (
                    <ActivityIndicator color="#FFF" />
                  ) : (
                    <Text style={styles.upgradeButtonText}>Choisir ce plan</Text>
                  )}
                </TouchableOpacity>
              )}
            </TouchableOpacity>
          );
        })}

        <View style={styles.disclaimer}>
          <Ionicons name="information-circle-outline" size={16} color="#666" />
          <Text style={styles.disclaimerText}>
            Les abonnements sont gérés via l'App Store ou Google Play. Vous pouvez annuler à tout moment.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0A0A',
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#1A1A1A',
  },
  closeButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFF',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
    paddingBottom: 40,
  },
  intro: {
    alignItems: 'center',
    marginBottom: 32,
  },
  introTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFF',
    marginTop: 16,
    marginBottom: 8,
  },
  introText: {
    fontSize: 15,
    color: '#888',
    textAlign: 'center',
    lineHeight: 22,
  },
  tierCard: {
    backgroundColor: '#1A1A1A',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 2,
    borderColor: '#333',
  },
  tierCardActive: {
    backgroundColor: 'rgba(217, 70, 239, 0.1)',
  },
  popularBadge: {
    position: 'absolute',
    top: -10,
    right: 16,
    backgroundColor: '#FFD700',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  popularBadgeText: {
    color: '#000',
    fontSize: 10,
    fontWeight: '700',
  },
  tierHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  tierIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tierInfo: {
    flex: 1,
    marginLeft: 14,
  },
  tierName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFF',
  },
  tierPrice: {
    fontSize: 14,
    color: '#888',
    marginTop: 2,
  },
  currentBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#4CAF50',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  currentBadgeText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '600',
  },
  limitBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(217, 70, 239, 0.15)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    marginBottom: 16,
    gap: 8,
  },
  limitText: {
    color: '#D946EF',
    fontSize: 14,
    fontWeight: '500',
  },
  featuresList: {
    marginBottom: 16,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    gap: 10,
  },
  featureText: {
    color: '#CCC',
    fontSize: 14,
    flex: 1,
  },
  upgradeButton: {
    borderRadius: 12,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  upgradeButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
  disclaimer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: 16,
    gap: 8,
  },
  disclaimerText: {
    color: '#666',
    fontSize: 12,
    flex: 1,
    lineHeight: 18,
  },
});
