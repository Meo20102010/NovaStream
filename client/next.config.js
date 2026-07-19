const path = require('path');

/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [],
  },
  outputFileTracingRoot: path.resolve(__dirname),

};

module.exports = nextConfig;
