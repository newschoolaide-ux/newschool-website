import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
  Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '../contexts/AuthContext';
import { useEventStore } from '../stores/eventStore';

const THEMES = ['Gastronomie', 'Sport', 'Musique', 'Art & Culture', 'Plein air', 'Vie nocturne', 'Business', 'Échange linguistique', 'Voyage', 'Jeux', 'Autre'];
const NATIONALITIES = ['Français', 'Américain', 'Britannique', 'Espagnol', 'Allemand', 'Italien', 'Portugais', 'Chinois', 'Japonais', 'Coréen', 'Brésilien', 'Mexicain', 'Canadien', 'Australien', 'Indien', 'Russe', 'Autre'];
const GENDER_OPTIONS = [
  { id: 'all', label: 'Tout le monde', icon: 'people' },
  { id: 'women', label: 'Femmes uniquement', icon: 'female' },
  { id: 'men', label: 'Hommes uniquement', icon: 'male' },
];
const AGE_RANGES = [
  { id: '18-25', label: '18-25 ans', min: 18, max: 25 },
  { id: '25-35', label: '25-35 ans', min: 25, max: 35 },
  { id: '35-45', label: '35-45 ans', min: 35, max: 45 },
  { id: '45-55', label: '45-55 ans', min: 45, max: 55 },
  { id: '55+', label: '55+ ans', min: 55, max: 100 },
  { id: 'all', label: 'Tous âges', min: null, max: null },
];

