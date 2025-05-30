import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, TouchableOpacity, Image } from "react-native";
import Profile from "./assets/icon.png";

export default function App() {
  const [Timer, setTimer] = useState("");
  const [check,setCheck] = useState(true);

  useEffect(() => {
    const interval = setInterval(() => {
      const realtime = new Date().toLocaleTimeString("en-US", {
        timeZone: "Asia/Kolkata",
      });
      setTimer(realtime);
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  return (
    <View style={styles.container}>
      <Cardview />

      
      <View style={styles.centerContent}>
        <Text style={styles.text}>{Timer}</Text>
        <TouchableOpacity style={[styles.button,{backgroundColor:check ? "green" : "red"}]} onPress={() => setCheck(!check)}>
          <Text style={{ color: "white" }}>{check ? "Check In" : "Check Out"}</Text>
        </TouchableOpacity>
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
    backgroundColor: "green",
    paddingHorizontal: 90,
    paddingVertical: 10,
    borderRadius: 20,
    elevation: 20,
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
});
