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
import * as Location from "expo-location";
import * as TaskManager from "expo-task-manager";
import pin from "../../assets/images/pin.png";
import { Position } from "../models/position";
import Toast from "react-native-root-toast";

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
  const [positions, setPositions] = useState<Position[]>([]);
  const [startLocationTask, setStartLocationTask] = useState(true);

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

  const distance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    if (lat1 == lat2 && lon1 == lon2) {
      return 0;
    } else {
      const radlat1 = (Math.PI * lat1) / 180;
      const radlat2 = (Math.PI * lat2) / 180;
      const theta = lon1 - lon2;
      const radtheta = (Math.PI * theta) / 180;
      let dist =
        Math.sin(radlat1) * Math.sin(radlat2) +
        Math.cos(radlat1) * Math.cos(radlat2) * Math.cos(radtheta);
      if (dist > 1) {
        dist = 1;
      }
      dist = Math.acos(dist);
      dist = (dist * 180) / Math.PI;
      dist = dist * 60 * 1.1515;
      dist = dist * 1.609344;
      return dist;
    }
  };

  const getPositions = async () => {
    fetch("http://192.168.0.11:3001/v1/position", {
      headers: {
        "Content-Type": "application/json",
      },
      method: "GET",
    }).then(async (response) => {
      const json = await response.json();
      if (response.ok) {
        setPositions(json.positions);
        if (json.positions.length > 1) {
          const pos1 = json.positions[0];
          const pos2 = json.positions[1];
          const dist = distance(pos1.lat, pos1.lng, pos2.lat, pos2.lng);
          console.log("distância: ", dist);
          if (dist < 0.5) {
            console.log("Amigo próximo");
            Toast.show("Amigo próximo.", {
              duration: Toast.durations.LONG,
            });
          }
        }
      } else {
        console.log(json.message);
      }
    });
  };

  useEffect(() => {
    if (positions.length > 0 && startLocationTask) {
      setStartLocationTask(false);
      requestPermissions();
    }
  }, [positions, startLocationTask]);

  useEffect(() => {
    getPositions();
  }, []);

  TaskManager.defineTask(LOCATION_TASK_NAME, ({ data, error }) => {
    if (error) {
      console.log(error);
    } else if (data) {
      const { locations } = data as any;
      if (locations && locations.length > 0) {
        const id = positions.length > 0 ? positions[0].id : 0;
        // -27.590909, -48.549105
        const position = {
          lat: locations[0].coords.latitude,
          lng: locations[0].coords.longitude,
          accuracy: locations[0].coords.accuracy,
          heading: Math.round(locations[0].coords.heading),
        };
        if (id > 0) {
          (position as any).id = id;
        }
        console.log("saving: ", position);
        const method = id > 0 ? "PUT" : "POST";
        fetch("http://192.168.0.11:3001/v1/position", {
          headers: {
            "Content-Type": "application/json",
          },
          method,
          body: JSON.stringify(position),
        }).then(async (response) => {
          const json = await response.json();
          if (response.ok) {
            getPositions();
          } else {
            console.log(json.message);
          }
        });
      }
    } else {
      console.log("Nenhum dado recebido");
    }
  });

  const getCoordinate = (position: Position) => {
    const coord = {
      latitude: position.lat,
      longitude: position.lng,
      latitudeDelta: LATITUDE_DELTA,
      longitudeDelta: LONGITUDE_DELTA,
    };
    return coord;
  };

  // console.log("positions: ", positions);

  return (
    <View style={styles.container}>
      <MapView
        provider={PROVIDER_GOOGLE}
        initialRegion={INITIAL_REGION}
        style={styles.map}
      >
        {positions.map((position, index) => (
          <Marker
            key={`marker_${index}`}
            coordinate={getCoordinate(position)}
            image={pin}
          >
            <Callout>
              <View>
                <Text>Janela de informação</Text>
              </View>
            </Callout>
          </Marker>
        ))}
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
  buttonContainer: {
    position: "absolute",
    bottom: 0,
    backgroundColor: "transparent",
  },
  button: {
    width: 90,
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 12,
    borderColor: "black",
    borderWidth: 2,
    alignItems: "center",
    marginHorizontal: 10,
    backgroundColor: "rgba(255,255,255,0.8)",
  },
});
