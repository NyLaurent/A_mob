import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { z } from 'zod';
import { supabase } from '@/lib/supabase';
import { Mail, Lock, User, Eye, EyeOff } from 'lucide-react-native';

const signUpSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
      'Password must contain at least one uppercase letter, one lowercase letter, and one number'
    ),
  username: z
    .string()
    .min(3, 'Username must be at least 3 characters')
    .regex(/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores'),
});

type FormType = 'login' | 'signup' | 'forgot';

export default function AuthForm() {
  const [formType, setFormType] = useState<FormType>('login');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [form, setForm] = useState({
    email: '',
    password: '',
    username: '',
  });

  const handleSubmit = async () => {
    try {
      setLoading(true);

      if (formType === 'signup') {
        // Validate form data
        const validatedData = signUpSchema.parse(form);

        // Create user account
        const { error: signUpError } = await supabase.auth.signUp({
          email: validatedData.email,
          password: validatedData.password,
        });

        if (signUpError) throw signUpError;

        // Get the user's ID
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user?.id) throw new Error('User ID not found');

        // Create profile
        const { error: profileError } = await supabase.from('profiles').insert({
          id: user.id,
          username: validatedData.username,
          role: 'user',
        });

        if (profileError) throw profileError;

        Alert.alert(
          'Success',
          'Account created successfully! Please check your email for verification.'
        );
      } else if (formType === 'login') {
        const { error } = await supabase.auth.signInWithPassword({
          email: form.email,
          password: form.password,
        });

        if (error) throw error;
      } else if (formType === 'forgot') {
        const { error } = await supabase.auth.resetPasswordForEmail(form.email);
        if (error) throw error;

        Alert.alert('Success', 'Password reset instructions have been sent to your email.');
        setFormType('login');
      }
    } catch (error: any) {
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>
        {formType === 'login'
          ? 'Welcome Back'
          : formType === 'signup'
          ? 'Create Account'
          : 'Reset Password'}
      </Text>

      <View style={styles.form}>
        <View style={styles.inputContainer}>
          <Mail size={20} color="#666" style={styles.inputIcon} />
          <TextInput
            style={styles.input}
            placeholder="Email"
            value={form.email}
            onChangeText={(text) => setForm((prev) => ({ ...prev, email: text }))}
            autoCapitalize="none"
            keyboardType="email-address"
          />
        </View>

        {formType !== 'forgot' && (
          <View style={styles.inputContainer}>
            <Lock size={20} color="#666" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Password"
              value={form.password}
              onChangeText={(text) => setForm((prev) => ({ ...prev, password: text }))}
              secureTextEntry={!showPassword}
            />
            <TouchableOpacity
              style={styles.eyeIcon}
              onPress={() => setShowPassword(!showPassword)}
            >
              {showPassword ? (
                <EyeOff size={20} color="#666" />
              ) : (
                <Eye size={20} color="#666" />
              )}
            </TouchableOpacity>
          </View>
        )}

        {formType === 'signup' && (
          <View style={styles.inputContainer}>
            <User size={20} color="#666" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Username"
              value={form.username}
              onChangeText={(text) => setForm((prev) => ({ ...prev, username: text }))}
              autoCapitalize="none"
            />
          </View>
        )}

        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleSubmit}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>
              {formType === 'login'
                ? 'Sign In'
                : formType === 'signup'
                ? 'Sign Up'
                : 'Reset Password'}
            </Text>
          )}
        </TouchableOpacity>

        <View style={styles.footer}>
          {formType === 'login' ? (
            <>
              <TouchableOpacity onPress={() => setFormType('signup')}>
                <Text style={styles.footerText}>
                  Don't have an account? <Text style={styles.footerLink}>Sign Up</Text>
                </Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setFormType('forgot')}>
                <Text style={styles.footerLink}>Forgot Password?</Text>
              </TouchableOpacity>
            </>
          ) : (
            <TouchableOpacity onPress={() => setFormType('login')}>
              <Text style={styles.footerText}>
                Already have an account? <Text style={styles.footerLink}>Sign In</Text>
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    width: '100%',
    maxWidth: 400,
    alignSelf: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 30,
    textAlign: 'center',
  },
  form: {
    gap: 16,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    paddingHorizontal: 12,
  },
  input: {
    flex: 1,
    height: 50,
    marginLeft: 8,
  },
  inputIcon: {
    width: 20,
    height: 20,
  },
  eyeIcon: {
    padding: 8,
  },
  button: {
    backgroundColor: '#000',
    height: 50,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  footer: {
    marginTop: 24,
    gap: 16,
    alignItems: 'center',
  },
  footerText: {
    color: '#666',
    fontSize: 14,
  },
  footerLink: {
    color: '#000',
    fontWeight: '600',
  },
});