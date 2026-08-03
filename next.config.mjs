/** @type {import('next').NextConfig} */
const isGitHubActions = process.env.GITHUB_ACTIONS === 'true';
const isSpaBuild = process.env.NEXT_PUBLIC_APP_MODE === 'spa' && process.env.NODE_ENV === 'production';

const nextConfig = {
  output: isSpaBuild || isGitHubActions ? 'export' : undefined,
  basePath: isGitHubActions ? '/unkan_questions' : undefined,
  trailingSlash: isSpaBuild || isGitHubActions,
  images: {
    unoptimized: isSpaBuild || isGitHubActions,
  },
};

export default nextConfig;
