<template>
  <div>
    <Toast />
    <header>
      <app-navbar/>
    </header>
    <section>
      <router-view/>
    </section>
  </div>
</template>

<script>
import AppNavbar from './components/AppNavbar.vue'
import Toast from 'primevue/toast'
import _ from 'lodash'

export default {
  components: { AppNavbar, Toast },
  data () {
    return {
      tokenCheckWait: true
    }
  }
}

</script>

<style>
html, body {
  margin: 0;
  padding: 0;
}
</style>