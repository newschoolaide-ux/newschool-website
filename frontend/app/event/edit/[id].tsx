import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
  Image,
} from 'react-native';
import { Text, TextInput } from '../../../components/ui/Text';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '../../../contexts/AuthContext';
import { useEventStore } from '../../../stores/eventStore';

const THEMES = ['Gastronomie', 'Sport', 'Musique', 'Art & Culture', 'Plein air', 'Vie nocturne', 'Business', 'Échange linguistique', 'Voyage', 'Jeux', 'Autre'];
const NATIONALITIES = ['Français', 'Américain', 'Britannique', 'Espagnol', 'Allemand', 'Italien', 'Portugais', 'Chinois', 'Japonais', 'Coréen', 'Brésilien', 'Mexicain', 'Canadien', 'Australien', 'Indien', 'Russe', 'Autre'];
const GENDER_OPTIONS = [
  { id: 'all', label: 'Tout le monde', icon: 'people' },
  { id: 'women', label: 'Femmes uniquement', icon: 'female' },
  { id: 'men', label: 'Hommes uniquement', icon: 'male' },
];
const AGE_RANGES = [
  { id: '18-25', label: '18-25 ans' },
  { id: '25-35', label: '25-35 ans' },
  { id: '35-45', label: '35-45 ans' },
  { id: '45-55', label: '45-55 ans' },
  { id: '55+', label: '55+ ans' },
];

