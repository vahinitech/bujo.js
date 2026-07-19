// babel.config.js
module.exports = {
    presets: [
      [
        '@babel/preset-env',
        {
          targets: {
            node: 'current', // Compile code for the current Node.js version
          },
        },
      ],
    ],
  };
  