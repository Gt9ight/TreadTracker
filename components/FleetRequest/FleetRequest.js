import React, { useState } from "react";
import { View, Text, TextInput, StyleSheet, TouchableOpacity, Alert, ScrollView, Modal} from "react-native";
import DropDownPicker from "react-native-dropdown-picker";
import { db } from "../../utilis/Firebase";
import { collection, addDoc } from "firebase/firestore";
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
  const [unitSpecifics, setUnitSpecifics] = useState({}); // Store specifics per unit
  const [selectedUnitIndex, setSelectedUnitIndex] = useState(null);
  const [isSpecificsVisible, setIsSpecificsVisible] = useState(false);

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
    if (units.length === 0) {
      Alert.alert("No Units", "Please add at least one unit before submitting.");
      return;
    }

    try {
      await addDoc(collection(db, "fleets"), {
        fleetDate,
        units: units.map((unit, index) => ({
          ...unit,
          specifics: unitSpecifics[index] || [],
        })),
        timestamp: new Date(),
      });
      Alert.alert("Success", "Fleet submitted successfully!");
      setUnits([]);
      setFleetDate(null);
      setUnitSpecifics({});
    } catch (error) {
      console.error("Error submitting fleet:", error);
      Alert.alert("Error", "Could not submit fleet. Please try again.");
    }
  };


const handleDoneSpecifics = (specifics) => {
  if (selectedUnitIndex !== null) {
    setUnitSpecifics((prev) => ({
      ...prev,
      [selectedUnitIndex]: [...(prev[selectedUnitIndex] || []), ...specifics],
    }));
  }
  setIsSpecificsVisible(false);
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

            {unitSpecifics[index] && (
              <View style={{ marginTop: 10 }}>
                <Text style={styles.unitText}>Specifics:</Text>
                {unitSpecifics[index].map((specific, i) => (
                  <Text key={i} style={styles.unitText}>
                    {specific.position} - {specific.ServiceType} - {specific.treadDepth} - {specific.selectedTire}
                  </Text>
                ))}
              </View>
            )}

<View style={styles.cardBottomContainer}>
              <TouchableOpacity style={styles.addSpecificsButton} >
                <Text style={styles.addSpecificsText}>Upload Image</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.addSpecificsButton}
                onPress={() => setIsSpecificsVisible(true)}
              >
                <Text style={styles.addSpecificsText}>Add Specifics</Text>
              </TouchableOpacity>
            </View>
          
          </View>
        ))}
      </ScrollView>

      <TouchableOpacity style={styles.submitButton} onPress={handleSubmit}>
        <Text style={styles.submitButtonText}>Submit Fleet</Text>
      </TouchableOpacity>

      <Modal
        visible={isSpecificsVisible}
        animationType="slide"
        onRequestClose={() => setIsSpecificsVisible(false)}
      >
        <View style={styles.modalContainer}>
          <Specifics onDone={handleDoneSpecifics} />
        </View>
      </Modal>
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
  unitsContainer: {
    width: "100%",
    marginTop: 20,
  },
  unitCard: {
    width: 350,
    backgroundColor: "#fff",
    padding: 15,
    borderRadius: 8,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#ddd",
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    position: "relative",
  },
  unitText: {
    fontSize: 16,
  },
  deleteButton: {
    position: "absolute",
    top: 5,
    right: 5,
    backgroundColor: "red",
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  deleteButtonText: {
    color: "#fff",
    fontSize: 14,
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
  cardBottomContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 10,
  },
  addSpecificsButton: {
    backgroundColor: "#007bff",
    padding: 8,
    borderRadius: 5,
    flex: 1,
    alignItems: "center",
    marginLeft: 5,
  },
  addSpecificsText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "bold",
  },
  image: {
    width: 100,
    height: 100,
    marginTop: 10,
    borderRadius: 8,
  },
  modalContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "white",
    padding: 20,
  },
  closeButton: {
    backgroundColor: "red",
    padding: 10,
    borderRadius: 5,
    marginTop: 20,
  },
  closeButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
});

export default FleetRequest;