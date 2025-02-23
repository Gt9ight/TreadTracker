import React, { useEffect, useState } from "react";
import { 
  View, Text, ScrollView, StyleSheet, ActivityIndicator, 
  TouchableOpacity, Modal, Image 
} from "react-native";
import { collection, onSnapshot } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { getStorage, ref, getDownloadURL } from "firebase/storage";
import { db } from "../../utilis/Firebase";
import { SafeAreaView } from "react-native-safe-area-context";

const fetchImageUrl = async (imagePath) => {
  try {
    const storage = getStorage();
    const imageRef = ref(storage, imagePath);
    return await getDownloadURL(imageRef);
  } catch (error) {
    console.error("Error fetching image URL:", error);
    return null;
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
                unit.imageUrl = await fetchImageUrl(unit.imageUrl);
              }
              return unit;
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

  return (
    <SafeAreaView>
      <Text style={styles.title}>Fleet List</Text>
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
                {selectedFleet.flatMap((fleet) => fleet.units).map((unit, unitIndex) => (
                  <View key={unitIndex} style={getUnitCardStyle(unit)}>
                    <Text style={styles.unitText}>{unit.unitType}#:{unit.unitNumber}</Text>
                    <Text style={styles.unitText}>Urgency: {unit.urgency}</Text>
                    {Array.isArray(unit.imageUrl) ? (
                      unit.imageUrl.map((url, index) => (
                        <Image key={index} source={{ uri: url }} style={styles.unitImage} />
                      ))
                    ) : (
                      unit.imageUrl && <Image source={{ uri: unit.imageUrl }} style={styles.unitImage} />
                    )}
                  </View>
                ))}
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
    backgroundColor: "#4cbb17nb ",
    borderRadius: 5,
  },
});

export default Report;
