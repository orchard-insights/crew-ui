<template>
  <Menubar :model="items">
    <template #start>
      <router-link to="/" style="text-decoration: none; color: black; font-weight: bold;">
        <img src="/CREW_Logo_96.png" style="width: 28px;  margin-bottom: 5px; vertical-align: middle;" />
        <span>
          Crew
        </span>
      </router-link>
    </template>
  </Menubar>
</template>

<script>
import Menubar from 'primevue/menubar'
import Button from 'primevue/button'

export default {
  name: 'AppNavbar',
  components: { Menubar, Button },
  data () {
    return {
      showNavbar: false,
      items: [
        { label: "Task Groups", to: '/' },
        { label: "Channels", to: '/channels' },
        { label: "Operators", to: '/operators' }
      ]
    }
  }
}
</script>
