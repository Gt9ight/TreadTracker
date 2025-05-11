import React, { useState, useEffect } from 'react';
import { View, TextInput, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { auth, db } from '../../utilis/Firebase';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { setDoc, doc } from 'firebase/firestore';
import { Card } from 'react-native-paper';
import * as Clipboard from 'expo-clipboard';

const SignupScreen = ({ navigation }) => {
  const [step, setStep] = useState(1);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [username, setUsername] = useState('');
  const [recommendedUsername, setRecommendedUsername] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [city, setCity] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (firstName && lastName && companyName && city) {
      setRecommendedUsername(`${firstName}-${lastName}-${companyName}-${city}`.toLowerCase().replace(/\s+/g, ''));
    } else {
      setRecommendedUsername('');
    }
  }, [firstName, lastName, companyName, city]);

  const handleNext = () => {
    setStep(step + 1);
  };

  const handlePrevious = () => {
    setStep(step - 1);
  };

  const handleSignup = async () => {
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      await setDoc(doc(db, 'users', user.uid), {
        firstName,
        lastName,
        username: username || recommendedUsername,
        recommendedUsername,
        email,
        uid: user.uid,
        companyName,
        city,
      });
      // Optionally navigate to the next screen after successful signup
      // navigation.navigate('Main');
    } catch (error) {
      setError(error.message);
    }
  };

  const handleRecommendedUsernamePress = async () => {
    if (recommendedUsername) {
      setUsername(recommendedUsername);
      try {
        await Clipboard.setStringAsync(recommendedUsername);
        // Optionally provide visual feedback that it's copied
        console.log('Recommended username copied to clipboard!');
      } catch (error) {
        console.error('Error copying to clipboard:', error);
      }
    }
  };

  const renderStepOne = () => (
    <Card style={styles.card}>
      <Card.Title title="Personal Details" />
      <Card.Content>
        <TextInput
          style={styles.input}
          placeholder="First Name"
          value={firstName}
          onChangeText={setFirstName}
        />
        <TextInput
          style={styles.input}
          placeholder="Last Name"
          value={lastName}
          onChangeText={setLastName}
        />
      </Card.Content>
      <Card.Actions style={styles.cardActions}>
        <TouchableOpacity style={styles.button} onPress={handleNext}>
          <Text style={styles.buttonText}>Next</Text>
        </TouchableOpacity>
      </Card.Actions>
    </Card>
  );

  const renderStepTwo = () => (
    <Card style={styles.card}>
      <Card.Title title="Company Information" />
      <Card.Content>
        <TextInput
          style={styles.input}
          placeholder="Company Name"
          value={companyName}
          onChangeText={setCompanyName}
        />
        <TextInput
          style={styles.input}
          placeholder="City"
          value={city}
          onChangeText={setCity}
        />
      </Card.Content>
      <Card.Actions style={styles.cardActions}>
        <TouchableOpacity style={styles.button} onPress={handlePrevious}>
          <Text style={styles.buttonText}>Previous</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.button} onPress={handleNext}>
          <Text style={styles.buttonText}>Next</Text>
        </TouchableOpacity>
      </Card.Actions>
    </Card>
  );

  const renderStepThree = () => (
    <Card style={styles.card}>
      <Card.Title title="Choose Your Username" />
      <Card.Content>
        {recommendedUsername ? (
          <TouchableOpacity onPress={handleRecommendedUsernamePress}>
            <Text style={styles.recommendText}>
              Recommended Username: <Text style={styles.recommendValue}>{recommendedUsername}</Text>
              <Text style={styles.clickableIndicator}> (Click to use)</Text>
            </Text>
          </TouchableOpacity>
        ) : null}
        <TextInput
          style={styles.input}
          placeholder="Your Chosen Username (Optional)"
          value={username}
          onChangeText={setUsername}
        />
        <Text style={styles.usernameNote}>
          Leave blank to use the recommended username.
        </Text>
      </Card.Content>
      <Card.Actions style={styles.cardActions}>
        <TouchableOpacity style={styles.button} onPress={handlePrevious}>
          <Text style={styles.buttonText}>Previous</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.button} onPress={handleNext}>
          <Text style={styles.buttonText}>Next</Text>
        </TouchableOpacity>
      </Card.Actions>
    </Card>
  );

  const renderStepFour = () => (
    <Card style={styles.card}>
      <Card.Title title="Account Credentials" />
      <Card.Content>
        <TextInput
          style={styles.input}
          placeholder="Email"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
        />
        <TextInput
          style={styles.input}
          placeholder="Password"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />
      </Card.Content>
      <Card.Actions style={styles.cardActions}>
        <TouchableOpacity style={styles.button} onPress={handlePrevious}>
          <Text style={styles.buttonText}>Previous</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.button} onPress={handleSignup}>
          <Text style={styles.buttonText}>Signup</Text>
        </TouchableOpacity>
      </Card.Actions>
    </Card>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Signup</Text>
      {error ? <Text style={styles.error}>{error}</Text> : null}

      {step === 1 && renderStepOne()}
      {step === 2 && renderStepTwo()}
      {step === 3 && renderStepThree()}
      {step === 4 && renderStepFour()}

      {step > 0 && step < 4 && (
        <View style={styles.progress}>
          <Text>{step} of 4</Text>
        </View>
      )}
      {step === 4 && (
        <View style={styles.progress}>
          <Text>4 of 4</Text>
        </View>
      )}

      <View style={styles.loginContainer}>
        <Text>Already have an account? </Text>
        <TouchableOpacity onPress={() => navigation.navigate('Login')}>
          <Text style={styles.loginLink}>Go to Login</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
    backgroundColor: '#f4f4f4',
  },
  title: {
    fontSize: 30,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
  },
  card: {
    marginBottom: 20,
    elevation: 3,
  },
  cardActions: {
    justifyContent: 'flex-end',
    padding: 16,
  },
  input: {
    height: 50,
    borderColor: '#ddd',
    borderWidth: 1,
    borderRadius: 5,
    paddingHorizontal: 10,
    marginBottom: 15,
    backgroundColor: '#fff',
  },
  button: {
    backgroundColor: '#28a745',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 5,
    marginLeft: 10,
  },
  buttonText: {
    color: '#fff',
    textAlign: 'center',
    fontSize: 18,
  },
  error: {
    color: 'red',
    marginBottom: 10,
    textAlign: 'center',
  },
  loginContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 10,
  },
  loginLink: {
    color: '#007BFF',
    fontWeight: 'bold',
  },
  recommendText: {
    marginBottom: 10,
    fontSize: 14,
  },
  recommendValue: {
    fontWeight: 'bold',
    color: '#333',
  },
  usernameNote: {
    fontSize: 12,
    color: 'gray',
    marginTop: 5,
  },
  progress: {
    alignItems: 'center',
    marginBottom: 10,
  },
  clickableIndicator: {
    color: '#007BFF',
    marginLeft: 5,
    fontStyle: 'italic',
  },
});

export default SignupScreen;