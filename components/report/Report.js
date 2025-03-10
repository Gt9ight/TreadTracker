import React, { useEffect, useState } from "react";
import { 
  View, Text, ScrollView, StyleSheet, ActivityIndicator, 
  TouchableOpacity, Modal, Image, TextInput, Clipboard 
} from "react-native";
import { collection, onSnapshot,doc, updateDoc, getDoc, deleteDoc, getDocs } from "firebase/firestore";
import { getAuth, EmailAuthProvider, reauthenticateWithCredential } from "firebase/auth";
import { getStorage, ref, getDownloadURL, deleteObject } from "firebase/storage";
import { db,storage } from "../../utilis/Firebase";
import { SafeAreaView } from "react-native-safe-area-context";
import ImageViewerModal from "../imageModal/ImageViewerModal";


const fetchImageUrls = async (imagePaths) => {
  try {
    const storage = getStorage();
    if (Array.isArray(imagePaths)) {
      return await Promise.all(imagePaths.map(async (path) => {
        const imageRef = ref(storage, path);
        return await getDownloadURL(imageRef);
      }));
    } else {
      // Handle the case where only one image path is stored as a string
      const imageRef = ref(storage, imagePaths);
      return [await getDownloadURL(imageRef)];
    }
  } catch (error) {
    console.error("Error fetching image URLs:", error);
    return [];
  }
};


