import { registerRootComponent } from "expo";
import App from "./App";

// Custom entry (instead of the default node_modules/expo/AppEntry.js) because in an npm
// workspace `expo` hoists to the repo root, breaking that file's relative "../../App" import.
registerRootComponent(App);
