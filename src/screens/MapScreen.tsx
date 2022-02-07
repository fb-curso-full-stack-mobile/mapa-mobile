import { useEffect, useState } from "react";
import {
  Dimensions,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import MapView, {
  Callout,
  LatLng,
  MapEvent,
  Marker,
  Polygon,
  PROVIDER_GOOGLE,
} from "react-native-maps";
import * as TaskManager from "expo-task-manager";
import * as Location from "expo-location";
import pin from "../../assets/images/pin.png";

const { width, height } = Dimensions.get("window");

const ASPECT_RATIO = width / height;
const LATITUDE = -27.591724;
const LONGITUDE = -48.550279;
const LATITUDE_DELTA = 0.02;
const LONGITUDE_DELTA = LATITUDE_DELTA * ASPECT_RATIO;

const INITIAL_REGION = {
  latitude: LATITUDE,
  longitude: LONGITUDE,
  latitudeDelta: LATITUDE_DELTA,
  longitudeDelta: LONGITUDE_DELTA,
};

const LOCATION_TASK_NAME = "background-location-task";

export default function MapScreen() {
  const requestPermissions = async () => {
    const resultForeground = await Location.requestForegroundPermissionsAsync();
    if (resultForeground.status === "granted") {
      const resultBackground =
        await Location.requestBackgroundPermissionsAsync();
      if (resultBackground.status === "granted") {
        await Location.startLocationUpdatesAsync(LOCATION_TASK_NAME, {
          accuracy: Location.Accuracy.Balanced,
        });
      }
    }
  };

  TaskManager.defineTask(LOCATION_TASK_NAME, ({ data, error }) => {
    if (error) {
      // Error occurred - check `error.message` for more details.
      return;
    }
    if (data) {
      const { locations } = data as any;
      if (locations && locations.length > 0) {
        console.log(locations[0].coords);
      }
    }
  });

  useEffect(() => {
    requestPermissions();
  }, []);

  return (
    <View style={styles.container}>
      <MapView
        provider={PROVIDER_GOOGLE}
        initialRegion={INITIAL_REGION}
        style={styles.map}
      >
        <Marker coordinate={INITIAL_REGION} image={pin}>
          <Callout>
            <View>
              <Text>Janela de informação</Text>
            </View>
          </Callout>
        </Marker>
      </MapView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
  },
  map: {
    width: Dimensions.get("window").width,
    height: Dimensions.get("window").height,
  },
});
