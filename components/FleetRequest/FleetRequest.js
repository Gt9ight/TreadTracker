import React, { useState, useEffect } from "react";
import { View, Text, TextInput, StyleSheet, TouchableOpacity, Alert, ScrollView, Modal, Image } from "react-native";
import DropDownPicker from "react-native-dropdown-picker";
import { db, storage } from "../../utilis/Firebase";
import { collection, addDoc, query, where, getDocs, updateDoc, doc, getDoc } from "firebase/firestore";
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { getAuth } from "firebase/auth";
import * as ImagePicker from "expo-image-picker";
import Specifics from "./Specifics";

const FleetRequest = () => {
  const [openUnitType, setOpenUnitType] = useState(false);
  const [unitType, setUnitType] = useState(null);
  const [unitImages, setUnitImages] = useState({});
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
  const [userName, setUserName] = useState('');

  useEffect(() => {
    const auth = getAuth();
    const currentUser = auth.currentUser;
    if (currentUser) {
      setUserId(currentUser.uid);
      
      // Fetch user details from Firestore
      const getUserDetails = async () => {
        const userRef = doc(db, 'users', currentUser.uid);
        const userDoc = await getDoc(userRef);
        if (userDoc.exists()) {
          const userData = userDoc.data();
          setUserName(`${userData.firstName} ${userData.lastName}`);
        }
      };
      
      getUserDetails();
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

      const q = query(fleetRef, where("fleetDate", "==", fleetDate), where("userId", "==", userId));
      const querySnapshot = await getDocs(q);

      if (!querySnapshot.empty) {
        const fleetDoc = querySnapshot.docs[0];
        const existingUnits = fleetDoc.data().units || [];

        await updateDoc(doc(db, "fleets", fleetDoc.id), {
          units: [...existingUnits, ...units.map((unit, index) => ({
            ...unit,
            specifics: unitSpecifics[index] || [],
            imageUrl: unitImages[index] || null,
          }))],
        });

        Alert.alert("Success", "Fleet updated successfully!");
      } else {
        await addDoc(fleetRef, {
          userId,
          fleetDate,
          units: units.map((unit, index) => ({
            ...unit,
            specifics: unitSpecifics[index] || [],
            imageUrl: unitImages[index] || null,
          })),
          timestamp: new Date(),
        });

        Alert.alert("Success", "Fleet created successfully!");
      }

      setUnits([]);
      setFleetDate(null);
      setUnitSpecifics({});
      setUnitImages({});
    } catch (error) {
      console.error("Error submitting fleet:", error);
      Alert.alert("Error", "Could not submit fleet. Please try again.");
    }
  };

  const handleDeleteImage = (unitIndex, imgIndex) => {
    const updatedImages = { ...unitImages };
    updatedImages[unitIndex].splice(imgIndex, 1); // Remove image at imgIndex
    setUnitImages(updatedImages);
  };
  

  const handleDoneSpecifics = (specifics) => {
    if (selectedUnitIndex !== null) {
      setUnitSpecifics((prev) => ({
        ...prev,
        [selectedUnitIndex]: specifics, // Replace existing instead of appending
      }));
    }
    setIsSpecificsVisible(false);
  };


  const pickImage = async (index) => {
    // Request permissions for camera and media library
    const cameraPermission = await ImagePicker.requestCameraPermissionsAsync();
    const libraryPermission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  
    // Check if permissions are granted
    if (cameraPermission.granted && libraryPermission.granted) {
      // Show an alert to ask the user whether they want to use the camera or the photo library
      const result = await Alert.alert(
        "Choose Image Source",
        "Would you like to take a photo or select one from the library?",
        [
          {
            text: "Use Camera",
            onPress: async () => {
              let cameraResult = await ImagePicker.launchCameraAsync({
                allowsEditing: true,
                aspect: [4, 3],
                quality: 1,
              });
              if (!cameraResult.canceled) {
                uploadImage(cameraResult.assets[0].uri, index);
              }
            },
          },
          {
            text: "Choose from Library",
            onPress: async () => {
              let libraryResult = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                allowsEditing: true,
                aspect: [4, 3],
                quality: 1,
              });
              if (!libraryResult.canceled) {
                uploadImage(libraryResult.assets[0].uri, index);
              }
            },
          },
          {
            text: "Cancel",
            style: "cancel",
          },
        ]
      );
    } else {
      // If permission is denied, show an alert to inform the user
      Alert.alert(
        "Permissions Required",
        "Camera and/or media library permissions are required to use this feature.",
        [{ text: "OK" }]
      );
    }
  };

  // Function to upload image to Firebase Storage
  const uploadImage = async (imageUri, index) => {
    try {
      const response = await fetch(imageUri);
      const blob = await response.blob();
      const imageRef = ref(storage, `unitImages/${Date.now()}_${userId}.jpg`);
      const uploadTask = uploadBytesResumable(imageRef, blob);
  
      uploadTask.on(
        "state_changed",
        (snapshot) => {
          console.log(`Uploading: ${(snapshot.bytesTransferred / snapshot.totalBytes) * 100}%`);
        },
        (error) => {
          console.error("Upload error: ", error);
          Alert.alert("Upload Error", "Failed to upload image.");
        },
        async () => {
          const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
  
          // Update the unitImages state to append the new image to the existing ones
          setUnitImages((prev) => {
            const newImages = { ...prev };
            if (newImages[index]) {
              // If the unit already has images, add the new one to the array
              newImages[index].push(downloadURL);
            } else {
              // If no images exist, create an array with the new image
              newImages[index] = [downloadURL];
            }
            return newImages;
          });
        }
      );
    } catch (error) {
      console.error("Error uploading image: ", error);
      Alert.alert("Error", "Could not upload image. Please try again.");
    }
  };
  return (
    <View style={styles.container}>
      <Text style={styles.userName}>Welcome, {userName}</Text>
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
<ScrollView
  horizontal
  contentContainerStyle={styles.imagesContainer}
  showsHorizontalScrollIndicator={false}
>
  {unitImages[index] && unitImages[index].map((imageUri, imgIndex) => (
    <View key={imgIndex} style={styles.imageContainer}>
      <Image source={{ uri: imageUri }} style={styles.unitImage} />
      <TouchableOpacity
        style={styles.deleteImageButton}
        onPress={() => handleDeleteImage(index, imgIndex)}
      >
        <Text style={styles.deleteImageText}>X</Text>
      </TouchableOpacity>
    </View>
  ))}
</ScrollView>



<View style={styles.cardBottomContainer}>
              <TouchableOpacity style={styles.addSpecificsButton}  onPress={() => pickImage(index)} >
                <Text style={styles.addSpecificsText}>Upload Image</Text>
              </TouchableOpacity>
              <TouchableOpacity
  style={styles.addSpecificsButton}
  onPress={() => {
    setSelectedUnitIndex(index); // Track which unit is being edited
    setIsSpecificsVisible(true);
  }}
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
    marginBottom: 17,
    marginTop: 10,
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
  unitImage: {
    width: 120, // Adjust this to the size you want
    height: 120, // Adjust the height as needed
    borderRadius: 8,
    marginRight: 10, // Space between images
  },
  imagesContainer: {
    flexDirection: "row", // Arrange images horizontally
    paddingVertical: 10, // Optional, adjust for spacing
  },
  imageContainer: {
    position: "relative", // Position the delete button on top of the image
  },
  deleteImageButton: {
    position: "absolute",
    top: 5,
    right: 5,
    backgroundColor: "rgba(0, 0, 0, 0.5)", // Semi-transparent background for the button
    borderRadius: 12,
    width: 24,
    height: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  deleteImageText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
  submitButtonText: {
    color: "#fff",
    fontSize: 18,
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
  modalContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "white",
    padding: 20,
  },
  userName: {
    fontSize: 18,
    marginBottom: 20,
    color: 'gray',
  },

});

export default FleetRequest;
