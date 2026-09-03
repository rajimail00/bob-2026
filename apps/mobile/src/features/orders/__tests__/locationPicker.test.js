import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import * as Location from "expo-location";
import {
  AddressSearchError,
  LocationPickerMap,
  buildGeocodeQuery,
  resolveAddressSearch,
} from "../components/LocationPickerMap";

jest.mock("@expo/vector-icons", () => ({ Ionicons: () => null }));

jest.mock("expo-location", () => ({
  geocodeAsync: jest.fn(),
  reverseGeocodeAsync: jest.fn(),
  getForegroundPermissionsAsync: jest.fn(),
  requestForegroundPermissionsAsync: jest.fn(),
}));

jest.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key) => key }),
}));

jest.mock("tamagui", () => {
  const React = require("react");
  const { View } = require("react-native");
  const Stack = ({ children, ...props }) => React.createElement(View, props, children);
  return { XStack: Stack, YStack: Stack };
});

jest.mock("@/components/ui/Input", () => {
  const React = require("react");
  const { TextInput, View } = require("react-native");
  const Input = React.forwardRef(({ rightElement, ...props }, ref) =>
    React.createElement(
      View,
      null,
      React.createElement(TextInput, { ref, ...props }),
      rightElement
    )
  );
  return { Input };
});

jest.mock("@/components/ui/Button", () => {
  const React = require("react");
  const { Pressable, Text } = require("react-native");
  return {
    Button: ({ children, onPress, disabled, ...props }) =>
      React.createElement(
        Pressable,
        { onPress: disabled ? undefined : onPress, disabled, ...props },
        React.createElement(Text, null, children)
      ),
  };
});

jest.mock("@/components/ui/Text", () => {
  const React = require("react");
  const { Text } = require("react-native");
  return { Text: ({ children, ...props }) => React.createElement(Text, props, children) };
});

jest.mock("react-native-maps", () => {
  const React = require("react");
  const { Pressable, View } = require("react-native");
  const MapView = React.forwardRef(({ children, onPress }, ref) => {
    React.useImperativeHandle(ref, () => ({ animateToRegion: jest.fn() }));
    return React.createElement(
      Pressable,
      {
        testID: "location-map",
        onPress: () =>
          onPress({ nativeEvent: { coordinate: { latitude: 50.9413, longitude: 6.9583 } } }),
      },
      children
    );
  });
  const Marker = ({ coordinate, onDragEnd }) =>
    React.createElement(View, {
      testID: "location-marker",
      coordinate,
      onDragEnd,
    });
  return { __esModule: true, default: MapView, Marker };
});

const existingLocation = {
  coords: { lat: 52.52, lng: 13.405 },
  address: "Existing address, 10115 Berlin, Deutschland",
};
const reverseResult = {
  street: "Alexanderplatz",
  streetNumber: "1",
  postalCode: "10178",
  city: "Berlin",
  country: "Deutschland",
};

beforeEach(() => {
  jest.clearAllMocks();
  Location.getForegroundPermissionsAsync.mockResolvedValue({ status: "granted" });
  Location.requestForegroundPermissionsAsync.mockResolvedValue({ status: "granted" });
});

test.each([
  "Alexanderplatz 1, 10178 Berlin",
  "Marienplatz 1, 80331 München",
  "Domkloster 4, 50667 Köln",
])("biases the German-style address %s toward Germany", (address) => {
  expect(buildGeocodeQuery(address)).toBe(`${address}, Germany`);
});

test("preserves a complete international address", () => {
  expect(buildGeocodeQuery("10 Downing Street, London, United Kingdom")).toBe(
    "10 Downing Street, London, United Kingdom"
  );
});

test("successful address search returns coordinates and a clean reverse-geocoded address", async () => {
  Location.geocodeAsync.mockResolvedValue([{ latitude: 52.5219, longitude: 13.4132 }]);
  Location.reverseGeocodeAsync.mockResolvedValue([reverseResult]);

  await expect(resolveAddressSearch("Alexanderplatz 1, 10178 Berlin", "Selected")).resolves.toEqual({
    coords: { lat: 52.5219, lng: 13.4132 },
    address: "Alexanderplatz 1, 10178 Berlin, Deutschland",
    reverseGeocodeFailed: false,
  });
  expect(Location.geocodeAsync).toHaveBeenCalledWith(
    "Alexanderplatz 1, 10178 Berlin, Germany"
  );
});

