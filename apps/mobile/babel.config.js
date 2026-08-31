module.exports = function (api) {
  const isTest = api.env("test");
  return {
    presets: ["babel-preset-expo"],
    plugins: [
      [
        "module-resolver",
        {
          root: ["./src"],
          alias: { "@": "./src" },
          extensions: [".ts", ".tsx", ".js", ".jsx", ".json"],
        },
      ],
      ...(isTest
        ? []
        : [
            [
              "@tamagui/babel-plugin",
              {
                components: ["tamagui"],
                config: "./tamagui.config.ts",
                logTimings: false,
              },
            ],
            // Reanimated 4 moved the worklets babel plugin into its own package.
            "react-native-worklets/plugin",
          ]),
    ],
  };
};
