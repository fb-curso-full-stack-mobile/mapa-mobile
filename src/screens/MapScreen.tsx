import { useState } from "react";
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

type MyPolygon = {
  coordinates: LatLng[];
};

export default function MapScreen() {
  const [polygons, setPolygons] = useState<MyPolygon[]>([]);
  const [editing, setEditing] = useState<MyPolygon | null>();

  const onPress = (e: MapEvent) => {
    if (!editing) {
      setEditing({
        coordinates: [e.nativeEvent.coordinate],
      });
    } else {
      setEditing({
        ...editing,
        coordinates: [...editing.coordinates, e.nativeEvent.coordinate],
      });
    }
  };

  const finish = () => {
    if (editing) {
      setPolygons([...polygons, editing]);
      setEditing(null);
    }
  };

  return (
    <View style={styles.container}>
      <MapView
        provider={PROVIDER_GOOGLE}
        initialRegion={INITIAL_REGION}
        style={styles.map}
        onPress={onPress}
      >
        <Marker coordinate={INITIAL_REGION} image={pin}>
          <Callout>
            <View>
              <Text>Janela de informação</Text>
            </View>
          </Callout>
        </Marker>
        {polygons.map((polygon, index) => (
          <Polygon
            key={`polygon_${index}`}
            coordinates={polygon.coordinates}
            strokeColor="#F00"
            fillColor="rgba(255,0,0,0.5)"
            strokeWidth={2}
          />
        ))}
        {editing ? (
          <Polygon
            key={`polygon_${polygons.length + 1}`}
            coordinates={editing.coordinates}
            strokeColor="#F00"
            fillColor="rgba(255,0,0,0.5)"
            strokeWidth={2}
          />
        ) : null}
      </MapView>
      {editing ? (
        <View style={styles.buttonContainer}>
          <TouchableOpacity style={styles.button} onPress={() => finish()}>
            <Text>Finalizar</Text>
          </TouchableOpacity>
        </View>
      ) : null}
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