test("an empty geocoding response becomes an address-not-found result", async () => {
  Location.geocodeAsync.mockResolvedValue([]);

  await expect(resolveAddressSearch("Unknown place", "Selected")).rejects.toMatchObject({
    code: "notFound",
  });
});

test("geocoding failures distinguish general errors from unavailable services", async () => {
  Location.geocodeAsync.mockRejectedValueOnce(new Error("Unexpected native failure"));
  await expect(resolveAddressSearch("Alexanderplatz", "Selected")).rejects.toEqual(
    expect.objectContaining({ code: "searchFailed" })
  );

  Location.geocodeAsync.mockRejectedValueOnce(new Error("Network service unavailable"));
  await expect(resolveAddressSearch("Alexanderplatz", "Selected")).rejects.toEqual(
    expect.objectContaining({ code: "serviceUnavailable" })
  );
});

test("reverse-geocoding failure keeps the typed address and successful coordinates", async () => {
  Location.geocodeAsync.mockResolvedValue([{ latitude: 48.1374, longitude: 11.5755 }]);
  Location.reverseGeocodeAsync.mockRejectedValue(new Error("reverse failed"));

  await expect(resolveAddressSearch("Marienplatz 1, 80331 München", "Selected")).resolves.toEqual({
    coords: { lat: 48.1374, lng: 11.5755 },
    address: "Marienplatz 1, 80331 München",
    reverseGeocodeFailed: true,
  });
});

test("the Search action updates the parent with the result coordinates", async () => {
  Location.geocodeAsync.mockResolvedValue([{ latitude: 52.5219, longitude: 13.4132 }]);
  Location.reverseGeocodeAsync.mockResolvedValue([reverseResult]);
  const onLocationChange = jest.fn();

  render(<LocationPickerMap {...existingLocation} onLocationChange={onLocationChange} />);
  fireEvent.changeText(
    screen.getByLabelText("locationPicker.searchLabel"),
    "Alexanderplatz 1, 10178 Berlin"
  );
  fireEvent.press(screen.getByLabelText("locationPicker.search"));

  await waitFor(() =>
    expect(onLocationChange).toHaveBeenCalledWith({
      coords: { lat: 52.5219, lng: 13.4132 },
      address: "Alexanderplatz 1, 10178 Berlin, Deutschland",
      reverseGeocodeFailed: false,
    })
  );
});

test("a failed search shows an error and preserves the previous valid marker and form value", async () => {
  Location.geocodeAsync.mockResolvedValue([]);
  const onLocationChange = jest.fn();

  render(<LocationPickerMap {...existingLocation} onLocationChange={onLocationChange} />);
  fireEvent.changeText(screen.getByLabelText("locationPicker.searchLabel"), "Missing address");
  fireEvent.press(screen.getByLabelText("locationPicker.search"));

  expect(await screen.findByText("locationPicker.notFound")).toBeTruthy();
  expect(onLocationChange).not.toHaveBeenCalled();
  expect(screen.getByTestId("location-marker").props.coordinate).toEqual({
    latitude: existingLocation.coords.lat,
    longitude: existingLocation.coords.lng,
  });
});

test("map taps and marker drags reverse-geocode and update the address textbox", async () => {
  Location.reverseGeocodeAsync.mockResolvedValue([
    {
      street: "Domkloster",
      streetNumber: "4",
      postalCode: "50667",
      city: "Köln",
      country: "Deutschland",
    },
  ]);
  const onLocationChange = jest.fn();

  render(<LocationPickerMap {...existingLocation} onLocationChange={onLocationChange} />);
  fireEvent.press(screen.getByTestId("location-map"));

  await waitFor(() =>
    expect(screen.getByLabelText("locationPicker.searchLabel").props.value).toBe(
      "Domkloster 4, 50667 Köln, Deutschland"
    )
  );
  expect(onLocationChange).toHaveBeenLastCalledWith({
    coords: { lat: 50.9413, lng: 6.9583 },
    address: "Domkloster 4, 50667 Köln, Deutschland",
  });

  fireEvent(screen.getByTestId("location-marker"), "dragEnd", {
    nativeEvent: { coordinate: { latitude: 48.1374, longitude: 11.5755 } },
  });
  await waitFor(() =>
    expect(onLocationChange).toHaveBeenLastCalledWith({
      coords: { lat: 48.1374, lng: 11.5755 },
      address: "Domkloster 4, 50667 Köln, Deutschland",
    })
  );
});

test("AddressSearchError exposes a stable testable failure code", () => {
  expect(new AddressSearchError("empty").code).toBe("empty");
});
