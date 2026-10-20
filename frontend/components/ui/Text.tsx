import React from 'react';
import {
  Text as RNText,
  TextInput as RNTextInput,
  TextProps,
  TextInputProps,
  StyleSheet,
} from 'react-native';
import { colors, fontFor } from '../../constants/theme';

// Texte de l'app : applique automatiquement les polices New School.
export const Text = React.forwardRef<RNText, TextProps>(({ style, ...rest }, ref) => {
  const flat = StyleSheet.flatten(style) as any;
  return <RNText ref={ref} {...rest} style={[style, fontFor(flat)]} />;
});
Text.displayName = 'Text';

// Champ de saisie : même police, curseur et sélection aux couleurs de l'app.
export const TextInput = React.forwardRef<RNTextInput, TextInputProps>(({ style, ...rest }, ref) => {
  const flat = StyleSheet.flatten(style) as any;
  return (
    <RNTextInput
      ref={ref}
      placeholderTextColor={colors.faint}
      selectionColor={colors.accent}
      cursorColor={colors.accent}
      keyboardAppearance="dark"
      {...rest}
      style={[style, fontFor({ ...flat, fontWeight: flat?.fontWeight ?? '500' })]}
    />
  );
});
TextInput.displayName = 'TextInput';