const Report = () => {
  const [fleets, setFleets] = useState({});
  const [loading, setLoading] = useState(true);
  const [selectedFleet, setSelectedFleet] = useState(null);
  const [user, setUser] = useState(null);
  const [userName, setUserName] = useState('');
  const [password, setPassword] = useState("");
  const [isPasswordModalVisible, setIsPasswordModalVisible] = useState(false);
  const [fleetToDelete, setFleetToDelete] = useState(null);
  const [isImageModalVisible, setIsImageModalVisible] = useState(false);
  const [selectedImages, setSelectedImages] = useState([]);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);


  useEffect(() => {
    const auth = getAuth();
    const currentUser = auth.currentUser;
    
    if (currentUser) {
      setUser(currentUser.uid);
      
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
  
    const unsubscribe = onSnapshot(collection(db, "fleets"), async (snapshot) => {
      const fleetData = await Promise.all(snapshot.docs.map(async (doc) => {
        const data = doc.data();
        if (data.units) {
          const updatedUnits = await Promise.all(
            data.units.map(async (unit) => {
              if (unit.imageUrl) {
                unit.imageUrl = await fetchImageUrls(unit.imageUrl);
              }
              return { ...unit }; // Ensure new reference to trigger re-render
            })
          );
          data.units = updatedUnits;
        }
        return { id: doc.id, ...data };
      }));
  
      setFleets(groupByDate(fleetData.filter((fleet) => fleet.userId === currentUser.uid)));
      setLoading(false);
    });
  
    return () => unsubscribe();
  }, []);
  

  const groupByDate = (fleets) => {
    return fleets.reduce((acc, fleet) => {
      const { fleetDate } = fleet;
      if (!acc[fleetDate]) {
        acc[fleetDate] = [];
      }
      acc[fleetDate].push(fleet);
      return acc;
    }, {});
  };

  const handleFleetPress = (fleet) => {
    setSelectedFleet(fleet);
  };

  const handleCloseModal = () => {
    setSelectedFleet(null);
  };

  const calculateProgress = (units) => {
    const completedUnits = units.filter((unit) => unit.completed).length;
    const totalUnits = units.length;
    return totalUnits > 0 ? (completedUnits / totalUnits) * 100 : 0;
  };

  const getUnitCardStyle = (unit) => {
    return unit.completed ? styles.completedUnitCard : styles.unitCard;
  };

  if (loading) {
    return <ActivityIndicator size="large" color="#007bff" style={styles.loader} />;
  }

  if (!user) {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={styles.noData}>Please log in to view your fleet data.</Text>
      </SafeAreaView>
    );
  }

  const markUnitComplete = async (fleetId, unitIndex) => {
    try {
      const fleetRef = doc(db, "fleets", fleetId);
      const fleetSnapshot = await getDoc(fleetRef);
  
      if (!fleetSnapshot.exists()) {
        console.error("Fleet not found!");
        return;
      }
  
      const fleetData = fleetSnapshot.data();
      const currentUser = getAuth().currentUser; // Get logged-in user
  
      if (!currentUser) {
        console.error("No authenticated user found!");
        return;
      }
  
      // Toggle completion status of the specific unit
      const updatedUnits = fleetData.units.map((unit, index) =>
        index === unitIndex
          ? {
              ...unit,
              completed: !unit.completed,
              completedAt: !unit.completed ? new Date().toISOString() : null, // Add timestamp if completed
              completedBy: !unit.completed ? userName : null, // Store email of user who completed
            }
          : unit
      );
  
      // Update Firebase
      await updateDoc(fleetRef, { units: updatedUnits });
  
      // Update local state
      setFleets((prevFleets) => {
        const newFleets = { ...prevFleets };
  
        Object.keys(newFleets).forEach((date) => {
          newFleets[date] = newFleets[date].map((fleet) => {
            if (fleet.id === fleetId) {
              return { ...fleet, units: updatedUnits };
            }
            return fleet;
          });
        });
  
        return newFleets;
      });
  
      // Update modal content
      if (selectedFleet) {
        setSelectedFleet((prevSelectedFleet) =>
          prevSelectedFleet.map((fleet) =>
            fleet.id === fleetId ? { ...fleet, units: updatedUnits } : fleet
          )
        );
      }
    } catch (error) {
      console.error("Error updating unit:", error);
    }
  };
  
  
  


  const deleteFleet = async () => {
    try {
      const auth = getAuth();
      const user = auth.currentUser;
  
      if (!user || !fleetToDelete) return;
  
      // Re-authenticate the user
      const credential = EmailAuthProvider.credential(user.email, password);
      await reauthenticateWithCredential(user, credential);
  
      // Proceed with fleet deletion
      if (fleetToDelete.imageUrls && Array.isArray(fleetToDelete.imageUrls)) {
        await Promise.all(fleetToDelete.imageUrls.map(async (imageUrl) => {
          try {
            const path = decodeURIComponent(imageUrl.split("/o/")[1].split("?")[0]);
            const imageRef = ref(storage, path);
            await deleteObject(imageRef);
          } catch (err) {
            console.error(`Error deleting image ${imageUrl}:`, err);
          }
        }));
      }
  
      await deleteDoc(doc(db, "fleets", fleetToDelete.id));
  
      // Update local state
      setFleets((prevFleets) => {
        const newFleets = { ...prevFleets };
        Object.keys(newFleets).forEach((date) => {
          newFleets[date] = newFleets[date].filter((fleet) => fleet.id !== fleetToDelete.id);
        });
        return newFleets;
      });
  
      // Reset states
      setIsPasswordModalVisible(false);
      setFleetToDelete(null);
      setPassword("");
  
    } catch (error) {
      console.error("Error deleting fleet:", error);
      alert("Incorrect password. Please try again.");
    }
  };

  const copyToClipboard = (uid) => {
    Clipboard.setString(uid);  // Copy the UID to clipboard
    alert("Fleet UID copied to clipboard!");  // Optional: Provide feedback to the user
  };
  

  return (
    <SafeAreaView>
      <Text style={styles.title}>Fleet Report</Text>
      <Text style={styles.userName}>Welcome, {userName}</Text>
      <ScrollView contentContainerStyle={styles.container}>
        {Object.keys(fleets).length === 0 ? (
          <Text style={styles.noData}>No fleets available.</Text>
        ) : (
          Object.keys(fleets).map((fleetDate) => (
<TouchableOpacity 
  key={fleetDate} 
  onPress={() => handleFleetPress(fleets[fleetDate])} 
  style={styles.fleetCard}
>
  <TouchableOpacity 
    onPress={() => {
      setFleetToDelete({
        id: fleets[fleetDate][0].id, 
        imageUrls: fleets[fleetDate].flatMap(fleet => fleet.units?.flatMap(unit => unit.imageUrl || []))
      });
      setIsPasswordModalVisible(true);
    }} 
    style={styles.deleteButton}
  >
    <Text style={styles.deleteButtonText}>Delete Fleet</Text>
  </TouchableOpacity>

  <Text style={styles.fleetDate}>Fleet Date: {fleetDate}</Text>

  {/* Display the fleet UID */}
  <Text style={styles.fleetUID}>Fleet UID: {fleets[fleetDate][0].id}</Text>

{/* Add a button to copy the UID */}
<TouchableOpacity 
  onPress={() => copyToClipboard(fleets[fleetDate][0].id)} 
  style={styles.copyButton}
>
  <Text style={styles.copyButtonText}>Copy UID</Text>
</TouchableOpacity>

  <Text style={styles.unitCount}>
    Units: {fleets[fleetDate].reduce((sum, fleet) => sum + (fleet.units?.length || 0), 0)}
  </Text>

  {/* Progress Bar */}
  {fleets[fleetDate].map((fleet) => {
    const progress = calculateProgress(fleet.units);
    return (
      <View key={fleet.id} style={styles.progressBarContainer}>
        <Text style={styles.progressText}>Progress: {Math.round(progress)}%</Text>
        <View style={styles.progressBarBackground}>
          <View style={[styles.progressBar, { width: `${progress}%` }]} />
        </View>
      </View>
    );
  })}
</TouchableOpacity>

          ))
        )}

<Modal visible={isPasswordModalVisible} animationType="slide" transparent={true}>
  <View style={styles.modalOverlay}>
    <View style={styles.modalContent}>
      <Text style={styles.modalTitle}>Enter Password to Delete</Text>
      <TextInput 
        style={styles.passwordInput} 
        secureTextEntry 
        placeholder="Enter your password" 
        value={password} 
        onChangeText={setPassword} 
      />
      <View style={styles.modalButtons}>
        <TouchableOpacity onPress={deleteFleet} style={styles.confirmButton}>
          <Text style={styles.confirmButtonText}>Confirm</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => setIsPasswordModalVisible(false)} style={styles.cancelButton}>
          <Text style={styles.cancelButtonText}>Cancel</Text>
        </TouchableOpacity>
      </View>
    </View>
  </View>
