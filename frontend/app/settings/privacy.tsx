import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Linking,
} from 'react-native';
import { Text } from '../../components/ui/Text';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';

const EXPO_PUBLIC_BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

export default function PrivacyScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user, token, logout } = useAuth();
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDeleteAccount = () => {
    Alert.alert(
      'Supprimer mon compte',
      'Cette action est irréversible. Toutes vos données seront supprimées définitivement, y compris vos schools créées et votre historique.',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: confirmDeleteAccount,
        },
      ]
    );
  };

  const confirmDeleteAccount = async () => {
    setIsDeleting(true);
    try {
      const response = await fetch(`${EXPO_PUBLIC_BACKEND_URL}/api/users/delete-account`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        Alert.alert('Compte supprimé', 'Votre compte a été supprimé avec succès.');
        await logout();
        router.replace('/(auth)/login');
      } else {
        Alert.alert('Erreur', 'Impossible de supprimer le compte. Veuillez réessayer.');
      }
    } catch (error) {
      Alert.alert('Erreur', 'Une erreur est survenue. Veuillez réessayer.');
    } finally {
      setIsDeleting(false);
    }
  };

  const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.sectionContent}>{children}</View>
    </View>
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#F5F3FA" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Confidentialité</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        <Section title="Collecte des données">
          <Text style={styles.paragraph}>
            New School collecte uniquement les données nécessaires au fonctionnement de l'application :
          </Text>
          <View style={styles.bulletList}>
            <Text style={styles.bulletItem}>• Informations de profil (nom, email, photo)</Text>
            <Text style={styles.bulletItem}>• Localisation (pour afficher les schools à proximité)</Text>
            <Text style={styles.bulletItem}>• Messages dans les chats de groupe</Text>
            <Text style={styles.bulletItem}>• Historique de participation aux schools</Text>
          </View>
        </Section>

        <Section title="Utilisation des données">
          <Text style={styles.paragraph}>
            Vos données sont utilisées exclusivement pour :
          </Text>
          <View style={styles.bulletList}>
            <Text style={styles.bulletItem}>• Permettre la création et la participation aux schools</Text>
            <Text style={styles.bulletItem}>• Afficher les événements près de vous</Text>
            <Text style={styles.bulletItem}>• Faciliter la communication entre participants</Text>
            <Text style={styles.bulletItem}>• Améliorer l'expérience utilisateur</Text>
          </View>
        </Section>

        <Section title="Partage des données">
          <Text style={styles.paragraph}>
            Vos informations de profil (nom et photo) sont visibles par les autres participants des schools que vous rejoignez. Nous ne vendons jamais vos données à des tiers.
          </Text>
        </Section>

        <Section title="Sécurité">
          <Text style={styles.paragraph}>
            Nous utilisons des mesures de sécurité standard de l'industrie pour protéger vos données, incluant le chiffrement des communications et le stockage sécurisé des mots de passe.
          </Text>
        </Section>

        <Section title="Vos droits">
          <Text style={styles.paragraph}>
            Conformément au RGPD, vous disposez des droits suivants :
          </Text>
          <View style={styles.bulletList}>
            <Text style={styles.bulletItem}>• Droit d'accès à vos données</Text>
            <Text style={styles.bulletItem}>• Droit de rectification</Text>
            <Text style={styles.bulletItem}>• Droit à l'effacement</Text>
            <Text style={styles.bulletItem}>• Droit à la portabilité</Text>
          </View>
        </Section>

        <View style={styles.dangerSection}>
          <Text style={styles.dangerTitle}>Zone de danger</Text>
          
          <TouchableOpacity 
            style={styles.deleteButton} 
            onPress={handleDeleteAccount}
            disabled={isDeleting}
          >
            <Ionicons name="trash-outline" size={20} color="#F5F3FA" />
            <Text style={styles.deleteButtonText}>
              {isDeleting ? 'Suppression...' : 'Supprimer mon compte'}
            </Text>
          </TouchableOpacity>
          
          <Text style={styles.dangerWarning}>
            Cette action supprimera définitivement votre compte et toutes les données associées.
          </Text>
        </View>

        <Text style={styles.footerText}>
          Dernière mise à jour : Mars 2025{'\n'}
          Pour toute question, contactez-nous à newschoolaide@gmail.com
        </Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0C0A12',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#16131F',
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
    color: '#F5F3FA',
  },
  placeholder: {
    width: 44,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
  },
  section: {
    marginBottom: 28,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#D946EF',
    marginBottom: 12,
  },
  sectionContent: {
    backgroundColor: '#16131F',
    borderRadius: 12,
    padding: 16,
  },
  paragraph: {
    fontSize: 15,
    color: '#D6D2E0',
    lineHeight: 22,
  },
  bulletList: {
    marginTop: 12,
  },
  bulletItem: {
    fontSize: 14,
    color: '#C4BFD1',
    lineHeight: 24,
  },
  dangerSection: {
    backgroundColor: '#16131F',
    borderRadius: 12,
    padding: 20,
    marginTop: 20,
    borderWidth: 1,
    borderColor: '#EF4444',
  },
  dangerTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#EF4444',
    marginBottom: 16,
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EF4444',
    borderRadius: 10,
    padding: 14,
    gap: 8,
  },
  deleteButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#F5F3FA',
  },
  dangerWarning: {
    fontSize: 12,
    color: '#A39DB3',
    textAlign: 'center',
    marginTop: 12,
  },
  footerText: {
    fontSize: 12,
    color: '#8E889E',
    textAlign: 'center',
    marginTop: 32,
    lineHeight: 18,
  },
});
