import type { NextConfig } from "next";
import withPWA from 'next-pwa';

const isDev = process.env.NODE_ENV === 'development';

const nextConfig: NextConfig = {
  /* config options here */
  pwa: {
    dest: 'public',
    disable: isDev,
  },
};

export default withPWA(nextConfig);
