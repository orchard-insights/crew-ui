import { defineStore } from 'pinia'

export const useConfigStore = defineStore({
  id: 'config',
  state: () => ({
    apiBaseUrl: import.meta.env.VITE_CREW_API_BASE_URL || 'http://localhost:3000/',
    apiWsUrl: import.meta.env.VITE_CREW_API_WS_URL || 'http://localhost:3000/',
    showHints: true
  })
})
