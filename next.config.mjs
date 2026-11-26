const revision = process.env.ERP_BUILD_REVISION || process.env.VERCEL_GIT_COMMIT_SHA || '';

/** @type {import('next').NextConfig} */
const nextConfig = {
  env: {
    ERP_BUILD_REVISION: /^[a-f0-9]{7,40}(?:-dirty)?$/i.test(revision) ? revision : 'unidentified',
  },
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