export default function EditEventScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { token } = useAuth();
  const { currentEvent, fetchEvent, updateEvent, isLoading } = useEventStore();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [isInitializing, setIsInitializing] = useState(true);
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
  const [selectedAgeRanges, setSelectedAgeRanges] = useState<string[]>([]);
  const [addressSuggestions, setAddressSuggestions] = useState<any[]>([]);
  const [isSearchingAddress, setIsSearchingAddress] = useState(false);
  const searchTimeout = React.useRef<NodeJS.Timeout | null>(null);

  // Charger les données de l'événement existant
  useEffect(() => {
    const loadEvent = async () => {
      if (token && id) {
        await fetchEvent(token, id);
      }
    };
    loadEvent();
  }, [token, id]);

  // Pré-remplir le formulaire avec les données existantes
  useEffect(() => {
    if (currentEvent && currentEvent.event_id === id) {
      setName(currentEvent.name || '');
      setDescription(currentEvent.description || '');
      setLocationName(currentEvent.location_name || '');
      setLatitude(currentEvent.latitude || null);
      setLongitude(currentEvent.longitude || null);
      setMaxParticipants(String(currentEvent.max_participants || 10));
      setDurationHours(String(currentEvent.duration_hours || 2));
      setSelectedTheme(currentEvent.theme || null);
      setSelectedNationalities(currentEvent.desired_nationalities || []);
      setPhoto(currentEvent.photo || null);
      setSelectedGender((currentEvent as any).gender_filter || 'all');
      setSelectedAgeRanges((currentEvent as any).age_ranges || []);
      setIsInitializing(false);
    }
  }, [currentEvent, id]);

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

  const searchAddress = async (query: string) => {
    if (query.length < 3) {
      setAddressSuggestions([]);
      return;
    }
    
    setIsSearchingAddress(true);
    try {
      const results = await Location.geocodeAsync(query);
      if (results.length > 0) {
        const suggestions = await Promise.all(
          results.slice(0, 5).map(async (result) => {
            const addresses = await Location.reverseGeocodeAsync({
              latitude: result.latitude,
              longitude: result.longitude,
            });
            return {
              ...result,
              address: addresses[0] || null,
              displayName: addresses[0] 
                ? [addresses[0].street, addresses[0].district, addresses[0].city, addresses[0].region].filter(Boolean).join(', ')
                : `${result.latitude.toFixed(4)}, ${result.longitude.toFixed(4)}`,
            };
          })
        );
        setAddressSuggestions(suggestions);
      } else {
        setAddressSuggestions([]);
      }
    } catch (error) {
      console.error('Error searching address:', error);
      setAddressSuggestions([]);
    } finally {
      setIsSearchingAddress(false);
    }
  };

  const handleLocationChange = (text: string) => {
    setLocationName(text);
    
    if (searchTimeout.current) {
      clearTimeout(searchTimeout.current);
    }
    
    searchTimeout.current = setTimeout(() => {
      searchAddress(text);
    }, 500);
  };

  const selectAddress = (suggestion: any) => {
    setLatitude(suggestion.latitude);
    setLongitude(suggestion.longitude);
    setLocationName(suggestion.displayName);
    setAddressSuggestions([]);
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
      age_ranges: selectedAgeRanges,
    };

    try {
      await updateEvent(token!, id!, eventData);
      Alert.alert('Succès', 'Votre New School a été modifiée !', [
        { text: 'OK', onPress: () => router.back() }
      ]);
    } catch (error: any) {
      Alert.alert('Erreur', error.message);
    }
  };

  if (isInitializing) {
    return (
      <View style={[styles.container, styles.loadingContainer]}>
        <ActivityIndicator size="large" color="#D946EF" />
        <Text style={styles.loadingText}>Chargement...</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity style={styles.closeButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#F5F3FA" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Modifier la New School</Text>
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
              <Ionicons name="camera" size={40} color="#8E889E" />
              <Text style={styles.photoText}>Modifier la photo</Text>
            </View>
          )}
          <View style={styles.photoEditBadge}>
            <Ionicons name="pencil" size={16} color="#F5F3FA" />
          </View>
        </TouchableOpacity>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Nom de la New School *</Text>
          <TextInput
            style={styles.input}
            placeholder="Ex: Apéro international"
            placeholderTextColor="#8E889E"
            value={name}
            onChangeText={setName}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Description *</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Décrivez votre événement..."
            placeholderTextColor="#8E889E"
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
              placeholder="Tapez une adresse (ex: Lyon 5e)"
              placeholderTextColor="#8E889E"
              value={locationName}
              onChangeText={handleLocationChange}
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
          
          {isSearchingAddress && (
            <View style={styles.searchingIndicator}>
              <ActivityIndicator size="small" color="#D946EF" />
              <Text style={styles.searchingText}>Recherche...</Text>
            </View>
          )}
          
          {addressSuggestions.length > 0 && (
            <View style={styles.suggestionsContainer}>
              {addressSuggestions.map((suggestion, index) => (
                <TouchableOpacity
                  key={index}
                  style={styles.suggestionItem}
                  onPress={() => selectAddress(suggestion)}
                >
                  <Ionicons name="location" size={18} color="#D946EF" />
                  <Text style={styles.suggestionText} numberOfLines={2}>
                    {suggestion.displayName}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
          
          {latitude && longitude && (
            <Text style={styles.coordinates}>
              <Ionicons name="checkmark-circle" size={14} color="#10B981" /> Position confirmée
            </Text>
          )}
        </View>

        <View style={styles.row}>
          <View style={[styles.inputGroup, { flex: 1 }]}>
            <Text style={styles.label}>Participants max</Text>
            <TextInput
              style={styles.input}
              placeholder="10"
              placeholderTextColor="#8E889E"
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
              placeholderTextColor="#8E889E"
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
                  color={selectedGender === option.id ? '#F5F3FA' : '#A39DB3'}
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
          <Text style={styles.label}>Tranches d'âge (plusieurs choix possibles)</Text>
          <View style={styles.ageContainer}>
            {AGE_RANGES.map((range) => (
              <TouchableOpacity
                key={range.id}
                style={[
                  styles.ageChip,
                  selectedAgeRanges.includes(range.id) && styles.ageChipActive
                ]}
                onPress={() => {
                  if (selectedAgeRanges.includes(range.id)) {
                    setSelectedAgeRanges(selectedAgeRanges.filter(r => r !== range.id));
                  } else {
                    setSelectedAgeRanges([...selectedAgeRanges, range.id]);
                  }
                }}
              >
                <Text style={[
                  styles.ageChipText,
                  selectedAgeRanges.includes(range.id) && styles.ageChipTextActive
                ]}>
                  {range.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          {selectedAgeRanges.length === 0 && (
            <Text style={styles.hint}>Laissez vide pour tous âges</Text>
          )}
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
            <ActivityIndicator color="#F5F3FA" />
          ) : (
            <Text style={styles.submitButtonText}>Enregistrer les modifications</Text>
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0C0A12',
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    color: '#A39DB3',
    marginTop: 12,
    fontSize: 15,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#16131F',
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
    color: '#F5F3FA',
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
    position: 'relative',
  },
  photo: {
    width: '100%',
    height: '100%',
  },
  photoPlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: '#16131F',
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoText: {
    color: '#8E889E',
    marginTop: 8,
    fontSize: 14,
  },
  photoEditBadge: {
    position: 'absolute',
    bottom: 12,
    right: 12,
    backgroundColor: '#D946EF',
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    color: '#F5F3FA',
    fontSize: 15,
    fontWeight: '500',
    marginBottom: 10,
  },
  input: {
    backgroundColor: '#16131F',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    color: '#F5F3FA',
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
    backgroundColor: '#16131F',
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
    backgroundColor: '#16131F',
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
    color: '#A39DB3',
    fontSize: 14,
  },
  chipTextActive: {
    color: '#F5F3FA',
  },
  footer: {
    paddingHorizontal: 20,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#16131F',
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
    color: '#F5F3FA',
    fontSize: 17,
    fontWeight: '600',
  },
  genderContainer: {
    gap: 10,
  },
  genderOption: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#16131F',
    borderRadius: 12,
    padding: 14,
    gap: 12,
  },
  genderOptionActive: {
    backgroundColor: '#D946EF',
  },
  genderOptionText: {
    color: '#A39DB3',
    fontSize: 15,
    fontWeight: '500',
  },
  genderOptionTextActive: {
    color: '#F5F3FA',
  },
  ageContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  ageChip: {
    backgroundColor: '#16131F',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 20,
  },
  ageChipActive: {
    backgroundColor: '#D946EF',
  },
  ageChipText: {
    color: '#A39DB3',
    fontSize: 14,
    fontWeight: '500',
  },
  ageChipTextActive: {
    color: '#F5F3FA',
  },
  hint: {
    color: '#8E889E',
    fontSize: 12,
    marginTop: 8,
    fontStyle: 'italic',
  },
  searchingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
  },
  searchingText: {
    color: '#A39DB3',
    fontSize: 12,
  },
  suggestionsContainer: {
    backgroundColor: '#16131F',
    borderRadius: 12,
    marginTop: 8,
    overflow: 'hidden',
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#221E2D',
    gap: 12,
  },
  suggestionText: {
    flex: 1,
    color: '#F5F3FA',
    fontSize: 14,
  },
});
