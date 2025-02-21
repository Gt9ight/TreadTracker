import React, { useState, useEffect } from "react";
import { View, Text, TextInput, StyleSheet, TouchableOpacity, Alert, ScrollView, Modal } from "react-native";
import DropDownPicker from "react-native-dropdown-picker";
import { db } from "../../utilis/Firebase";
import { collection, addDoc, query, where, getDocs, updateDoc, doc } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import Specifics from "./Specifics";

const FleetRequest = () => {
  const [openUnitType, setOpenUnitType] = useState(false);
  const [unitType, setUnitType] = useState(null);
  const [unitOptions, setUnitOptions] = useState([
    { label: "Truck", value: "Truck" },
    { label: "Trailer", value: "Trailer" },
  ]);

  const [openUrgency, setOpenUrgency] = useState(false);
  const [urgency, setUrgency] = useState(null);
  const [urgencyOptions, setUrgencyOptions] = useState([
    { label: "Emergency", value: "Emergency" },
    { label: "Urgent", value: "Urgent" },
    { label: "Non-Urgent", value: "Non-Urgent" },
  ]);

  const [unitNumber, setUnitNumber] = useState("");
  const [fleetDate, setFleetDate] = useState(null);
  const [units, setUnits] = useState([]);
  const [unitSpecifics, setUnitSpecifics] = useState({});
  const [selectedUnitIndex, setSelectedUnitIndex] = useState(null);
  const [isSpecificsVisible, setIsSpecificsVisible] = useState(false);
  const [userId, setUserId] = useState(null);

  useEffect(() => {
    const auth = getAuth();
    const currentUser = auth.currentUser;
    if (currentUser) {
      setUserId(currentUser.uid);
    }
  }, []);

  const handleAdd = () => {
    if (!unitType || !unitNumber || !urgency) {
      alert("Please fill out all fields before adding a unit.");
      return;
    }

    const currentDate = new Date().toLocaleDateString();
    if (!fleetDate) setFleetDate(currentDate);

    const newUnit = {
      unitType,
      unitNumber,
      urgency,
      date: currentDate,
    };

    setUnits([...units, newUnit]);
    setUnitType(null);
    setUnitNumber("");
    setUrgency(null);
  };

  const handleDelete = (index) => {
    const updatedUnits = units.filter((_, i) => i !== index);
    setUnits(updatedUnits);
    const updatedSpecifics = { ...unitSpecifics };
    delete updatedSpecifics[index];
    setUnitSpecifics(updatedSpecifics);
  };

  const handleSubmit = async () => {
    if (!userId) {
      Alert.alert("Error", "You must be logged in to submit a fleet.");
      return;
    }

    if (units.length === 0) {
      Alert.alert("No Units", "Please add at least one unit before submitting.");
      return;
    }

    try {
      const fleetRef = collection(db, "fleets");

      // Check if a fleet already exists for the selected date and user
      const q = query(fleetRef, where("fleetDate", "==", fleetDate), where("userId", "==", userId));
      const querySnapshot = await getDocs(q);

      if (!querySnapshot.empty) {
        // Fleet already exists, update the document
        const fleetDoc = querySnapshot.docs[0]; // Get the first matching document
        const existingUnits = fleetDoc.data().units || [];

        await updateDoc(doc(db, "fleets", fleetDoc.id), {
          units: [...existingUnits, ...units.map((unit, index) => ({
            ...unit,
            specifics: unitSpecifics[index] || [],
          }))],
        });

        Alert.alert("Success", "Fleet updated successfully!");
      } else {
        // Fleet does not exist, create a new document
        await addDoc(fleetRef, {
          userId, // Associate fleet with user
          fleetDate,
          units: units.map((unit, index) => ({
            ...unit,
            specifics: unitSpecifics[index] || [],
          })),
          timestamp: new Date(),
        });

        Alert.alert("Success", "Fleet created successfully!");
      }

      // Clear form after submission
      setUnits([]);
      setFleetDate(null);
      setUnitSpecifics({});
    } catch (error) {
      console.error("Error submitting fleet:", error);
      Alert.alert("Error", "Could not submit fleet. Please try again.");
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.fleetTitle}>
        Fleet: {fleetDate && <Text style={styles.fleetDate}>{fleetDate}</Text>}
      </Text>

      <DropDownPicker
        open={openUnitType}
        value={unitType}
        items={unitOptions}
        setOpen={setOpenUnitType}
        setValue={setUnitType}
        setItems={setUnitOptions}
        style={styles.dropdown}
        placeholder="Select Unit Type"
      />

      <TextInput
        style={styles.input}
        placeholder="Enter Unit Number"
        value={unitNumber}
        onChangeText={setUnitNumber}
      />

      <DropDownPicker
        open={openUrgency}
        value={urgency}
        items={urgencyOptions}
        setOpen={setOpenUrgency}
        setValue={setUrgency}
        setItems={setUrgencyOptions}
        style={styles.dropdown}
        placeholder="Urgency"
      />

      <TouchableOpacity style={styles.addButton} onPress={handleAdd}>
        <Text style={styles.addButtonText}>Add Unit</Text>
      </TouchableOpacity>

      <ScrollView contentContainerStyle={styles.unitsContainer}>
        {units.map((unit, index) => (
          <View key={index} style={styles.unitCard}>
            <TouchableOpacity style={styles.deleteButton} onPress={() => handleDelete(index)}>
              <Text style={styles.deleteButtonText}>X</Text>
            </TouchableOpacity>
            <Text style={styles.unitText}>{unit.unitType}# {unit.unitNumber}</Text>
            <Text style={styles.unitText}>Urgency: {unit.urgency}</Text>
          </View>
        ))}
      </ScrollView>

      <TouchableOpacity style={styles.submitButton} onPress={handleSubmit}>
        <Text style={styles.submitButtonText}>Submit Fleet</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: "#f4f4f4",
    alignItems: "center",
  },
  fleetTitle: {
    fontSize: 24,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 10,
  },
  fleetDate: {
    fontSize: 18,
    color: "gray",
  },
  dropdown: {
    width: "100%",
    marginBottom: 15,
  },
  input: {
    height: 40,
    width: "100%",
    borderColor: "gray",
    borderWidth: 1,
    borderRadius: 5,
    paddingHorizontal: 10,
    backgroundColor: "white",
    marginBottom: 15,
  },
  addButton: {
    backgroundColor: "#007bff",
    padding: 12,
    borderRadius: 8,
    alignItems: "center",
    width: "100%",
  },
  addButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
  submitButton: {
    backgroundColor: "green",
    padding: 15,
    borderRadius: 8,
    alignItems: "center",
    width: "100%",
    marginTop: 20,
  },
  submitButtonText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
  },
});

export default FleetRequest;
