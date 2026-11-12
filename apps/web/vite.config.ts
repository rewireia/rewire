import react from '@vitejs/plugin-react';
import { defaultClientConditions, defineConfig } from 'vite';

const DEFAULT_PORT = 5200;

/** Libraries split into chunks of their own, so each loads and caches on its own. */
const CHUNKS = [
  // The framework every page needs; it changes less often than the application.
  { name: 'react', test: /node_modules[\\/](react|react-dom|scheduler|react-router)[\\/]/ },
  // Validation of every answer of the API, and the cache of its queries.
  { name: 'data', test: /node_modules[\\/](zod|@tanstack)[\\/]/ },
  // Loaded by the explorer, the task table of the report and the dashboard, and by AG Studio.
  { name: 'ag-grid', test: /node_modules[\\/](ag-grid-community|ag-grid-react|ag-stack)[\\/]/ },
  // Loaded by the explorer's histogram and by AG Studio; the Enterprise package goes with Studio.
  {
    name: 'ag-charts',
    test: /node_modules[\\/]ag-charts-(community|core|locale|react|types)[\\/]/,
  },
  // AG Studio and the Enterprise packages it is built on: commercial, loaded only by "Analyse".
  {
    name: 'ag-studio',
    test: /node_modules[\\/](ag-studio|ag-studio-react|ag-grid-enterprise|ag-charts-enterprise)[\\/]/,
  },
  // Bryntum Gantt and the products it is built on, loaded only by "Your plan in time".
  { name: 'bryntum', test: /node_modules[\\/]@bryntum[\\/]/ },
];

export default defineConfig({
  plugins: [react()],
  // Workspace packages are read from their TypeScript sources.
  resolve: { conditions: ['rewire-source', ...defaultClientConditions] },
  // The `.env` of the repository root; Vite exposes only its `VITE_*` variables to the page.
  envDir: '../..',
  build: {
    rolldownOptions: { output: { codeSplitting: { groups: CHUNKS } } },
    // AG Studio weighs about 4,225 kB minified (1,172 kB compressed), Bryntum Gantt about 1,980 kB
    // (615 kB), AG Charts about 1,442 kB (433 kB) and AG Grid about 1,032 kB (291 kB), the last two
    // with what AG Studio uses of them: more than the default warning of 500 kB, in chunks that only
    // "Analyse", "Your plan in time", the explorer, the task table and the dashboard load. Every
    // chunk of the first page stays under 500 kB.
    chunkSizeWarningLimit: 4300,
  },
  server: {
    host: '127.0.0.1',
    port: DEFAULT_PORT,
    proxy: { '/api': process.env.API_ORIGIN ?? 'http://127.0.0.1:8200' },
  },
  preview: { host: '127.0.0.1', port: DEFAULT_PORT },
});
