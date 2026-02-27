import React, { useEffect, useState } from 'react';
import { View, StyleSheet, Image, Animated } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../contexts/AuthContext';

export default function Index() {
  const { isLoading, isAuthenticated } = useAuth();
  const router = useRouter();
  const [showSplash, setShowSplash] = useState(true);
  const fadeAnim = useState(new Animated.Value(1))[0];

  useEffect(() => {
    // Show splash for 1.5 seconds
    const timer = setTimeout(() => {
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start(() => {
        setShowSplash(false);
      });
    }, 1500);

    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!showSplash && !isLoading) {
      if (isAuthenticated) {
        router.replace('/(tabs)/home');
      } else {
        router.replace('/(auth)/login');
      }
    }
  }, [showSplash, isLoading, isAuthenticated]);

  if (showSplash) {
    return (
      <Animated.View style={[styles.splashContainer, { opacity: fadeAnim }]}>
        <Image
          source={require('../assets/images/logo-newschool.png')}
          style={styles.logo}
          resizeMode="contain"
        />
      </Animated.View>
    );
  }

  return (
    <View style={styles.container}>
      <Image
        source={require('../assets/images/logo-newschool.png')}
        style={styles.smallLogo}
        resizeMode="contain"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  splashContainer: {
    flex: 1,
    backgroundColor: '#000000',
    alignItems: 'center',
    justifyContent: 'center',
  },
  container: {
    flex: 1,
    backgroundColor: '#0A0A0A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: {
    width: 200,
    height: 200,
  },
  smallLogo: {
    width: 80,
    height: 80,
  },
});