export default function CreateEventScreen() {
  const { token } = useAuth();
  const { createEvent, isLoading } = useEventStore();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [locationName, setLocationName] = useState('');
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [maxParticipants, setMaxParticipants] = useState('10');
  const [durationHours, setDurationHours] = useState('2');
  const [selectedTheme, setSelectedTheme] = useState<string | null>(null);
  const [selectedNationalities, setSelectedNationalities] = useState<string[]>([]);
  const [photo, setPhoto] = useState<string | null>(null);
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const [selectedGender, setSelectedGender] = useState<string>('all');
  const [selectedAgeRange, setSelectedAgeRange] = useState<string>('all');

  useEffect(() => {
    getCurrentLocation();
  }, []);

  const getCurrentLocation = async () => {
    setIsGettingLocation(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        const loc = await Location.getCurrentPositionAsync({});
        setLatitude(loc.coords.latitude);
        setLongitude(loc.coords.longitude);
        
        const address = await Location.reverseGeocodeAsync({
          latitude: loc.coords.latitude,
          longitude: loc.coords.longitude,
        });
        
        if (address.length > 0) {
          const addr = address[0];
          const parts = [addr.street, addr.city, addr.country].filter(Boolean);
          setLocationName(parts.join(', '));
        }
      }
    } catch (error) {
      console.error('Error getting location:', error);
    } finally {
      setIsGettingLocation(false);
    }
  };

  const pickImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission requise', 'Veuillez autoriser l\'accès à la galerie photo');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [16, 9],
        quality: 0.5,
        base64: true,
      });

      if (!result.canceled && result.assets[0].base64) {
        setPhoto(`data:image/jpeg;base64,${result.assets[0].base64}`);
      }
    } catch (error) {
      console.error('Error picking image:', error);
    }
  };

  const toggleNationality = (nat: string) => {
    setSelectedNationalities(prev =>
      prev.includes(nat)
        ? prev.filter(n => n !== nat)
        : [...prev, nat]
    );
  };

  const handleSubmit = async () => {
    if (!name.trim()) {
      Alert.alert('Erreur', 'Veuillez entrer un nom pour l\'événement');
      return;
    }
    if (!description.trim()) {
      Alert.alert('Erreur', 'Veuillez ajouter une description');
      return;
    }
    if (!locationName.trim() || latitude === null || longitude === null) {
      Alert.alert('Erreur', 'Veuillez définir un lieu');
      return;
    }

    const selectedAge = AGE_RANGES.find(a => a.id === selectedAgeRange);
    
    const eventData = {
      name: name.trim(),
      description: description.trim(),
      location_name: locationName.trim(),
      latitude,
      longitude,
      max_participants: parseInt(maxParticipants) || 10,
      duration_hours: parseInt(durationHours) || 2,
      desired_nationalities: selectedNationalities,
      theme: selectedTheme,
      photo,
      gender_filter: selectedGender,
      age_range_min: selectedAge?.min || null,
      age_range_max: selectedAge?.max || null,
    };

    try {
      const event = await createEvent(token!, eventData);
      Alert.alert('Succès', 'Votre New School a été créée !', [
        { text: 'OK', onPress: () => router.replace(`/event/${event.event_id}`) }
      ]);
    } catch (error: any) {
      Alert.alert('Erreur', error.message);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity style={styles.closeButton} onPress={() => router.back()}>
          <Ionicons name="close" size={24} color="#FFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Créer une New School</Text>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView
        style={styles.form}
        contentContainerStyle={styles.formContent}
        keyboardShouldPersistTaps="handled"
      >
        <TouchableOpacity style={styles.photoContainer} onPress={pickImage}>
          {photo ? (
            <Image source={{ uri: photo }} style={styles.photo} />
          ) : (
            <View style={styles.photoPlaceholder}>
              <Ionicons name="camera" size={40} color="#666" />
              <Text style={styles.photoText}>Ajouter une photo</Text>
            </View>
          )}
        </TouchableOpacity>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Nom de la New School *</Text>
          <TextInput
            style={styles.input}
            placeholder="Ex: Apéro international"
            placeholderTextColor="#666"
            value={name}
            onChangeText={setName}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Description *</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Décrivez votre événement..."
            placeholderTextColor="#666"
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Lieu *</Text>
          <View style={styles.locationRow}>
            <TextInput
              style={[styles.input, styles.locationInput]}
              placeholder="Adresse ou nom du lieu"
              placeholderTextColor="#666"
              value={locationName}
              onChangeText={setLocationName}
            />
            <TouchableOpacity
              style={styles.locationButton}
              onPress={getCurrentLocation}
              disabled={isGettingLocation}
            >
              {isGettingLocation ? (
                <ActivityIndicator size="small" color="#D946EF" />
              ) : (
                <Ionicons name="locate" size={22} color="#D946EF" />
              )}
            </TouchableOpacity>
          </View>
          {latitude && longitude && (
            <Text style={styles.coordinates}>
              Position détectée
            </Text>
          )}
        </View>

        <View style={styles.row}>
          <View style={[styles.inputGroup, { flex: 1 }]}>
            <Text style={styles.label}>Participants max</Text>
            <TextInput
              style={styles.input}
              placeholder="10"
              placeholderTextColor="#666"
              value={maxParticipants}
              onChangeText={setMaxParticipants}
              keyboardType="number-pad"
            />
          </View>
          <View style={[styles.inputGroup, { flex: 1, marginLeft: 16 }]}>
            <Text style={styles.label}>Durée (heures)</Text>
            <TextInput
              style={styles.input}
              placeholder="2"
              placeholderTextColor="#666"
              value={durationHours}
              onChangeText={setDurationHours}
              keyboardType="number-pad"
            />
          </View>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Ouvert à</Text>
          <View style={styles.genderContainer}>
            {GENDER_OPTIONS.map((option) => (
              <TouchableOpacity
                key={option.id}
                style={[
                  styles.genderOption,
                  selectedGender === option.id && styles.genderOptionActive
                ]}
                onPress={() => setSelectedGender(option.id)}
              >
                <Ionicons
                  name={option.icon as any}
                  size={24}
                  color={selectedGender === option.id ? '#FFF' : '#888'}
                />
                <Text style={[
                  styles.genderOptionText,
                  selectedGender === option.id && styles.genderOptionTextActive
                ]}>
                  {option.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Tranche d'âge</Text>
          <View style={styles.ageContainer}>
            {AGE_RANGES.map((range) => (
              <TouchableOpacity
                key={range.id}
                style={[
                  styles.ageChip,
                  selectedAgeRange === range.id && styles.ageChipActive
                ]}
                onPress={() => setSelectedAgeRange(range.id)}
              >
                <Text style={[
                  styles.ageChipText,
                  selectedAgeRange === range.id && styles.ageChipTextActive
                ]}>
                  {range.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Thème</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipsScroll}>
            {THEMES.map((theme) => (
              <TouchableOpacity
                key={theme}
                style={[styles.chip, selectedTheme === theme && styles.chipActive]}
                onPress={() => setSelectedTheme(selectedTheme === theme ? null : theme)}
              >
                <Text style={[styles.chipText, selectedTheme === theme && styles.chipTextActive]}>
                  {theme}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Nationalités souhaitées (optionnel)</Text>
          <View style={styles.chipsContainer}>
            {NATIONALITIES.map((nat) => (
              <TouchableOpacity
                key={nat}
                style={[styles.chip, selectedNationalities.includes(nat) && styles.chipActive]}
                onPress={() => toggleNationality(nat)}
              >
                <Text style={[styles.chipText, selectedNationalities.includes(nat) && styles.chipTextActive]}>
                  {nat}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + 12 }]}>
        <TouchableOpacity
          style={[styles.submitButton, isLoading && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <Text style={styles.submitButtonText}>Créer la New School</Text>
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
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
  form: {
    flex: 1,
  },
  formContent: {
    padding: 20,
    paddingBottom: 40,
  },
  photoContainer: {
    width: '100%',
    height: 180,
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 24,
  },
  photo: {
    width: '100%',
    height: '100%',
  },
  photoPlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: '#1A1A1A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoText: {
    color: '#666',
    marginTop: 8,
    fontSize: 14,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '500',
    marginBottom: 10,
  },
  input: {
    backgroundColor: '#1A1A1A',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    color: '#FFF',
    fontSize: 16,
  },
  textArea: {
    minHeight: 100,
    paddingTop: 14,
  },
  locationRow: {
    flexDirection: 'row',
    gap: 10,
  },
  locationInput: {
    flex: 1,
  },
  locationButton: {
    width: 52,
    height: 52,
    backgroundColor: '#1A1A1A',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  coordinates: {
    color: '#4CAF50',
    fontSize: 13,
    marginTop: 8,
  },
  row: {
    flexDirection: 'row',
  },
  chipsScroll: {
    marginHorizontal: -20,
    paddingHorizontal: 20,
  },
  chipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    backgroundColor: '#1A1A1A',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
    marginRight: 8,
    marginBottom: 8,
  },
  chipActive: {
    backgroundColor: '#D946EF',
  },
  chipText: {
    color: '#888',
    fontSize: 14,
  },
  chipTextActive: {
    color: '#FFF',
  },
  footer: {
    paddingHorizontal: 20,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#1A1A1A',
  },
  submitButton: {
    backgroundColor: '#D946EF',
    borderRadius: 12,
    height: 54,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitButtonDisabled: {
    opacity: 0.7,
  },
  submitButtonText: {
    color: '#FFF',
    fontSize: 17,
    fontWeight: '600',
  },
  genderContainer: {
    gap: 10,
  },
  genderOption: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1A1A1A',
    borderRadius: 12,
    padding: 14,
    gap: 12,
  },
  genderOptionActive: {
    backgroundColor: '#D946EF',
  },
  genderOptionText: {
    color: '#888',
    fontSize: 15,
    fontWeight: '500',
  },
  genderOptionTextActive: {
    color: '#FFF',
  },
  ageContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  ageChip: {
    backgroundColor: '#1A1A1A',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 20,
  },
  ageChipActive: {
    backgroundColor: '#D946EF',
  },
  ageChipText: {
    color: '#888',
    fontSize: 14,
    fontWeight: '500',
  },
  ageChipTextActive: {
    color: '#FFF',
  },
});