</Modal>

        {/* Fleet Details Modal */}
        <Modal visible={selectedFleet !== null} animationType="slide" onRequestClose={handleCloseModal}>
          {selectedFleet && (
            <SafeAreaView style={styles.modalContainer}>
              <Text style={styles.modalTitle}>Fleet Details</Text>
              <ScrollView>
              {selectedFleet.map((fleet) => 
  fleet.units.map((unit, unitIndex) => (
    <View key={unitIndex} style={getUnitCardStyle(unit)}>
      <Text style={styles.unitText}>{unit.unitType}#: {unit.unitNumber}</Text>
      <Text style={styles.unitText}>Urgency: {unit.urgency}</Text>
      {unit.specifics?.length > 0 && (
                      <View style={styles.specificsContainer}>
                        <Text style={styles.specificsTitle}>Specifics:</Text>
                        {unit.specifics.map((specific, i) => (
                          <Text key={i} style={styles.specificText}>
                            {specific.position} - {specific.ServiceType} - {specific.treadDepth} - {specific.selectedTire}
                          </Text>
                        ))}
                      </View>
                    )}

{unit.imageUrl && unit.imageUrl.length > 0 && (
  <ScrollView horizontal>
    {unit.imageUrl.map((url, index) => (
      <TouchableOpacity 
        key={index} 
        onPress={() => {
          setSelectedImages(unit.imageUrl);
          setSelectedImageIndex(index);
          setIsImageModalVisible(true);
        }}
      >
        <Image source={{ uri: url }} style={styles.unitImage} />
      </TouchableOpacity>
    ))}
  </ScrollView>
)}


      {/* Fix: Ensure fleet.id is passed correctly */}
      <TouchableOpacity 
  onPress={() => markUnitComplete(fleet.id, unitIndex)} 
  style={styles.completeButton}
>
  <Text style={styles.completeButtonText}>
    {unit.completed ? "Completed" : "Mark Complete"}
  </Text>
</TouchableOpacity>

<Text style={styles.unitText}>
  {unit.completed ? `Completed by: ${unit.completedBy || "Unknown"}` : ""}
</Text>
<Text style={styles.unitText}>
  {unit.completed ? `Completed at: ${new Date(unit.completedAt).toLocaleString()}` : ""}
</Text>
<ImageViewerModal 
  visible={isImageModalVisible} 
  images={selectedImages} 
  selectedIndex={selectedImageIndex}
  onClose={() => setIsImageModalVisible(false)} 
/>

    </View>
    
  ))
)}

              </ScrollView>
              <TouchableOpacity onPress={handleCloseModal} style={styles.closeButton}>
                <Text style={styles.closeButtonText}>Close</Text>
              </TouchableOpacity>
            </SafeAreaView>
          )}
        </Modal>
      </ScrollView>


    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 20,
    backgroundColor: "#f4f4f4",
    alignItems: "center",
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 15,
    textAlign: "center",
  },
  fleetCard: {
    width: "100%",
    backgroundColor: "#fff",
    padding: 15,
    borderRadius: 8,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: "#ddd",
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  fleetDate: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 10,
  },
  unitCount: {
    fontSize: 16,
    marginBottom: 10,
  },
  loader: {
    marginTop: 50,
  },
  noData: {
    fontSize: 18,
    color: "gray",
  },
  modalContainer: {
    flex: 1,
    justifyContent: "flex-start",
    padding: 20,
    backgroundColor: "#fff",
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: "bold",
    marginBottom: 15,
  },
  unitCard: {
    padding: 10,
    backgroundColor: "#f9f9f9",
    borderRadius: 5,
    marginBottom: 10,
  },
  completedUnitCard: {
    padding: 10,
    backgroundColor: "#72bf6a", // Green background for completed units
    borderRadius: 5,
    marginBottom: 10,
    color: 'white'
  },
  unitText: {
    fontSize: 16,
    marginBottom: 5,
  },
  unitImage: {
    width: 120,
    height: 90,
    borderRadius: 8,
    marginTop: 10,
    marginRight: 10,
  },
  specificsContainer: {
    marginTop: 5,
  },
  specificsTitle: {
    fontWeight: "bold",
  },
  specificText: {
    fontSize: 14,
  },
  closeButton: {
    backgroundColor: "#007bff",
    padding: 12,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 20,
  },
  closeButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
  progressBarContainer: {
    marginTop: 10,
    width: "100%",
  },
  progressText: {
    fontSize: 16,
    marginBottom: 5,
    color: "#007bff",
  },
  progressBarBackground: {
    width: "100%",
    height: 10,
    backgroundColor: "#ddd",
    borderRadius: 5,
  },
  progressBar: {
    height: "100%",
    backgroundColor: "#4cbb17",
    borderRadius: 5,
  },
  completeButton: {
    backgroundColor: "#4cbb17",
    padding: 10,
    borderRadius: 5,
    marginTop: 10,
    alignItems: "center",
  },
  completeButtonText: {
    color: "#fff",
    fontWeight: "bold",
  },
  deleteButton: {
    backgroundColor: "red",
    padding: 12,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 20,
  },
  deleteButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
  modalOverlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  modalContent: {
    width: "80%",
    backgroundColor: "#fff",
    padding: 20,
    borderRadius: 10,
    alignItems: "center",
  },
  passwordInput: {
    width: "100%",
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 5,
    padding: 10,
    marginTop: 10,
  },
  modalButtons: {
    flexDirection: "row",
    marginTop: 15,
  },
  confirmButton: {
    backgroundColor: "red",
    padding: 10,
    borderRadius: 5,
    marginRight: 10,
  },
  confirmButtonText: {
    color: "#fff",
    fontWeight: "bold",
  },
  cancelButton: {
    backgroundColor: "gray",
    padding: 10,
    borderRadius: 5,
  },
  cancelButtonText: {
    color: "#fff",
    fontWeight: "bold",
  },
  copyButton: {
    backgroundColor: "#007bff",
    padding: 10,
    borderRadius: 5,
    marginTop: 10,
    alignItems: "center",
  },
  copyButtonText: {
    color: "#fff",
    fontWeight: "bold",
  },
  fleetUID: {
    fontSize: 14,
    color: "gray",
    marginBottom: 5,
  },
  
});

export default Report;
