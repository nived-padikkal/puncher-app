import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, TouchableOpacity, Image, Alert } from "react-native";
import Profile from "./assets/profile.png";
import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function App() {
  const [Timer, setTimer] = useState("");
  const [check, setCheck] = useState(true);
  const [status, setStatus] = useState("");
  const [location, setLocation] = useState(null);
  const [outsideLocation, setOutsideLocation] = useState(false);

  const allowedArea = {
    latMin: 10.00,
    latMax: 11.00,
    lonMin: 76.00,
    lonMax: 77.00,
  };

  useEffect(() => {
    const fetchData = async () => {
      const savedCheck = await AsyncStorage.getItem("check");
      const savedStatus = await AsyncStorage.getItem("status");

      if (savedCheck !== null) setCheck(savedCheck === "true");
      if (savedStatus) setStatus(savedStatus);
    };

    fetchData();

    const interval = setInterval(() => {
      const realtime = new Date().toLocaleTimeString("en-US", {
        timeZone: "Asia/Kolkata",
      });
      setTimer(realtime);
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const getLocation = async (currentTime) => {
    let { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert("Permission Denied", "Cannot access location without permission.");
      return null;
    }

    let loc = null;
    while (!loc) {
      try {
        loc = await Location.getCurrentPositionAsync({});
      } catch {
        await new Promise(res => setTimeout(res, 1000));
      }
    }

    const coords = loc.coords;
    const isInside =
      coords.latitude >= allowedArea.latMin &&
      coords.latitude <= allowedArea.latMax &&
      coords.longitude >= allowedArea.lonMin &&
      coords.longitude <= allowedArea.lonMax;

    setOutsideLocation(!isInside);
    setLocation(coords);

    const updatedStatus = `You ${check ? "Checked In" : "Checked Out"} at ${currentTime}\nLocation: ${coords.latitude}, ${coords.longitude}`;
    setStatus(updatedStatus);

    // Save to local storage
    await AsyncStorage.setItem("check", (!check).toString());
    await AsyncStorage.setItem("status", updatedStatus);
  };

  const handlePress = () => {
    Alert.alert(
      check ? "Check In?" : "Check Out?",
      `Are you sure you want to ${check ? "check in" : "check out"}?`,
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Yes",
          onPress: async () => {
            const currentTime = new Date().toLocaleTimeString("en-US", {
              timeZone: "Asia/Kolkata",
            });
            await getLocation(currentTime);
            setCheck(!check);
          },
        },
      ]
    );
  };

  const handleRequestAttendance = () => {
    Alert.alert("Request Sent", "You are outside the allowed area. Attendance request submitted.");
  };

  return (
    <View style={styles.container}>
      <Cardview />
      <View style={styles.centerContent}>
        <Text style={styles.text}>{Timer}</Text>
        <TouchableOpacity
          style={[styles.button, { backgroundColor: check ? "green" : "red" }]}
          onPress={handlePress}
        >
          <Text style={{ color: "white" }}>{check ? "Check In" : "Check Out"}</Text>
        </TouchableOpacity>

        {outsideLocation && (
          <TouchableOpacity
            style={[styles.button, { backgroundColor: "orange", marginTop: 10 }]}
            onPress={handleRequestAttendance}
          >
            <Text style={{ color: "white" }}>Request Attendance</Text>
          </TouchableOpacity>
        )}

        {status !== "" && <Text style={styles.statusText}>{status}</Text>}
      </View>
    </View>
  );
}

const Cardview = () => {
  return (
    <View style={styles.card}>
      <Image source={Profile} style={styles.profileImage} />
      <View>
        <Text style={styles.name}>User Name</Text>
        <Text>ID : 53739</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "white",
    paddingTop: 50,
  },
  centerContent: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  text: {
    color: "black",
    fontSize: 50,
    marginBottom: 10,
  },
  button: {
    paddingHorizontal: 90,
    paddingVertical: 10,
    borderRadius: 20,
    elevation: 10,
  },
  card: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fffff8",
    borderRadius: 10,
    padding: 15,
    marginHorizontal: 20,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 5,
    gap: 20,
  },
  profileImage: {
    height: 70,
    width: 70,
    borderRadius: 35,
  },
  name: {
    fontSize: 20,
    fontWeight: "bold",
  },
  statusText: {
    textAlign: "center",
    marginTop: 15,
    fontSize: 16,
    color: "gray",
  },
});
