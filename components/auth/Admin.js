import React from 'react';
import { Button, View } from 'react-native';
import { auth } from '../../utilis/Firebase';
import { signOut } from "firebase/auth";

const Admin = () => {
  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <Button title="Logout" onPress={() => signOut(auth)} />
    </View>
  );
};

export default Admin;
