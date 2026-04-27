import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  Image,
} from 'react-native';
import { DemoUser, DemoUsers } from '../models/types';

interface LoginScreenProps {
  onLogin: (user: DemoUser) => void;
}

export function LoginScreen({ onLogin }: LoginScreenProps) {
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={{flex: 1}} contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Text style={styles.logo}>💬</Text>
          <Text style={styles.title}>RiviumChat</Text>
          <Text style={styles.subtitle}>E-commerce Demo</Text>
        </View>

        <View style={styles.description}>
          <Text style={styles.descriptionText}>
            Select a role to explore the buyer-seller chat experience
          </Text>
        </View>

        <View style={styles.userCards}>
          <View style={styles.userCard}>
            <View style={[styles.avatar, styles.buyerAvatar]}>
              {DemoUsers.buyer.avatarUrl ? (
                <Image
                  source={{ uri: DemoUsers.buyer.avatarUrl }}
                  style={styles.avatarImage}
                />
              ) : (
                <Text style={styles.avatarEmoji}>🛒</Text>
              )}
            </View>
            <Text style={styles.userName}>{DemoUsers.buyer.name}</Text>
            <Text style={styles.userRole}>Buyer</Text>
            <Text style={styles.userDescription}>
              Browse orders and chat with sellers about your purchases
            </Text>
            <TouchableOpacity
              style={[styles.loginButton, styles.buyerButton]}
              onPress={() => onLogin(DemoUsers.buyer)}
              activeOpacity={0.8}
            >
              <Text style={styles.loginButtonText}>Continue as Buyer</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.userCard}>
            <View style={[styles.avatar, styles.sellerAvatar]}>
              {DemoUsers.seller.avatarUrl ? (
                <Image
                  source={{ uri: DemoUsers.seller.avatarUrl }}
                  style={styles.avatarImage}
                />
              ) : (
                <Text style={styles.avatarEmoji}>🏪</Text>
              )}
            </View>
            <Text style={styles.userName}>{DemoUsers.seller.name}</Text>
            <Text style={styles.userRole}>Seller</Text>
            <Text style={styles.userDescription}>
              Manage orders and provide customer support via chat
            </Text>
            <TouchableOpacity
              style={[styles.loginButton, styles.sellerButton]}
              onPress={() => onLogin(DemoUsers.seller)}
              activeOpacity={0.8}
            >
              <Text style={styles.loginButtonText}>Continue as Seller</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Powered by RiviumChat SDK
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  header: {
    alignItems: 'center',
    marginTop: 40,
    marginBottom: 24,
  },
  logo: {
    fontSize: 56,
    marginBottom: 12,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: '#1C1C1E',
  },
  subtitle: {
    fontSize: 18,
    color: '#8E8E93',
    marginTop: 4,
  },
  description: {
    alignItems: 'center',
    marginBottom: 32,
  },
  descriptionText: {
    fontSize: 15,
    color: '#6E6E73',
    textAlign: 'center',
    lineHeight: 22,
  },
  userCards: {},
  userCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  buyerAvatar: {
    backgroundColor: '#E3F2FD',
  },
  sellerAvatar: {
    backgroundColor: '#E8F5E9',
  },
  avatarImage: {
    width: 72,
    height: 72,
    borderRadius: 36,
  },
  avatarEmoji: {
    fontSize: 32,
  },
  userName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1C1C1E',
  },
  userRole: {
    fontSize: 14,
    color: '#8E8E93',
    marginTop: 2,
  },
  userDescription: {
    fontSize: 13,
    color: '#6E6E73',
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 16,
    lineHeight: 18,
  },
  loginButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
    width: '100%',
    alignItems: 'center',
  },
  buyerButton: {
    backgroundColor: '#007AFF',
  },
  sellerButton: {
    backgroundColor: '#34C759',
  },
  loginButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  footer: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  footerText: {
    fontSize: 13,
    color: '#C7C7CC',
  },
});

export default LoginScreen;
