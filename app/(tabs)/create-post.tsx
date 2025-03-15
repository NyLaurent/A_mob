import { View, Text, StyleSheet, TextInput, TouchableOpacity, Image } from 'react-native';
import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { Image as ImageIcon, X } from 'lucide-react-native';

// ... rest of the code stays the same ... 