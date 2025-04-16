import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, Text, View, Button, Alert, Platform } from 'react-native';
import { Camera, CameraType } from 'expo-camera';
import * as Speech from 'expo-speech';
import axios from 'axios';

// IMPORTANT: Replace this with your computer's IP address on the local network
// Make sure your phone and computer are on the SAME Wi-Fi network
// On Windows, run 'ipconfig' in Command Prompt
// On macOS/Linux, run 'ifconfig' or 'ip addr' in Terminal
const SERVER_IP = '172.18.112.1'; // <--- Already set based on previous context
const SERVER_URL = `http://${SERVER_IP}:8000/infer`;

export default function App() {
  const [hasPermission, setHasPermission] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const cameraRef = useRef(null);

  useEffect(() => {
    (async () => {
      console.log("Requesting camera permission...");
      const { status } = await Camera.requestCameraPermissionsAsync();
      console.log("Camera permission status:", status);
      setHasPermission(status === 'granted');
      if (status !== 'granted') {
          Alert.alert('Permission Denied', 'Camera permission is required to use this app.');
      }
    })();
  }, []);

  const captureAndInfer = async () => {
    if (isLoading || !cameraRef.current) {
      console.log("Already processing or camera not ready.");
      return;
    }
    setIsLoading(true);
    console.log("Capturing picture...");

    try {
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.7, // Lower quality for faster transfer
        base64: true,
        skipProcessing: true, // Faster on Android
      });
      console.log("Picture captured, sending to server...");

      const response = await axios.post(SERVER_URL, {
        image_base64: photo.base64,
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

    } catch (error) { // Removed ': any' annotation
      console.error("Error during capture/inference:", error);
      let errorMessage = 'Failed to capture or get description.';
      if (axios.isAxiosError(error)) {
        if (error.response) {
            // Server responded with a status code outside the 2xx range
            errorMessage = `Server error: ${error.response.status} - ${JSON.stringify(error.response.data)}`;
        } else if (error.request) {
            // Request was made but no response received (e.g., network error, server down)
            errorMessage = `Network error: Could not connect to the server at ${SERVER_URL}. Please ensure the server is running and the IP address is correct.`;
        } else {
            // Something happened in setting up the request
            errorMessage = `Request setup error: ${error.message}`;
        }
      } else {
          // Check if error is an instance of Error to safely access message
          if (error instanceof Error) {
             errorMessage = `An unexpected error occurred: ${error.message}`;
          } else {
             errorMessage = `An unexpected error occurred: ${String(error)}`;
          }
      }
       Alert.alert('Error', errorMessage);
       Speech.speak(errorMessage.split(':')[0]); // Speak a shorter version of the error

    } finally {
      setIsLoading(false);
       console.log("Processing finished.");
    }
  };

  if (hasPermission === null) {
    return <View style={styles.container}><Text>Requesting camera permission...</Text></View>;
  }
  if (hasPermission === false) {
    return <View style={styles.container}><Text>No access to camera. Please enable it in settings.</Text></View>;
  }

  return (
    <View style={styles.container}>
      <Camera style={styles.camera} type={CameraType.back} ref={cameraRef} ratio="16:9" />
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
  },
  camera: {
    // Make camera preview fill the screen or a large portion
    // Adjust as needed for your desired layout
    width: '100%',
    // height: '80%', // Example: Use flex: 1 to fill available space above button
    flex: 1, // Make camera fill space above button container
  },
  buttonContainer: {
    position: 'absolute',
    bottom: 30,
    left: 0,
    right: 0,
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.4)', // Semi-transparent background
    paddingVertical: 20,
  },
  text: {
      color: 'white',
      fontSize: 18,
      marginBottom: 10,
  }
}); 