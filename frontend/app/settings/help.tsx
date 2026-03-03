import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Linking,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

const FAQ_ITEMS = [
  {
    question: "Comment créer une New School ?",
    answer: "Appuyez sur le bouton '+' sur la carte ou l'écran d'accueil, remplissez les informations de votre événement (nom, lieu, date, etc.) et publiez. Votre school sera visible sur la carte pour les autres utilisateurs."
  },
  {
    question: "Comment rejoindre une school ?",
    answer: "Parcourez la carte ou la liste des événements, appuyez sur une school qui vous intéresse, puis cliquez sur 'Rejoindre'. Vous aurez accès au chat de groupe et aux informations de l'événement."
  },
  {
    question: "Quelles sont les limites de mon abonnement ?",
    answer: "• Gratuit : 1 création + 3 participations par mois\n• Standard (7,99€) : 4 créations/participations par mois\n• Ambassadeur (10,99€) : Illimité"
  },
  {
    question: "Comment modifier ou supprimer ma school ?",
    answer: "Allez sur votre profil, trouvez la school dans 'Mes Schools', appuyez dessus et utilisez les options de modification ou suppression. Seul le créateur peut modifier ou supprimer une school."
  },
  {
    question: "Que signifient les couleurs sur la carte ?",
    answer: "Chaque couleur représente un thème différent :\n• Rouge = Sport\n• Bleu = Musique\n• Orange = Gastronomie\n• Vert = Plein air\n• Rose = Vie nocturne\n• etc."
  },
  {
    question: "Comment signaler un utilisateur inapproprié ?",
    answer: "Appuyez sur le profil de l'utilisateur et utilisez l'option 'Signaler'. Notre équipe examinera le signalement et prendra les mesures nécessaires."
  },
];

export default function HelpScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);
  const [message, setMessage] = useState('');
  const [isSending, setIsSending] = useState(false);

  const toggleFAQ = (index: number) => {
    setExpandedIndex(expandedIndex === index ? null : index);
  };

  const sendSupportMessage = async () => {
    if (!message.trim()) {
      Alert.alert('Message vide', 'Veuillez écrire votre message avant d\'envoyer.');
      return;
    }

    setIsSending(true);
    // Simulate sending - in production, this would call your support API
    setTimeout(() => {
      setIsSending(false);
      setMessage('');
      Alert.alert(
        'Message envoyé',
        'Nous avons bien reçu votre message. Notre équipe vous répondra dans les 24h.',
        [{ text: 'OK' }]
      );
    }, 1500);
  };

  const contactEmail = () => {
    Linking.openURL('mailto:support@newschool.app?subject=Support New School');
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#FFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Aide et support</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        {/* Quick Actions */}
        <View style={styles.quickActions}>
          <TouchableOpacity style={styles.quickAction} onPress={contactEmail}>
            <View style={[styles.quickActionIcon, { backgroundColor: '#2196F3' }]}>
              <Ionicons name="mail" size={24} color="#FFF" />
            </View>
            <Text style={styles.quickActionText}>Email</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.quickAction} 
            onPress={() => Linking.openURL('https://instagram.com/newschool.app')}
          >
            <View style={[styles.quickActionIcon, { backgroundColor: '#E1306C' }]}>
              <Ionicons name="logo-instagram" size={24} color="#FFF" />
            </View>
            <Text style={styles.quickActionText}>Instagram</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.quickAction}
            onPress={() => Linking.openURL('https://twitter.com/newschoolapp')}
          >
            <View style={[styles.quickActionIcon, { backgroundColor: '#1DA1F2' }]}>
              <Ionicons name="logo-twitter" size={24} color="#FFF" />
            </View>
            <Text style={styles.quickActionText}>Twitter</Text>
          </TouchableOpacity>
        </View>

        {/* FAQ Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Questions fréquentes</Text>
          
          {FAQ_ITEMS.map((item, index) => (
            <TouchableOpacity 
              key={index} 
              style={styles.faqItem}
              onPress={() => toggleFAQ(index)}
              activeOpacity={0.8}
            >
              <View style={styles.faqHeader}>
                <Text style={styles.faqQuestion}>{item.question}</Text>
                <Ionicons 
                  name={expandedIndex === index ? "chevron-up" : "chevron-down"} 
                  size={20} 
                  color="#888" 
                />
              </View>
              {expandedIndex === index && (
                <Text style={styles.faqAnswer}>{item.answer}</Text>
              )}
            </TouchableOpacity>
          ))}
        </View>

        {/* Contact Form */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Nous contacter</Text>
          <View style={styles.contactForm}>
            <Text style={styles.formLabel}>Décrivez votre problème ou suggestion</Text>
            <TextInput
              style={styles.textArea}
              placeholder="Écrivez votre message ici..."
              placeholderTextColor="#666"
              value={message}
              onChangeText={setMessage}
              multiline
              numberOfLines={5}
              textAlignVertical="top"
            />
            <TouchableOpacity 
              style={[styles.sendButton, !message.trim() && styles.sendButtonDisabled]}
              onPress={sendSupportMessage}
              disabled={isSending || !message.trim()}
            >
              {isSending ? (
                <ActivityIndicator size="small" color="#FFF" />
              ) : (
                <>
                  <Ionicons name="send" size={18} color="#FFF" />
                  <Text style={styles.sendButtonText}>Envoyer</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* App Info */}
        <View style={styles.appInfo}>
          <Text style={styles.appVersion}>New School v1.0.0</Text>
          <Text style={styles.appCopyright}>© 2025 New School. Tous droits réservés.</Text>
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
  placeholder: {
    width: 44,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
  },
  quickActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 32,
  },
  quickAction: {
    alignItems: 'center',
  },
  quickActionIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  quickActionText: {
    fontSize: 13,
    color: '#888',
  },
  section: {
    marginBottom: 28,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#D946EF',
    marginBottom: 16,
  },
  faqItem: {
    backgroundColor: '#1A1A1A',
    borderRadius: 12,
    padding: 16,
    marginBottom: 10,
  },
  faqHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  faqQuestion: {
    fontSize: 15,
    fontWeight: '500',
    color: '#FFF',
    flex: 1,
    paddingRight: 12,
  },
  faqAnswer: {
    fontSize: 14,
    color: '#AAA',
    marginTop: 12,
    lineHeight: 22,
  },
  contactForm: {
    backgroundColor: '#1A1A1A',
    borderRadius: 12,
    padding: 16,
  },
  formLabel: {
    fontSize: 14,
    color: '#888',
    marginBottom: 12,
  },
  textArea: {
    backgroundColor: '#0A0A0A',
    borderRadius: 10,
    padding: 14,
    color: '#FFF',
    fontSize: 15,
    minHeight: 120,
    marginBottom: 16,
  },
  sendButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#D946EF',
    borderRadius: 10,
    padding: 14,
    gap: 8,
  },
  sendButtonDisabled: {
    backgroundColor: '#444',
  },
  sendButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFF',
  },
  appInfo: {
    alignItems: 'center',
    marginTop: 20,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#1A1A1A',
  },
  appVersion: {
    fontSize: 14,
    color: '#666',
  },
  appCopyright: {
    fontSize: 12,
    color: '#444',
    marginTop: 4,
  },
});
