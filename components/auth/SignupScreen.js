import React, { useState } from 'react';
import { View, TextInput, Button, Text } from 'react-native';
import { auth } from '../../utilis/Firebase';
import { createUserWithEmailAndPassword } from "firebase/auth";

const SignupScreen = ({ navigation }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSignup = async () => {
    try {
      await createUserWithEmailAndPassword(auth, email, password);
    } catch (error) {
      setError(error.message);
    }
  };

  return (
    <View>
      <Text>Signup</Text>
      {error ? <Text style={{ color: 'red' }}>{error}</Text> : null}
      <TextInput placeholder="Email" value={email} onChangeText={setEmail} />
      <TextInput placeholder="Password" value={password} onChangeText={setPassword} secureTextEntry />
      <Button title="Signup" onPress={handleSignup} />
      <Button title="Go to Login" onPress={() => navigation.navigate('Login')} />
    </View>
  );
};

export default SignupScreen;
