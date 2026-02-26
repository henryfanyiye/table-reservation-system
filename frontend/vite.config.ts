import { defineConfig, loadEnv } from 'vite';
import solid from 'vite-plugin-solid';
import { fileURLToPath, URL } from 'node:url';

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const apiTarget = env.VITE_API_BASE_URL || 'http://localhost:3000';
  const isProduction = mode === 'production';

  return {
  plugins: [solid()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    host: '0.0.0.0',
    port: 5173,
    allowedHosts: ['106.52.167.143'],
    proxy: {
      '/api': {
        target: apiTarget,
        changeOrigin: true,
      },
      '/graphql': {
        target: apiTarget,
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
    minify: 'esbuild',
    esbuild: {
      drop: isProduction ? ['console', 'debugger'] : [],
    },
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          // Solid.js 核心
          if (id.includes('solid-js') || id.includes('@solidjs/router') || id.includes('@solidjs/meta')) {
            return 'solid-vendor';
          }
          // Ark UI 组件库
          if (id.includes('@ark-ui/solid')) {
            return 'ark-ui';
          }
          // GraphQL 相关
          if (id.includes('@urql') || id.includes('urql') || id.includes('graphql')) {
            return 'graphql';
          }
          // 工具库
          if (id.includes('dayjs')) {
            return 'utils';
          }
          // HTTP 客户端
          if (id.includes('axios')) {
            return 'http';
          }
        },
      },
    },
    // 提高 chunk 大小警告阈值
    chunkSizeWarningLimit: 1000,
  },
  optimizeDeps: {
    include: [
      'solid-js',
      'solid-js/web',
      'solid-js/store',
      '@solidjs/router',
      '@urql/solid',
      'graphql',
      'dayjs',
    ],
  },
};
});
