import * as Location from "expo-location";
import * as TaskManager from "expo-task-manager";
import * as geolib from "geolib";

import {
  Dimensions,
  Image,
  Modal,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import MapView, {
  Callout,
  LatLng,
  MapEvent,
  Polygon as MapPolygon,
  Marker,
  PROVIDER_GOOGLE,
} from "react-native-maps";
import { useEffect, useState } from "react";

import { Polygon } from "../models/polygon";
import { PolygonCoordinate } from "../models/polygon-coordinate";
import { Position } from "../models/position";
import Toast from "react-native-root-toast";
import icProfile from "../../assets/images/ic_profile.png";
import pin from "../../assets/images/pin.png";
import pinFriend from "../../assets/images/pin_friend.png";
import pinMe from "../../assets/images/pin_me.png";

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
  // PINs
  const [positions, setPositions] = useState<Position[]>([]);
  const [startLocationTask, setStartLocationTask] = useState(true);

  // Modal cadastro
  const [modalVisible, setModalVisible] = useState(false);

  // Dados do usuário
  const [myPositionId, setMyPositionId] = useState(0);
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");

  // Polígonos
  const [polygons, setPolygons] = useState<Polygon[]>([]);
  const [editing, setEditing] = useState<Polygon | null>();

  const [checkArea, setCheckArea] = useState(true);

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
      // console.log("getPositions: ", json);
      if (response.ok) {
        setPositions(json.positions);
        if (json.positions.length > 1) {
          const pos1 = json.positions[0];
          const pos2 = json.positions[1];
          const dist = distance(pos1.lat, pos1.lng, pos2.lat, pos2.lng);
          // console.log("distância: ", dist);
          if (dist < 0.5) {
            // console.log("Amigo próximo");
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

  const getPolygons = async () => {
    fetch("http://192.168.0.11:3001/v1/polygon", {
      headers: {
        "Content-Type": "application/json",
      },
      method: "GET",
    }).then(async (response) => {
      const json = await response.json();
      // console.log("getPolygons: ", json);
      if (response.ok) {
        setPolygons(json.polygons);
      } else {
        console.log(json.message);
      }
    });
  };

  useEffect(() => {
    console.log("useEffect area");
    if (
      checkArea &&
      positions &&
      positions.length > 0 &&
      polygons &&
      polygons.length > 0
    ) {
      setCheckArea(false);
      let position = positions.find((position) => position.id === myPositionId);
      for (const polygon of polygons) {
        const coordinates = polygon.coordinates.map((coord) => {
          return { latitude: coord.latitude, longitude: coord.longitude };
        });
        console.log("coordinates: ", coordinates);
        const center = geolib.getCenter(coordinates);
        console.log("center: ", center);
        console.log("position: ", position);
        if (position && center) {
          const dis = distance(
            position.lat,
            position.lng,
            center.latitude,
            center.longitude
          );
          console.log("dis: ", dis);
          if (dis < 1) {
            Toast.show("Próximo da área.", {
              duration: Toast.durations.LONG,
            });
          }
        }
      }
    }
  }, [positions, checkArea, polygons]);

  useEffect(() => {
    if (positions.length > 0 && startLocationTask) {
      setStartLocationTask(false);
      requestPermissions();
    }
  }, [positions, startLocationTask]);

  useEffect(() => {
    getPositions();
    getPolygons();
  }, []);

  const sendSaveRequest = (position: Position, method: string) => {
    fetch("http://192.168.0.11:3001/v1/position", {
      headers: {
        "Content-Type": "application/json",
      },
      method,
      body: JSON.stringify(position),
    })
      .then(async (response) => {
        const json = await response.json();
        // console.log("saved: ", json);
        if (response.ok) {
          setMyPositionId(json.updated.id);
          getPositions();
        } else {
          console.log(json.message);
        }
      })
      .catch((e) => console.log());
  };

  TaskManager.defineTask(LOCATION_TASK_NAME, ({ data, error }) => {
    if (error) {
      console.log(error);
    } else if (data) {
      // console.log(data);
      const { locations } = data as any;
      if (locations && locations.length > 0) {
        let position = positions.find(
          (position) => position.id === myPositionId
        );
        if (!position) {
          position = {
            lat: locations[0].coords.latitude,
            lng: locations[0].coords.longitude,
            accuracy: Math.round(locations[0].coords.accuracy),
            heading: Math.round(locations[0].coords.heading),
          } as Position;
        } else {
          position.lat = locations[0].coords.latitude;
          position.lng = locations[0].coords.longitude;
          position.accuracy = Math.round(locations[0].coords.accuracy);
          position.heading = Math.round(locations[0].coords.heading);
        }
        const id = positions.length > 0 ? positions[0].id : 0;
        // -27.590909, -48.549105
        if (id > 0) {
          (position as any).id = id;
        }
        // console.log("saving: ", position);
        const method = id > 0 ? "PUT" : "POST";
        //@ts-ignore
        sendSaveRequest(position, method);
      }
    } else {
      console.log("Nenhum dado recebido");
    }
  });
  const saveUserData = () => {
    if (name && username) {
      const position = positions.find(
        (position) => position.id === myPositionId
      );
      if (position) {
        position.name = name;
        position.username = username;
        sendSaveRequest(position, "PUT");
        setModalVisible(false);
      }
    }
  };

  const getCoordinate = (position: Position) => {
    const coord = {
      latitude: position.lat,
      longitude: position.lng,
      latitudeDelta: LATITUDE_DELTA,
      longitudeDelta: LONGITUDE_DELTA,
    };
    return coord;
  };

  const getUsername = (position: Position) => {
    if (position) {
      return position.username || "-";
    }
    return "-";
  };

  const getName = (position: Position) => {
    if (position) {
      return position.name || "-";
    }
    return "-";
  };

  const onPress = (e: MapEvent) => {
    const coordinate: PolygonCoordinate = {
      latitude: e.nativeEvent.coordinate.latitude,
      longitude: e.nativeEvent.coordinate.longitude,
    };
    if (!editing) {
      setEditing({
        coordinates: [coordinate],
      });
    } else {
      setEditing({
        ...editing,
        coordinates: [...editing.coordinates, coordinate],
      });
    }
  };

  const finish = () => {
    if (editing) {
      fetch("http://192.168.0.11:3001/v1/polygon", {
        headers: {
          "Content-Type": "application/json",
        },
        method: "POST",
        body: JSON.stringify(editing),
      })
        .then(async (response) => {
          const json = await response.json();
          // console.log("saved: ", json);
          if (response.ok) {
            setPolygons([...polygons, editing]);
          } else {
            console.log(json.message);
          }
        })
        .catch((e) => console.log());
      setEditing(null);
    }
  };

  // console.log("positions: ", positions);

  return (
    <View style={styles.container}>
      <MapView
        provider={PROVIDER_GOOGLE}
        initialRegion={INITIAL_REGION}
        style={styles.map}
        showsUserLocation
        onPress={onPress}
      >
        {positions.map((position, index) => (
          <Marker
            key={`marker_${index}`}
            coordinate={getCoordinate(position)}
            image={position.id === myPositionId ? pinMe : pinFriend}
          >
            <Callout style={{ height: 60 }}>
              <View style={{ height: 40 }}>
                <Text>Nome de usuário: {getUsername(position)}</Text>
                <Text>Nome: {getName(position)}</Text>
              </View>
            </Callout>
          </Marker>
        ))}
        {polygons.map((polygon, index) => (
          <MapPolygon
            key={`polygon_${index}`}
            coordinates={polygon.coordinates}
            strokeColor="#F00"
            fillColor="rgba(255,0,0,0.5)"
            strokeWidth={2}
          />
        ))}
        {editing ? (
          <MapPolygon
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
      {modalVisible ? (
        <View style={styles.modal}>
          <View style={styles.modalBody}>
            <Text style={styles.modalTitle}>Perfil</Text>
            <TextInput
              style={styles.input}
              placeholder="Nome de usuário"
              value={username}
              onChangeText={setUsername}
            />
            <TextInput
              style={styles.input}
              placeholder="Nome"
              value={name}
              onChangeText={setName}
            />
            <TouchableOpacity
              style={[styles.buttonModal, styles.buttonSave]}
              onPress={saveUserData}
            >
              <Text style={styles.buttonSaveText}>Salvar</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.buttonModal, styles.buttonCancel]}
              onPress={() => setModalVisible(false)}
            >
              <Text style={styles.buttonCancelText}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : null}
      <TouchableOpacity
        style={styles.profileButton}
        onPress={() => setModalVisible(true)}
      >
        <Image source={icProfile} style={styles.profileImage} />
      </TouchableOpacity>
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
  profileButton: {
    position: "absolute",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 1,
    left: 10,
    top: 30,
    backgroundColor: "rgba(255,255,255,0.5)",
    width: 60,
    height: 60,
    borderRadius: 30,
  },
  profileImage: {
    width: 40,
    height: 40,
  },
  modal: {
    position: "absolute",
    zIndex: 2,
    backgroundColor: "rgba(0,0,0,0.6)",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    justifyContent: "center",
    alignItems: "center",
  },
  modalTitle: {
    fontWeight: "bold",
    marginBottom: 14,
  },
  modalBody: {
    backgroundColor: "#fff",
    width: "70%",
    padding: 14,
    borderRadius: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: "#333",
    borderRadius: 8,
    height: 40,
    marginBottom: 8,
    paddingHorizontal: 8,
  },
  buttonModal: {
    backgroundColor: "#bbb",
    marginBottom: 8,
    height: 40,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  buttonSave: {
    backgroundColor: "#00f",
  },
  buttonCancel: {
    backgroundColor: "transparent",
  },
  buttonSaveText: {
    color: "#fff",
  },
  buttonCancelText: {
    color: "#00f",
  },
});
