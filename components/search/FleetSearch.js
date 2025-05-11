import React, { useState } from 'react';
import { View, TextInput, TouchableOpacity, Text, StyleSheet, Alert, FlatList, Image } from 'react-native';
import { getFirestore, collection, query, where, getDocs } from 'firebase/firestore';
import { initializeApp } from 'firebase/app';

// Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyBlYi4ZXDUw-6C7AAy4afYP0yt612BW24Q",
  authDomain: "treadtracker-290b8.firebaseapp.com",
  projectId: "treadtracker-290b8",
  storageBucket: "treadtracker-290b8.firebasestorage.app",
  messagingSenderId: "1036884014457",
  appId: "1:1036884014457:web:cb9f86418b8173868baba8"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const FleetSearch = () => {
  const [queryText, setQueryText] = useState('');
  const [results, setResults] = useState([]);

  const handleSearch = async () => {
    try {
      const fleetCollection = collection(db, 'fleets');
      const q = query(
        fleetCollection,
        where('name', '>=', queryText),
        where('name', '<=', queryText + '\uf8ff')
      );
      const querySnapshot = await getDocs(q);

      const searchResults = [];
      querySnapshot.forEach((doc) => {
        searchResults.push({ id: doc.id, ...doc.data() });
      });

      setResults(searchResults);
    } catch (error) {
      console.error('Error searching fleets:', error);
      Alert.alert('Error', 'Failed to search fleets. Please try again.');
    }
  };

  const renderItem = ({ item }) => (
    <View style={styles.resultItem}>
      {item.imageUrl ? (
        <Image source={{ uri: item.imageUrl }} style={styles.fleetImage} />
      ) : (
        <View style={styles.placeholderImage}>
          <Text style={styles.placeholderText}>No Image</Text>
        </View>
      )}
      <Text style={styles.resultText}>{item.name}</Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.searchRow}>
        <TextInput
          style={styles.input}
          placeholder="Search fleet..."
          value={queryText}
          onChangeText={setQueryText}
        />
        <TouchableOpacity style={styles.button} onPress={handleSearch}>
          <Text style={styles.buttonText}>Search</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={results}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        ListEmptyComponent={<Text style={styles.noResults}>No results found</Text>}
        contentContainerStyle={styles.resultsContainer}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 10,
    flex: 1,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  input: {
    flex: 1,
    padding: 10,
    fontSize: 16,
    borderColor: '#ccc',
    borderWidth: 1,
    borderRadius: 4,
  },
  button: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    backgroundColor: '#007BFF',
    borderRadius: 4,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
  },
  resultsContainer: {
    paddingTop: 10,
  },
  resultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f1f1f1',
    borderRadius: 6,
    marginBottom: 10,
    padding: 10,
  },
  fleetImage: {
    width: 60,
    height: 60,
    borderRadius: 6,
    marginRight: 12,
  },
  placeholderImage: {
    width: 60,
    height: 60,
    borderRadius: 6,
    marginRight: 12,
    backgroundColor: '#ccc',
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderText: {
    fontSize: 12,
    color: '#555',
  },
  resultText: {
    fontSize: 16,
    flexShrink: 1,
  },
  noResults: {
    textAlign: 'center',
    marginTop: 20,
    fontSize: 16,
    color: 'gray',
  },
});

export default FleetSearch;
