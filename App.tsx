import MapScreen from "./src/screens/MapScreen";
import { RootSiblingParent } from "react-native-root-siblings";

export default function App() {
  return (
    <RootSiblingParent>
      <MapScreen />
    </RootSiblingParent>
  );
}
