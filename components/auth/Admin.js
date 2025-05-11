import React, { useState, useEffect } from 'react';
import { Button, View, Text, Alert } from 'react-native';
import * as Clipboard from 'expo-clipboard'; // If using Expo
import { auth, db } from '../../utilis/Firebase';
import { signOut } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';

const Admin = () => {
  const [username, setUsername] = useState(null);

  useEffect(() => {
    const fetchUsername = async () => {
      const user = auth.currentUser;
      if (user) {
        const userDocRef = doc(db, 'users', user.uid);
        try {
          const docSnap = await getDoc(userDocRef);
          if (docSnap.exists() && docSnap.data().username) {
            setUsername(docSnap.data().username);
          } else {
            setUsername('Username not found');
          }
        } catch (error) {
          console.error('Error fetching username:', error);
          setUsername('Error fetching username');
        }
      }
    };

    fetchUsername();
  }, []);

  const copyToClipboard = async () => {
    if (username && username !== 'Username not found' && username !== 'Error fetching username') {
      await Clipboard.setStringAsync(username);
      Alert.alert('Copied!', 'Username has been copied to clipboard.');
    } else {
      Alert.alert('Oops!', 'No username to copy.');
    }
  };

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      {username ? (
        <>
          <Text style={{ marginBottom: 10 }}>Your Username:</Text>
          <Text selectable style={{ marginBottom: 20 }}>{username}</Text>
          <Button title="Copy Username" onPress={copyToClipboard} />
        </>
      ) : (
        <Text>Loading username...</Text>
      )}
      <Button title="Logout" onPress={() => signOut(auth)} />
    </View>
  );
};

export default Admin;