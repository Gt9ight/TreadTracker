import { View, Text, TextInput, Button, ScrollView, SafeAreaView, TouchableOpacity } from 'react-native';
import React, { useState } from 'react';
import DropDownPicker from 'react-native-dropdown-picker';

const Specifics = ({ onDone }) => {
    const [OpenServiceType, setOpenServiceType] = useState(false);
    const [ServiceType, setServiceType] = useState(null);
    const [tireOptions, setTireOptions] = useState([]);
    const [openTireOptions, setopenTireOptions] = useState(false);
    const [selectedTire, setSelectedTire] = useState(null);
    const [customTire, setCustomTire] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const [position, setPosition] = useState('');
    const [treadDepth, setTreadDepth] = useState('');
    const [specificsList, setSpecificsList] = useState([]);
    const [ServiceOptions, setServiceOptions] = useState([
        { label: 'Replace', value: 'Replace' },
        { label: 'Flat Repair', value: 'Flat Repair' },
    ]);

    const addCustomTire = () => {
        if (customTire.trim() !== '' && !tireOptions.some((tire) => tire.value === customTire)) {
            const newTire = { label: customTire, value: customTire };
            setTireOptions([...tireOptions, newTire]);
            setSelectedTire(customTire);
            setCustomTire('');
            setIsTyping(false);
        }
    };

    const addSpecifics = () => {
        if (position && ServiceType && treadDepth && selectedTire) {
            const newSpecific = {
                position,
                ServiceType,
                treadDepth,
                selectedTire,
            };
            setSpecificsList([...specificsList, newSpecific]);
            setPosition('');
            setServiceType(null);
            setTreadDepth('');
            setSelectedTire(null);
        }
    };

    const handleDonePress = () => {
        onDone(specificsList);
        setSpecificsList([]); // Clear after saving
      };
      const deleteSpecific = (index) => {
        setSpecificsList(specificsList.filter((_, i) => i !== index));
    };

    return (
        <SafeAreaView style={{ flex: 1 }}>
            <View style={{ padding: 20, flex: 1 }}>
                <Text style={{ fontSize: 20, fontWeight: 'bold', marginBottom: 15,textAlign: 'center' }}>Specifics</Text>

                {/* Position Input */}
                <View style={{ marginBottom: 15 }}>
                    <Text style={{ fontSize: 16, marginBottom: 5 }}>Position:</Text>
                    <TextInput
                        placeholder="Enter Position"
                        value={position}
                        onChangeText={setPosition}
                        style={{
                            borderWidth: 1,
                            borderColor: '#ccc',
                            borderRadius: 8,
                            padding: 10,
                        }}
                    />
                </View>

                <View style={{ marginBottom: 15 }}>
                    <Text style={{ fontSize: 16, marginBottom: 5 }}>Service Type:</Text>
                    <DropDownPicker
                        open={OpenServiceType}
                        value={ServiceType}
                        items={ServiceOptions}
                        setOpen={setOpenServiceType}
                        setValue={setServiceType}
                        setItems={setServiceOptions}
                        placeholder="Select Service"
                        style={{ borderRadius: 8, borderColor: '#ccc', marginBottom: 5 }}
                    />
                </View>

                {/* Tread Depth Input */}
                <View style={{ marginBottom: 15 }}>
                    <Text style={{ fontSize: 16, marginBottom: 5 }}>Tread Depth:</Text>
                    <TextInput
                        placeholder="Enter Tread Depth"
                        value={treadDepth}
                        onChangeText={setTreadDepth}
                        style={{
                            borderWidth: 1,
                            borderColor: '#ccc',
                            borderRadius: 8,
                            padding: 10,
                        }}
                    />
                </View>

                {/* Tire Needed Dropdown */}
                <View style={{ marginBottom: 15 }}>
                    <Text style={{ fontSize: 16, marginBottom: 5 }}>Tire Needed:</Text>
                    <DropDownPicker
                        open={openTireOptions}
                        value={selectedTire}
                        items={[...tireOptions, { label: 'Add Tire (Type Manually)', value: 'custom' }]}
                        setOpen={setopenTireOptions}
                        setValue={setSelectedTire}
                        setItems={setTireOptions}
                        onChangeValue={(value) => {
                            if (value === 'custom') {
                                setIsTyping(true);
                            } else {
                                setIsTyping(false);
                            }
                        }}
                        placeholder="Select or Add a Tire"
                        style={{ borderRadius: 8, borderColor: '#ccc', marginBottom: 5 }}
                    />
                </View>

                {isTyping && (
                    <View style={{ marginBottom: 15 }}>
                        <TextInput
                            placeholder="Enter Tire Needed"
                            style={{
                                borderWidth: 1,
                                borderColor: '#ccc',
                                borderRadius: 8,
                                padding: 10,
                                marginBottom: 10,
                            }}
                            value={customTire}
                            onChangeText={setCustomTire}
                        />
                        <Button title="Save Tire" onPress={addCustomTire} />
                    </View>
                )}

                {/* Add Specifics Button */}
                <Button title="Add Specifics" onPress={addSpecifics} />

                {/* Display Specifics */}
                <ScrollView style={{ marginTop: 15 }}>
                    {specificsList.map((item, index) => (
                        <View key={index} style={{ marginTop: 15, padding: 10, borderWidth: 1, borderRadius: 8, borderColor: '#ccc' }}>
                                                        <TouchableOpacity
                                onPress={() => deleteSpecific(index)}
                                style={{position: 'absolute',top: 5, right: 5, backgroundColor: 'red',  paddingVertical: 5, paddingHorizontal: 10,  borderRadius: 5,}}>
                                <Text style={{ color: 'white', fontWeight: 'bold' }}>X</Text>
                            </TouchableOpacity>
                            <Text style={{ fontSize: 16, fontWeight: 'bold' }}>Position: {item.position}</Text>
                            <Text>Service Type: {item.ServiceType}</Text>
                            <Text>Tread Depth: {item.treadDepth}</Text>
                            <Text>Tire Needed: {item.selectedTire}</Text>
                        </View>
                    ))}
                </ScrollView>
                <TouchableOpacity onPress={handleDonePress}>
  <Text>Done</Text>
</TouchableOpacity>
            </View>
        </SafeAreaView>
    );
};

export default Specifics;
