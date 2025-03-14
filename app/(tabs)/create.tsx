import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { FileText, Camera, Megaphone, MessageSquare } from 'lucide-react-native';

export default function CreateScreen() {
  const options = [
    {
      title: 'Create Post',
      icon: FileText,
      description: 'Share your thoughts with the community',
      color: '#FF6B6B',
    },
    {
      title: 'Add Story',
      icon: Camera,
      description: 'Share moments that last 24 hours',
      color: '#4ECDC4',
    },
    {
      title: 'Create Advertisement',
      icon: Megaphone,
      description: 'Promote your business or service',
      color: '#45B7D1',
    },
    {
      title: 'Start Chat',
      icon: MessageSquare,
      description: 'Begin a conversation with others',
      color: '#96CEB4',
    },
  ];

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Create</Text>
        <Text style={styles.subtitle}>What would you like to create?</Text>
      </View>

      <View style={styles.optionsGrid}>
        {options.map((option, index) => (
          <TouchableOpacity
            key={index}
            style={[styles.option, { backgroundColor: option.color }]}
          >
            <option.icon size={32} color="#fff" />
            <Text style={styles.optionTitle}>{option.title}</Text>
            <Text style={styles.optionDescription}>{option.description}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
  },
  optionsGrid: {
    flex: 1,
    padding: 20,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  option: {
    width: '47%',
    aspectRatio: 1,
    borderRadius: 20,
    padding: 20,
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  optionTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    marginTop: 12,
    marginBottom: 8,
  },
  optionDescription: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 14,
    lineHeight: 20,
  },
});