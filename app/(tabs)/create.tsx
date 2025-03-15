import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Image,
  Modal,
  ScrollView,
} from 'react-native';
import {
  FileText,
  Camera,
  Megaphone,
  MessageSquare,
  Image as ImageIcon,
  X,
  ChevronDown,
} from 'lucide-react-native';
import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';

// Define categories
const CATEGORIES = [
  'POLITICS',
  'BUSINESS',
  'TECHNOLOGY',
  'SCIENCE',
  'HEALTH',
  'SPORTS',
  'ENTERTAINMENT',
  'LIFESTYLE',
  'WORLD',
  'EDUCATION',
  'ENVIRONMENT',
  'TRAVEL',
  'FOOD',
  'FASHION',
  'ART',
  'CULTURE',
  'RELIGION',
  'CRIME',
  'OPINION',
  'ANALYSIS',
  'LOCAL',
  'NATIONAL',
  'GLOBAL',
  'HISTORY',
  'WEATHER',
  'FINANCE',
  'REAL_ESTATE',
  'STARTUPS',
  'AUTOMOTIVE',
  'CAREER',
  'LAW',
  'PHOTOGRAPHY',
  'VIDEOGRAPHY',
  'ANIMALS',
  'AGRICULTURE',
  'GAMING',
  'CELEBRITY',
];

