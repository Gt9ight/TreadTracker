import React, { useState, useEffect } from "react";
import { Modal, View, Image, TouchableOpacity, Text, StyleSheet, ScrollView, Dimensions, SafeAreaView } from "react-native";

const { width, height } = Dimensions.get("window");

const ImageViewerModal = ({ visible, images, onClose, selectedIndex }) => {
  const [currentIndex, setCurrentIndex] = useState(selectedIndex || 0);
  const scrollRef = React.useRef(null);

  useEffect(() => {
    setCurrentIndex(selectedIndex || 0);
  }, [selectedIndex]);

  const handleNext = () => {
    if (currentIndex < images.length - 1) {
      setCurrentIndex(currentIndex + 1);
      scrollRef.current.scrollTo({ x: (currentIndex + 1) * width, animated: true });
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
      scrollRef.current.scrollTo({ x: (currentIndex - 1) * width, animated: true });
    }
  };

  if (!images || images.length === 0) return null;

  return (
    <Modal visible={visible} transparent={true} animationType="fade">
      <SafeAreaView style={styles.modalContainer}>
        {/* Close Button */}
        <TouchableOpacity style={styles.closeButton} onPress={onClose}>
          <Text style={styles.closeButtonText}>Close</Text>
        </TouchableOpacity>

        {/* Scrollable Images */}
        <ScrollView
          ref={scrollRef}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={(e) => {
            const newIndex = Math.floor(e.nativeEvent.contentOffset.x / width);
            setCurrentIndex(newIndex);
          }}
        >
          {images.map((uri, index) => (
            <View key={index} style={styles.imageContainer}>
              <Image source={{ uri }} style={styles.fullImage} />
            </View>
          ))}
        </ScrollView>

        {/* Image Index Indicator */}
        <Text style={styles.imageIndex}>
          {currentIndex + 1} / {images.length}
        </Text>
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.9)",
    justifyContent: "center",
    alignItems: "center",
  },
  closeButton: {
    position: "absolute",
    top: 50,
    right: 20,
    padding: 10,
    zIndex: 10, 
  },
  closeButtonText: {
    color: "white",
    fontSize: 18,
    fontWeight: "bold",
  },
  imageContainer: {
    width,
    height: height * 0.8,
    justifyContent: "center",
    alignItems: "center",
  },
  fullImage: {
    width: "90%",
    height: "80%",
    resizeMode: "contain",
  },
  imageIndex: {
    color: "white",
    fontSize: 16,
    marginTop: 10,
  },
  arrowButton: {
    position: "absolute",
    top: "50%",
    transform: [{ translateY: -20 }],
    backgroundColor: "rgba(0,0,0,0.6)",
    padding: 15,
    borderRadius: 30,
    zIndex: 10,
  },
  arrowText: {
    color: "white",
    fontSize: 30,
    fontWeight: "bold",
  },
});

export default ImageViewerModal;
