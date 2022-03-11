import { readable } from 'svelte/store'

export const config = readable({
	apiBaseUrl: import.meta.env.VITE_CREW_API_BASE_UR as string || 'http://localhost:3000/',
	apiWsUrl: import.meta.env.VITE_CREW_API_WS_URL as string || 'http://localhost:3000/'
})
