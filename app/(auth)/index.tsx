import { View, StyleSheet } from 'react-native';
import AuthForm from '@/components/auth/AuthForm';

export default function AuthScreen() {
  return (
    <View style={styles.container}>
      <AuthForm />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    backgroundColor: '#fff',
  },
});