export default function CreateScreen() {
  const [title, setTitle] = useState('');
  const [shortDescription, setShortDescription] = useState('');
  const [content, setContent] = useState('');
  const [category, setCategory] = useState<string>('');
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);
  const [imageUri, setImageUri] = useState<string | null>(null);
  const router = useRouter();
  const [showPostForm, setShowPostForm] = useState(false);
  const [storyImage, setStoryImage] = useState<string | null>(null);
  const [storyCaption, setStoryCaption] = useState('');
  const [showStoryForm, setShowStoryForm] = useState(false);

  async function pickImage() {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 1,
    });

    if (!result.canceled) {
      setImageUri(result.assets[0].uri);
    }
  }

  async function createPost() {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        console.error('No user found');
        alert('Please login first');
        return;
      }

      if (!category) {
        alert('Please select a category');
        return;
      }

      // Create post with direct image URI (same approach as stories)
      const { error: postError } = await supabase.from('posts').insert({
        user_id: user.id,
        title,
        short_description: shortDescription,
        content,
        image_url: imageUri, // Use the image URI directly like in stories
        category,
      });

      if (postError) {
        console.error('Error creating post:', postError);
        alert('Failed to create post: ' + postError.message);
        return;
      }

      console.log('Post created successfully with image:', imageUri);

      // Reset form and navigate
      setTitle('');
      setShortDescription('');
      setContent('');
      setCategory('');
      setImageUri(null);
      setShowPostForm(false);
      router.push('/posts');

      alert('Post created successfully!');
    } catch (error) {
      console.error('Error in createPost:', error);
      alert('Failed to create post: ' + (error as Error).message);
    }
  }

  async function handleAddStory() {
    try {
      // Request permissions first
      const permissionResult =
        await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permissionResult.granted) {
        alert('Permission to access camera roll is required!');
        return;
      }

      // Pick the image
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [9, 16],
        quality: 0.7,
        base64: true,
      });

      console.log('Image picker result:', result);

      if (!result.canceled) {
        // Set the image and show the caption input form
        setStoryImage(result.assets[0].uri);
        setShowStoryForm(true);
      }
    } catch (error) {
      console.error('Detailed error in handleAddStory:', error);
      alert('Failed to select image: ' + (error as Error).message);
    }
  }

  async function createStory() {
    try {
      if (!storyImage) {
        alert('Please select an image first');
        return;
      }

      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        alert('Please login first');
        return;
      }

      // Set expiration date to 24 hours from now
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 24);

      // Create story with image and caption
      const { data, error: storyError } = await supabase
        .from('stories')
        .insert({
          user_id: user.id,
          image_url: storyImage,
          caption: storyCaption,
          expires_at: expiresAt.toISOString(),
        })
        .select()
        .single();

      if (storyError) {
        console.error('Error creating story:', storyError);
        alert('Failed to create story: ' + storyError.message);
        return;
      }

      console.log('Story created successfully:', data);

      // Reset form and navigate back
      setStoryImage(null);
      setStoryCaption('');
      setShowStoryForm(false);

      alert('Story created successfully!');
      router.push('/');
    } catch (error) {
      console.error('Detailed error in createStory:', error);
      alert('Failed to create story: ' + (error as Error).message);
    }
  }

  const options = [
    {
      title: 'Create Post',
      icon: FileText,
      description: 'Share your thoughts with the community',
      color: '#FF6B6B',
      onPress: () => setShowPostForm(true),
    },
    {
      title: 'Add Story',
      icon: Camera,
      description: 'Share moments that last 24 hours',
      color: '#4ECDC4',
      onPress: handleAddStory,
    },
    {
      title: 'Create Advertisement',
      icon: Megaphone,
      description: 'Promote your business or service',
      color: '#45B7D1',
      onPress: () => {},
    },
    {
      title: 'Start Chat',
      icon: MessageSquare,
      description: 'Begin a conversation with others',
      color: '#96CEB4',
      onPress: () => {},
    },
  ];

  return (
    <View style={styles.container}>
      {!showPostForm ? (
        <>
          <View style={styles.header}>
            <Text style={styles.title}>Create</Text>
            <Text style={styles.subtitle}>What would you like to create?</Text>
          </View>

          <View style={styles.optionsGrid}>
            {options.map((option, index) => (
              <TouchableOpacity
                key={index}
                style={[styles.option, { backgroundColor: option.color }]}
                onPress={option.onPress}
              >
                <option.icon size={32} color="#fff" />
                <Text style={styles.optionTitle}>{option.title}</Text>
                <Text style={styles.optionDescription}>
                  {option.description}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </>
      ) : (
        <View style={styles.formContainer}>
          <View style={styles.formHeader}>
            <TouchableOpacity onPress={() => setShowPostForm(false)}>
              <Text style={styles.cancelButton}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.formTitle}>Create Post</Text>
            <TouchableOpacity
              onPress={createPost}
              disabled={!title || !content || !category || !shortDescription}
            >
              <Text
                style={[
                  styles.postButton,
                  (!title || !content || !category || !shortDescription) &&
                    styles.postButtonDisabled,
                ]}
              >
                Post
              </Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.form}>
            <TextInput
              style={styles.titleInput}
              placeholder="Title"
              value={title}
              onChangeText={setTitle}
              placeholderTextColor="#666"
            />

            <TextInput
              style={styles.shortDescriptionInput}
              placeholder="Short description (displayed on cards)"
              value={shortDescription}
              onChangeText={setShortDescription}
              multiline
              placeholderTextColor="#666"
              maxLength={150}
            />

            {/* Category Selector */}
            <TouchableOpacity
              style={styles.categorySelector}
              onPress={() => setShowCategoryPicker(true)}
            >
              <Text
                style={
                  category ? styles.categoryText : styles.categoryPlaceholder
                }
              >
                {category || 'Select a category'}
              </Text>
              <ChevronDown size={20} color="#666" />
            </TouchableOpacity>

            <TextInput
              style={styles.contentInput}
              placeholder="What's on your mind?"
              value={content}
              onChangeText={setContent}
              multiline
              placeholderTextColor="#666"
            />

            {imageUri ? (
              <View style={styles.imagePreviewContainer}>
                <Image source={{ uri: imageUri }} style={styles.imagePreview} />
                <TouchableOpacity
                  style={styles.removeImageButton}
                  onPress={() => setImageUri(null)}
                >
                  <X size={24} color="#fff" />
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity
                style={styles.addImageButton}
                onPress={pickImage}
              >
                <ImageIcon size={24} color="#666" />
                <Text style={styles.addImageText}>Add Image</Text>
              </TouchableOpacity>
            )}
          </ScrollView>
        </View>
      )}

      {/* Category Picker Modal */}
      {showCategoryPicker && (
        <Modal
          animationType="slide"
          transparent={true}
          visible={showCategoryPicker}
          onRequestClose={() => setShowCategoryPicker(false)}
        >
          <View style={styles.categoryModalOverlay}>
            <View style={styles.categoryModalContent}>
              <View style={styles.categoryModalHeader}>
                <Text style={styles.categoryModalTitle}>Select Category</Text>
                <TouchableOpacity onPress={() => setShowCategoryPicker(false)}>
                  <Text style={styles.closeButton}>X</Text>
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.categoryList}>
                {CATEGORIES.map((cat, index) => (
                  <TouchableOpacity
                    key={index}
                    style={[
                      styles.categoryItem,
                      category === cat && styles.selectedCategoryItem,
                    ]}
                    onPress={() => {
                      setCategory(cat);
                      setShowCategoryPicker(false);
                    }}
                  >
                    <Text
                      style={[
                        styles.categoryItemText,
                        category === cat && styles.selectedCategoryItemText,
                      ]}
                    >
                      {cat}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </View>
        </Modal>
      )}

      {showStoryForm && (
        <Modal
          animationType="slide"
          transparent={true}
          visible={showStoryForm}
          onRequestClose={() => {
            setShowStoryForm(false);
            setStoryImage(null);
            setStoryCaption('');
          }}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Create Story</Text>
                <TouchableOpacity
                  onPress={() => {
                    setShowStoryForm(false);
                    setStoryImage(null);
                    setStoryCaption('');
                  }}
                >
                  <Text style={styles.closeButton}>X</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.storyFormActions}>
                <TouchableOpacity
                  style={[
                    styles.postButton,
                    !storyImage && styles.postButtonDisabled,
                  ]}
                  onPress={createStory}
                  disabled={!storyImage}
                >
                  <Text
                    style={[
                      styles.postButton,
                      !storyImage && styles.postButtonDisabled,
                    ]}
                  >
                    Share
                  </Text>
                </TouchableOpacity>
              </View>

              {storyImage && (
                <Image
                  source={{ uri: storyImage }}
                  style={styles.storyPreview}
                  resizeMode="cover"
                />
              )}

              <TextInput
                style={styles.captionInput}
                placeholder="Add a caption..."
                value={storyCaption}
                onChangeText={setStoryCaption}
                multiline
              />
            </View>
          </View>
        </Modal>
      )}
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
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
  },
  optionsGrid: {
    padding: 20,
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  option: {
    width: '48%',
    padding: 16,
    alignItems: 'center',
    margin: '1%',
    borderRadius: 10,
  },
  optionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: 8,
    color: '#fff',
  },
  optionDescription: {
    fontSize: 12,
    color: '#fff',
    textAlign: 'center',
    marginTop: 4,
  },
  formContainer: {
    flex: 1,
    backgroundColor: '#fff',
    paddingTop: 50,
  },
  formHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    backgroundColor: '#fff',
  },
  formTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  cancelButton: {
    fontSize: 16,
    color: '#666',
  },
  postButton: {
    fontSize: 16,
    color: '#0066ff',
    fontWeight: '600',
  },
  postButtonDisabled: {
    color: '#ccc',
  },
  form: {
    padding: 20,
  },
  titleInput: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 16,
    padding: 12,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
  },
  shortDescriptionInput: {
    fontSize: 16,
    marginBottom: 16,
    padding: 12,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    height: 80,
    textAlignVertical: 'top',
  },
  categorySelector: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    marginBottom: 16,
  },
  categoryText: {
    fontSize: 16,
    color: '#000',
  },
  categoryPlaceholder: {
    fontSize: 16,
    color: '#666',
  },
  contentInput: {
    fontSize: 16,
    marginBottom: 16,
    padding: 12,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    height: 150,
    textAlignVertical: 'top',
  },
  addImageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
  },
  addImageText: {
    marginLeft: 8,
    fontSize: 16,
    color: '#666',
  },
  imagePreviewContainer: {
    position: 'relative',
    marginBottom: 16,
  },
  imagePreview: {
    width: '100%',
    height: 200,
    borderRadius: 8,
  },
  removeImageButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 20,
    padding: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '90%',
    backgroundColor: 'white',
    borderRadius: 15,
    padding: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  modalHeader: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  closeButton: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#666',
  },
  storyFormActions: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginBottom: 15,
  },
  storyPreview: {
    width: '100%',
    height: 300,
    borderRadius: 10,
    marginBottom: 15,
  },
  captionInput: {
    width: '100%',
    height: 80,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    padding: 10,
    marginBottom: 15,
    textAlignVertical: 'top',
  },
  categoryModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  categoryModalContent: {
    width: '90%',
    maxHeight: '80%',
    backgroundColor: 'white',
    borderRadius: 15,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  categoryModalHeader: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  categoryModalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  categoryList: {
    width: '100%',
    maxHeight: 400,
  },
  categoryItem: {
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  selectedCategoryItem: {
    backgroundColor: '#e6f7ff',
  },
  categoryItemText: {
    fontSize: 16,
  },
  selectedCategoryItemText: {
    color: '#0066ff',
    fontWeight: 'bold',
  },
});
