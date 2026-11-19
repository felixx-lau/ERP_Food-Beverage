/** @type {import('next').NextConfig} */
const nextConfig = {
  outputFileTracingExcludes: {
    '*': [
      '**/.env*',
      '**/*.db*',
      '**/prisma/companies/**',
      '**/prisma/companies.json',
      '**/.agent-data/**',
      '**/backups/**',
      '**/.local/**',
    ],
  },
};

export default nextConfig;
