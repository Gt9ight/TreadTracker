import React, { useEffect, useState } from "react";
import { 
  View, Text, ScrollView, StyleSheet, ActivityIndicator, 
  TouchableOpacity, Modal, Image 
} from "react-native";
import { collection, onSnapshot,doc, updateDoc, getDoc } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { getStorage, ref, getDownloadURL } from "firebase/storage";
import { db } from "../../utilis/Firebase";
import { SafeAreaView } from "react-native-safe-area-context";


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

  useEffect(() => {
    const auth = getAuth();
    const currentUser = auth.currentUser;
    
    if (!currentUser) {
      setLoading(false);
      return;
    }
  
    setUser(currentUser);
  
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
  
      // Toggle completion status of the specific unit
      const updatedUnits = fleetData.units.map((unit, index) =>
        index === unitIndex ? { ...unit, completed: !unit.completed } : unit
      );
  
      // Update Firebase
      await updateDoc(fleetRef, { units: updatedUnits });
  
      // Update local state to trigger re-render
      setFleets((prevFleets) => {
        const newFleets = { ...prevFleets };
  
        Object.keys(newFleets).forEach((date) => {
          newFleets[date] = newFleets[date].map((fleet) => {
            if (fleet.id === fleetId) {
              return { ...fleet, units: updatedUnits }; // Create a new object reference
            }
            return fleet;
          });
        });
  
        return newFleets;
      });
  
      // **Update the modal content immediately**
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
  
  
  
  

  return (
    <SafeAreaView>
      <Text style={styles.title}>Fleet Report</Text>
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
              <Text style={styles.fleetDate}>Fleet Date: {fleetDate}</Text>
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

      {unit.imageUrl && unit.imageUrl.length > 0 && (
        <ScrollView horizontal>
          {unit.imageUrl.map((url, index) => (
            <Image key={index} source={{ uri: url }} style={styles.unitImage} />
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
  
});

export default Report;
