import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, Text, View, Button, Alert, Platform } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as Speech from 'expo-speech';
import axios from 'axios';

// NOTE: Using require is necessary for static assets in React Native
// but keeping imports for components and libraries is standard.
// import { HelloWave } from '@/components/HelloWave'; // Removed unused component
// import ParallaxScrollView from '@/components/ParallaxScrollView'; // Removed unused component
// import { ThemedText } from '@/components/ThemedText'; // Removed unused component
// import { ThemedView } from '@/components/ThemedView'; // Removed unused component

// IMPORTANT: Replace this with your computer's IP address on the local network
// Make sure your phone and computer are on the SAME Wi-Fi network
// On Windows, run 'ipconfig' in Command Prompt
// On macOS/Linux, run 'ifconfig' or 'ip addr' in Terminal
const SERVER_IP = '172.18.112.1'; // <--- Already set based on previous context
const SERVER_URL = `http://${SERVER_IP}:8000/infer`;

export default function HomeScreen() {
  // Use the dedicated hook for permissions
  const [permission, requestPermission] = useCameraPermissions();
  const [isLoading, setIsLoading] = useState(false);
  // Ref to access CameraView methods
  const cameraRef = useRef<CameraView | null>(null);

  useEffect(() => {
    // Request permission when the component mounts
    if (!permission?.granted) {
        console.log("Requesting camera permission via hook...");
        requestPermission();
    }
  }, [permission, requestPermission]); // Rerun if permission state changes

  const captureAndInfer = async () => {
    // Check if cameraRef.current exists and has takePictureAsync
    if (isLoading || !cameraRef.current || typeof cameraRef.current.takePictureAsync !== 'function') {
      console.log("Already processing or camera ref not ready or invalid.");
      if (cameraRef.current && typeof cameraRef.current.takePictureAsync !== 'function') {
          console.error("cameraRef.current does not have takePictureAsync method.");
      }
      return;
    }
    setIsLoading(true);
    console.log("Capturing picture...");

    try {
      // Call takePictureAsync on the CameraView ref
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.7, // Lower quality for faster transfer
        base64: true,
        // skipProcessing might not be applicable to CameraView, check docs if needed
      });
      console.log("Picture captured, preparing base64 data...");

      if (!photo?.base64) { // Optional chaining for safety
          throw new Error("Failed to get base64 data from photo.");
      }

      // --- Strip potential Data URL prefix --- S
      let base64Data = photo.base64;
      const prefix = "data:image/";
      if (base64Data.startsWith(prefix)) {
          console.log("Detected and removing data URL prefix...");
          base64Data = base64Data.substring(base64Data.indexOf(",") + 1);
      }
      // Log first few chars to check
      console.log("Base64 data start (after potential strip):", base64Data.substring(0, 20) + "...");
      console.log("Sending base64 data of length:", base64Data.length);
      // --- End of strip --- E

      console.log("Sending data to server...");
      const response = await axios.post(SERVER_URL, {
        image_base64: base64Data,
      }, {
          timeout: 15000 // 15 second timeout
      });

      console.log("Server response received:", response.data);

      if (response.data && response.data.description) {
        Speech.speak(response.data.description, { language: 'en-US' });
      } else if (response.data && response.data.error) {
          Alert.alert('Server Error', `Server returned an error: ${response.data.error}`);
          console.error("Server error:", response.data.error);
      } else {
          Alert.alert('Invalid Response', 'Received an unexpected response from the server.');
          console.error("Invalid server response:", response.data);
      }

    } catch (error: any) { // Using ': any' for general catch in TSX
      console.error("Error during capture/inference:", error);
      let errorMessage = 'Failed to capture or get description.';
      if (axios.isAxiosError(error)) {
        if (error.response) {
            errorMessage = `Server error: ${error.response.status} - ${JSON.stringify(error.response.data)}`;
        } else if (error.request) {
            errorMessage = `Network error: Could not connect to the server at ${SERVER_URL}. Please ensure the server is running and the IP address is correct.`;
        } else {
            errorMessage = `Request setup error: ${error.message}`;
        }
      } else if (error instanceof Error) {
          errorMessage = `An unexpected error occurred: ${error.message}`;
      } else {
          errorMessage = `An unexpected error occurred: ${String(error)}`;
      }
       Alert.alert('Error', errorMessage);
       Speech.speak(errorMessage.split(':')[0]); // Speak a shorter version of the error

    } finally {
      setIsLoading(false);
       console.log("Processing finished.");
    }
  };

  // Check permission status from the hook
  if (!permission) {
    // Permissions are still loading
    return <View style={styles.container}><Text style={styles.text}>Checking permissions...</Text></View>;
  }

  if (!permission.granted) {
    // Permissions are not granted yet
    return (
      <View style={styles.container}>
        <Text style={styles.text}>We need your permission to show the camera</Text>
        <Button onPress={requestPermission} title="Grant Permission" />
      </View>
    );
  }

  // Permissions granted, render the CameraView
  return (
    <View style={styles.container}>
      {/* Use CameraView component */}
      <CameraView style={styles.camera} facing={'back'} ref={cameraRef} />
      <View style={styles.buttonContainer}>
        <Button
          title={isLoading ? "Processing..." : "Capture & Describe"}
          onPress={captureAndInfer}
          disabled={isLoading}
        />
      </View>
    </View>
  );
}

// Reusing styles from the previous App.js attempt, adjust as needed
const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000', // Dark background for camera view
  },
  camera: {
    width: '100%',
    flex: 1, // Make camera fill space above button container
  },
  buttonContainer: {
    position: 'absolute',
    bottom: 30, // Position button at the bottom
    left: 0,
    right: 0,
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.4)', // Semi-transparent background for button area
    paddingVertical: 20,
  },
  text: { // Style for permission/loading text
      color: 'white',
      fontSize: 18,
      textAlign: 'center',
      padding: 20,
  }
});
