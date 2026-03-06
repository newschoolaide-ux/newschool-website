import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import Purchases, { PurchasesPackage, CustomerInfo } from 'react-native-purchases';

const EXPO_PUBLIC_BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

// RevenueCat API Key
const REVENUECAT_API_KEY = 'test_KOYxYFeR0ZhXjyZJWvyIQKXPyU0';

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

// Map RevenueCat product IDs to tier names
const PRODUCT_TO_TIER: Record<string, string> = {
  'standard_monthly': 'standard',
  'standard_yearly': 'standard',
  'ambassador_monthly': 'ambassador',
  'ambassador_yearly': 'ambassador',
};

export default function SubscriptionScreen() {
  const { user, token, refreshUser } = useAuth();
  const [tiers, setTiers] = useState<Tier[]>([]);
  const [packages, setPackages] = useState<PurchasesPackage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [upgrading, setUpgrading] = useState<string | null>(null);
  const [isPurchasesConfigured, setIsPurchasesConfigured] = useState(false);
  const router = useRouter();
  const insets = useSafeAreaInsets();

  useEffect(() => {
    initializePurchases();
    fetchTiers();
  }, []);

  const initializePurchases = async () => {
    try {
      // Configure RevenueCat
      if (Platform.OS === 'ios' || Platform.OS === 'android') {
        Purchases.configure({ apiKey: REVENUECAT_API_KEY });
        setIsPurchasesConfigured(true);
        
        // Fetch available packages
        const offerings = await Purchases.getOfferings();
        if (offerings.current && offerings.current.availablePackages.length > 0) {
          setPackages(offerings.current.availablePackages);
        }
        
        // Check current subscription status
        const customerInfo = await Purchases.getCustomerInfo();
        await syncSubscriptionWithBackend(customerInfo);
      }
    } catch (error) {
      console.log('RevenueCat not available (web or error):', error);
    }
  };

  const syncSubscriptionWithBackend = async (customerInfo: CustomerInfo) => {
    try {
      // Check active entitlements
      const entitlements = customerInfo.entitlements.active;
      let currentTier = 'free';
      
      if (entitlements['NEW SCHOOL Pro']) {
        // Determine tier based on product
        const productId = entitlements['NEW SCHOOL Pro'].productIdentifier;
        currentTier = PRODUCT_TO_TIER[productId] || 'standard';
      }
      
      // Sync with backend
      await fetch(`${EXPO_PUBLIC_BACKEND_URL}/api/subscriptions/sync`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ tier: currentTier }),
      });
      
      await refreshUser();
    } catch (error) {
      console.error('Error syncing subscription:', error);
    }
  };

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

    // If RevenueCat is available, use real payments
    if (isPurchasesConfigured && packages.length > 0) {
      // Find the matching package
      const packageId = tierName === 'standard' ? 'standard_monthly' : 'ambassador_monthly';
      const selectedPackage = packages.find(p => 
        p.product.identifier.includes(tierName) || p.identifier.toLowerCase().includes('monthly')
      );

      if (selectedPackage) {
        setUpgrading(tierName);
        try {
          const { customerInfo } = await Purchases.purchasePackage(selectedPackage);
          await syncSubscriptionWithBackend(customerInfo);
          Alert.alert('Succès', `Vous êtes maintenant ${TIER_NAMES[tierName]} !`);
        } catch (error: any) {
          if (!error.userCancelled) {
            Alert.alert('Erreur', 'Le paiement a échoué. Veuillez réessayer.');
          }
        } finally {
          setUpgrading(null);
        }
        return;
      }
    }

    // Fallback: Simulated purchase (for testing/web)
    Alert.alert(
      'Confirmer l\'abonnement',
      `Voulez-vous passer à l'abonnement ${TIER_NAMES[tierName]} ?\n\n⚠️ Mode Test: Le paiement sera simulé.`,
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
              Alert.alert('Erreur', 'Une erreur est survenue');
            } finally {
              setUpgrading(null);
            }
          },
        },
      ]
    );
  };

  const handleRestore = async () => {
    if (!isPurchasesConfigured) {
      Alert.alert('Info', 'La restauration des achats n\'est pas disponible sur cette plateforme.');
      return;
    }

    try {
      setIsLoading(true);
      const customerInfo = await Purchases.restorePurchases();
      await syncSubscriptionWithBackend(customerInfo);
      Alert.alert('Succès', 'Vos achats ont été restaurés.');
    } catch (error) {
      Alert.alert('Erreur', 'Impossible de restaurer les achats.');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color="#D946EF" />
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#FFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Abonnements</Text>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        <Text style={styles.title}>Choisissez votre formule</Text>
        <Text style={styles.subtitle}>
          Débloquez plus de fonctionnalités avec nos abonnements premium
        </Text>

        {/* Current subscription info */}
        <View style={styles.currentPlan}>
          <Text style={styles.currentPlanLabel}>Votre abonnement actuel</Text>
          <View style={styles.currentPlanBadge}>
            <Ionicons
              name={TIER_ICONS[user?.subscription_tier || 'free'] as any}
              size={20}
              color={TIER_COLORS[user?.subscription_tier || 'free']}
            />
            <Text style={[styles.currentPlanText, { color: TIER_COLORS[user?.subscription_tier || 'free'] }]}>
              {TIER_NAMES[user?.subscription_tier || 'free']}
            </Text>
          </View>
        </View>

        {tiers.map((tier) => {
          const isCurrentTier = tier.tier === user?.subscription_tier;
          const tierColor = TIER_COLORS[tier.tier];
          const tierIcon = TIER_ICONS[tier.tier];
          const isUpgrading = upgrading === tier.tier;

          // Find price from RevenueCat packages if available
          let displayPrice = tier.price > 0 ? `${tier.price}€/mois` : 'Gratuit';
          const matchingPackage = packages.find(p => 
            p.product.identifier.toLowerCase().includes(tier.tier)
          );
          if (matchingPackage) {
            displayPrice = matchingPackage.product.priceString + '/mois';
          }

          return (
            <View
              key={tier.tier}
              style={[
                styles.tierCard,
                isCurrentTier && styles.tierCardActive,
                { borderColor: isCurrentTier ? tierColor : '#333' },
              ]}
            >
              {tier.tier === 'ambassador' && (
                <View style={styles.popularBadge}>
                  <Text style={styles.popularBadgeText}>Populaire</Text>
                </View>
              )}

              <View style={styles.tierHeader}>
                <Ionicons name={tierIcon as any} size={32} color={tierColor} />
                <View style={styles.tierInfo}>
                  <Text style={styles.tierName}>{TIER_NAMES[tier.tier]}</Text>
                  <Text style={[styles.tierPrice, { color: tierColor }]}>
                    {displayPrice}
                  </Text>
                </View>
              </View>

              <View style={styles.features}>
                {tier.features.map((feature, index) => (
                  <View key={index} style={styles.featureRow}>
                    <Ionicons name="checkmark-circle" size={20} color="#4CAF50" />
                    <Text style={styles.featureText}>{feature}</Text>
                  </View>
                ))}
              </View>

              <TouchableOpacity
                style={[
                  styles.upgradeButton,
                  isCurrentTier && styles.upgradeButtonDisabled,
                  !isCurrentTier && { backgroundColor: tierColor },
                ]}
                onPress={() => handleUpgrade(tier.tier)}
                disabled={isCurrentTier || isUpgrading}
              >
                {isUpgrading ? (
                  <ActivityIndicator color="#FFF" />
                ) : (
                  <Text style={styles.upgradeButtonText}>
                    {isCurrentTier ? 'Abonnement actuel' : tier.price === 0 ? 'Gratuit' : 'Choisir'}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          );
        })}

        {/* Restore purchases button */}
        <TouchableOpacity style={styles.restoreButton} onPress={handleRestore}>
          <Text style={styles.restoreButtonText}>Restaurer mes achats</Text>
        </TouchableOpacity>

        <Text style={styles.disclaimer}>
          Les abonnements se renouvellent automatiquement. Vous pouvez annuler à tout moment dans les paramètres de votre compte App Store.
        </Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0A0A',
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1A1A1A',
  },
  backButton: {
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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFF',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#888',
    marginBottom: 24,
  },
  currentPlan: {
    backgroundColor: '#1A1A1A',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  currentPlanLabel: {
    color: '#888',
    fontSize: 14,
  },
  currentPlanBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  currentPlanText: {
    fontSize: 16,
    fontWeight: '600',
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
    backgroundColor: '#1F1A2E',
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
    fontSize: 12,
    fontWeight: '600',
  },
  tierHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginBottom: 16,
  },
  tierInfo: {
    flex: 1,
  },
  tierName: {
    fontSize: 20,
    fontWeight: '600',
    color: '#FFF',
  },
  tierPrice: {
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 4,
  },
  features: {
    marginBottom: 16,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 8,
  },
  featureText: {
    color: '#CCC',
    fontSize: 14,
    flex: 1,
  },
  upgradeButton: {
    backgroundColor: '#333',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  upgradeButtonDisabled: {
    backgroundColor: '#333',
  },
  upgradeButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
  restoreButton: {
    alignItems: 'center',
    paddingVertical: 16,
    marginTop: 8,
  },
  restoreButtonText: {
    color: '#D946EF',
    fontSize: 14,
    fontWeight: '500',
  },
  disclaimer: {
    color: '#666',
    fontSize: 12,
    textAlign: 'center',
    marginTop: 16,
    lineHeight: 18,
  },
});
