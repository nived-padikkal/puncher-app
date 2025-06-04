import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Alert,
  StatusBar,
  Modal,
  Dimensions,
} from "react-native";
import MapView, { Circle, Marker } from "react-native-maps";
import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import Profile from "./assets/profile.png";
import * as Location from "expo-location";
import AsyncStorage from "@react-native-async-storage/async-storage";

const { width, height } = Dimensions.get("window");

export default function App() {
  const [Timer, setTimer] = useState("");
  const [check, setCheck] = useState(true);
  const [status, setStatus] = useState("");
  const [location, setLocation] = useState(null);
  const [outsideLocation, setOutsideLocation] = useState(false);
  const [workedHours, setWorkedHours] = useState("");
  const [showAlert, setShowAlert] = useState(false);
  const [alertConfig, setAlertConfig] = useState({});

  // Hardcoded office location - Replace with your actual office coordinates
  const OFFICE_LOCATION = {
    latitude: 37.42210,
    longitude: -122.08410,
  };

  const ALLOWED_RADIUS = 200; // meters

  const allowedArea = {
    center: OFFICE_LOCATION,
    radius: ALLOWED_RADIUS
  };

  const initialRegion = {
    latitude: OFFICE_LOCATION.latitude,
    longitude: OFFICE_LOCATION.longitude,
    latitudeDelta: 0.01,
    longitudeDelta: 0.01,
  };

  useEffect(() => {
    const fetchData = async () => {
      const savedCheck = await AsyncStorage.getItem("check");
      const savedStatus = await AsyncStorage.getItem("status");
      const savedCheckInTime = await AsyncStorage.getItem("checkInTime");

      if (savedCheck !== null) setCheck(savedCheck === "true");
      if (savedStatus) setStatus(savedStatus);

      if (!check && savedCheckInTime) {
        const diff = getWorkedHours(savedCheckInTime);
        setWorkedHours(diff);
      }
    };

    fetchData();

    const interval = setInterval(() => {
      const realtime = new Date().toLocaleTimeString("en-US", {
        timeZone: "Asia/Kolkata",
        hour12: true,
      });
      setTimer(realtime);
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const getWorkedHours = (checkInTime) => {
    const now = new Date();
    const inTime = new Date(checkInTime);
    const diffMs = now - inTime;
    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h ${minutes}m`;
  };

  const getWorkedHoursNumeric = (checkInTime) => {
    const now = new Date();
    const inTime = new Date(checkInTime);
    const diffMs = now - inTime;
    const hours = diffMs / (1000 * 60 * 60);
    return hours;
  };

  const getLocation = async () => {
    let { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== "granted") {
      showCustomAlert("Permission Denied", "Cannot access location without permission.", [
        { text: "OK", style: "default" }
      ]);
      return null;
    }

    let loc = null;
    let attempts = 0;
    while (!loc && attempts < 3) {
      try {
        loc = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.High,
        });
      } catch {
        attempts++;
        await new Promise((res) => setTimeout(res, 1000));
      }
    }

    if (!loc) {
      showCustomAlert("Location Error", "Unable to get your current location. Please try again.", [
        { text: "OK", style: "default" }
      ]);
      return null;
    }

    return loc.coords;
  };

  // Calculate distance between two coordinates using Haversine formula
  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371e3; // Earth's radius in meters
    const φ1 = lat1 * Math.PI/180;
    const φ2 = lat2 * Math.PI/180;
    const Δφ = (lat2-lat1) * Math.PI/180;
    const Δλ = (lon2-lon1) * Math.PI/180;

    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ/2) * Math.sin(Δλ/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

    return R * c; // Distance in meters
  };

  const isInsideAllowedArea = (coords) => {
    const distance = calculateDistance(
      coords.latitude,
      coords.longitude,
      OFFICE_LOCATION.latitude,
      OFFICE_LOCATION.longitude
    );
    return distance <= ALLOWED_RADIUS;
  };

  const showCustomAlert = (title, message, buttons) => {
    setAlertConfig({
      title,
      message,
      buttons,
    });
    setShowAlert(true);
  };

  const handlePress = async () => {
    const currentTime = new Date().toLocaleTimeString("en-US", {
      timeZone: "Asia/Kolkata",
      hour12: true,
    });

    const coords = await getLocation();
    if (!coords) return;

    const isInside = isInsideAllowedArea(coords);
    setOutsideLocation(!isInside);
    setLocation(coords);

    const locationText = `Location: ${coords.latitude.toFixed(5)}, ${coords.longitude.toFixed(5)}`;

    if (!isInside) {
      showCustomAlert(
        "Outside Allowed Area",
        `You cannot check in or out from this location. Please request attendance.\n${locationText}`,
        [{ text: "OK", style: "default" }]
      );
      return;
    }

    // For check out, show warning first if worked hours < 8
    if (!check) {
      const storedTime = await AsyncStorage.getItem("checkInTime");
      if (storedTime) {
        const worked = getWorkedHours(storedTime);
        const workedHoursNumeric = getWorkedHoursNumeric(storedTime);
        
        if (workedHoursNumeric < 8) {
          showCustomAlert(
            "Warning",
            `You have worked only ${worked}. Minimum 8 hours required!\n\nDo you still want to check out?\n${locationText}`,
            [
              { text: "Cancel", style: "cancel" },
              {
                text: "Check Out Anyway",
                style: "destructive",
                onPress: () => performCheckOut(currentTime, locationText, worked)
              }
            ]
          );
          return;
        }
      }
    }

    // Normal confirmation for check in or check out (when hours >= 8)
    showCustomAlert(
      check ? "Check In?" : "Check Out?",
      `Are you sure you want to ${check ? "check in" : "check out"}?\n${locationText}`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Yes",
          style: "default",
          onPress: async () => {
            if (!check) {
              const storedTime = await AsyncStorage.getItem("checkInTime");
              const worked = storedTime ? getWorkedHours(storedTime) : "Unknown";
              await performCheckOut(currentTime, locationText, worked);
            } else {
              await performCheckIn(currentTime, locationText);
            }
          },
        },
      ]
    );
  };

  const performCheckOut = async (currentTime, locationText, worked) => {
    setWorkedHours(worked);
    const updatedStatus = `You Checked Out at ${currentTime}\n${locationText}\nWorked: ${worked}`;
    setStatus(updatedStatus);
    await AsyncStorage.removeItem("check");
    await AsyncStorage.removeItem("status");
    await AsyncStorage.removeItem("checkInTime");
    setCheck(true);
  };

  const performCheckIn = async (currentTime, locationText) => {
    const checkInTime = new Date().toString();
    await AsyncStorage.setItem("checkInTime", checkInTime);
    const updatedStatus = `You Checked In at ${currentTime}\n${locationText}`;
    await AsyncStorage.setItem("check", "false");
    await AsyncStorage.setItem("status", updatedStatus);
    setStatus(updatedStatus);
    setCheck(false);
  };

  const handleRequestAttendance = () => {
    showCustomAlert(
      "Request Sent",
      "You are outside the allowed area. Attendance request submitted.",
      [{ text: "OK", style: "default" }]
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#2196F3" />
      
      {/* Title Bar */}
      <View style={styles.titleBar}>
        <TouchableOpacity style={styles.menuButton}>
          <View style={styles.menuLine} />
          <View style={styles.menuLine} />
          <View style={styles.menuLine} />
        </TouchableOpacity>
        <Text style={styles.titleText}>Attendance Tracker</Text>
        <View style={styles.placeholder} />
      </View>

      {/* Profile Card */}
      <ProfileCard />

      {/* Map View */}
      <View style={styles.mapContainer}>
        <MapView
          style={styles.map}
          initialRegion={initialRegion}
          showsUserLocation={true}
          showsMyLocationButton={false}
        >
          <Circle
            center={allowedArea.center}
            radius={100}
            fillColor="rgba(33, 150, 243, 0.2)"
            strokeColor="rgba(33, 150, 243, 0.8)"
            strokeWidth={2}
          />
          <Marker
            coordinate={allowedArea.center}
            title="Office Location"
            description="Allowed check-in area"
          >
            <View style={styles.markerContainer}>
              <MaterialIcons name="business" size={30} color="#2196F3" />
            </View>
          </Marker>
          {location && (
            <Marker
              coordinate={{
                latitude: location.latitude,
                longitude: location.longitude,
              }}
              title="Your Location"
              pinColor={outsideLocation ? "red" : "green"}
            />
          )}
        </MapView>
      </View>

      {/* Main Content */}
      <View style={styles.mainContent}>
        <View style={styles.timeContainer}>
          <MaterialIcons name="access-time" size={24} color="#666" />
          <Text style={styles.timeText}>{Timer}</Text>
        </View>

        <TouchableOpacity
          style={[
            styles.mainButton,
            { backgroundColor: check ? "#4CAF50" : "#F44336" }
          ]}
          onPress={handlePress}
        >
          <MaterialIcons 
            name={check ? "login" : "logout"} 
            size={24} 
            color="white" 
            style={styles.buttonIcon}
          />
          <Text style={styles.buttonText}>
            {check ? "Check In" : "Check Out"}
          </Text>
        </TouchableOpacity>

        {outsideLocation && (
          <TouchableOpacity
            style={[styles.requestButton]}
            onPress={handleRequestAttendance}
          >
            <MaterialIcons name="send" size={20} color="white" />
            <Text style={styles.requestButtonText}>Request Attendance</Text>
          </TouchableOpacity>
        )}

        {status !== "" && (
          <View style={styles.statusCard}>
            <MaterialIcons name="info" size={20} color="#2196F3" />
            <Text style={styles.statusText}>{status}</Text>
          </View>
        )}

        {!check && workedHours && (
          <View style={styles.workHoursCard}>
            <MaterialIcons name="schedule" size={20} color="#4CAF50" />
            <Text style={styles.workHoursText}>Worked Time: {workedHours}</Text>
          </View>
        )}
      </View>

      {/* Custom Alert Modal */}
      <Modal
        visible={showAlert}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowAlert(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.alertContainer}>
            <View style={styles.alertHeader}>
              <MaterialIcons 
                name={alertConfig.title === "Warning" ? "warning" : "info"} 
                size={24} 
                color={alertConfig.title === "Warning" ? "#FF9800" : "#2196F3"} 
              />
              <Text style={[
                styles.alertTitle,
                alertConfig.title === "Warning" && { color: "#FF9800" }
              ]}>
                {alertConfig.title}
              </Text>
            </View>
            <Text style={styles.alertMessage}>{alertConfig.message}</Text>
            <View style={styles.alertButtons}>
              {alertConfig.buttons?.map((button, index) => (
                <TouchableOpacity
                  key={index}
                  style={[
                    styles.alertButton,
                    button.style === "cancel" && styles.cancelButton,
                    button.style === "destructive" && styles.destructiveButton
                  ]}
                  onPress={() => {
                    setShowAlert(false);
                    button.onPress && button.onPress();
                  }}
                >
                  <Text style={[
                    styles.alertButtonText,
                    button.style === "cancel" && styles.cancelButtonText,
                    button.style === "destructive" && styles.destructiveButtonText
                  ]}>
                    {button.text}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const ProfileCard = () => {
  return (
    <View style={styles.profileCard}>
      <View style={styles.profileImageContainer}>
        <Image source={Profile} style={styles.profileImage} />
        <View style={styles.onlineIndicator} />
      </View>
      <View style={styles.profileInfo}>
        <Text style={styles.profileName}>User Name</Text>
        <View style={styles.idContainer}>
          <MaterialIcons name="badge" size={16} color="#666" />
          <Text style={styles.profileId}>ID: 53739</Text>
        </View>
      </View>
      <TouchableOpacity style={styles.profileAction}>
        <MaterialIcons name="more-vert" size={24} color="#666" />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  titleBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#2196F3",
    paddingHorizontal: 16,
    paddingTop: StatusBar.currentHeight + 10,
    paddingBottom: 15,
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  menuButton: {
    padding: 8,
  },
  menuLine: {
    width: 20,
    height: 2,
    backgroundColor: "white",
    marginVertical: 2,
    borderRadius: 1,
  },
  titleText: {
    fontSize: 18,
    fontWeight: "600",
    color: "white",
  },
  placeholder: {
    width: 36,
  },
  profileCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "white",
    marginHorizontal: 16,
    marginTop: 16,
    padding: 16,
    borderRadius: 12,
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  profileImageContainer: {
    position: "relative",
  },
  profileImage: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  onlineIndicator: {
    position: "absolute",
    bottom: 2,
    right: 2,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: "#4CAF50",
    borderWidth: 2,
    borderColor: "white",
  },
  profileInfo: {
    flex: 1,
    marginLeft: 12,
  },
  profileName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
  },
  idContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 2,
  },
  profileId: {
    fontSize: 14,
    color: "#666",
    marginLeft: 4,
  },
  profileAction: {
    padding: 4,
  },
  mapContainer: {
    height: 200,
    margin: 16,
    borderRadius: 12,
    overflow: "hidden",
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  map: {
    flex: 1,
  },
  markerContainer: {
    backgroundColor: "white",
    padding: 8,
    borderRadius: 20,
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  mainContent: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  timeContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "white",
    padding: 20,
    borderRadius: 12,
    marginBottom: 20,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  timeText: {
    fontSize: 24,
    fontWeight: "600",
    color: "#333",
    marginLeft: 8,
  },
  mainButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 25,
    elevation: 6,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    marginBottom: 16,
  },
  buttonIcon: {
    marginRight: 8,
  },
  buttonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
  requestButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FF9800",
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 20,
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    marginBottom: 16,
  },
  requestButtonText: {
    color: "white",
    fontSize: 14,
    fontWeight: "500",
    marginLeft: 6,
  },
  statusCard: {
    flexDirection: "row",
    backgroundColor: "white",
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  statusText: {
    flex: 1,
    fontSize: 14,
    color: "#333",
    marginLeft: 8,
    lineHeight: 20,
  },
  workHoursCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "white",
    padding: 16,
    borderRadius: 12,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  workHoursText: {
    fontSize: 16,
    fontWeight: "500",
    color: "#333",
    marginLeft: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 32,
  },
  alertContainer: {
    backgroundColor: "white",
    borderRadius: 16,
    padding: 24,
    width: "100%",
    maxWidth: 320,
    elevation: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  alertHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  alertTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
    marginLeft: 8,
  },
  alertMessage: {
    fontSize: 14,
    color: "#666",
    lineHeight: 20,
    marginBottom: 20,
  },
  alertButtons: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 12,
  },
  alertButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: "#2196F3",
  },
  cancelButton: {
    backgroundColor: "transparent",
  },
  destructiveButton: {
    backgroundColor: "#F44336",
  },
  alertButtonText: {
    color: "white",
    fontSize: 14,
    fontWeight: "500",
  },
  cancelButtonText: {
    color: "#666",
  },
  destructiveButtonText: {
    color: "white",
  },
});