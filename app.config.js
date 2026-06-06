module.exports = ({ config }) => {
  const isWeb = process.env.EXPO_PUBLIC_PLATFORM === 'web';
  return {
    ...config,
    experiments: {
      ...config.experiments,
      baseUrl: isWeb ? "/myERP/app" : ""
    }
  };
};
