<template>
  <section class="p-4">
    <Card>
      <template #title>
        Channels
      </template>
      <template #content>
        <Message v-if="error" severity="error" :closable="false">{{ error }}</Message>
        <DataTable :value="channels">
          <Column field="name" header="Name"></Column>
          <Column field="totalCount" header="Total Tasks"></Column>
          <Column field="completedCount" header="Completed Tasks"></Column>
          <Column field="assignedCount" header="Assigned Tasks"></Column>
        </DataTable>
        <ProgressBar mode="indeterminate" v-if="loading" />
        <div v-if="configStore.showHints">
          <Message severity="info">
            This page lists all the channels that have tasks.  Create workers for each of these or nothing will get done!
          </Message>
        </div>
      </template>
      <template #footer>
        <Button type="button" class="mt-2" icon="pi pi-refresh" label="Reload" :disabled="loading" @click="loadChannels" />
      </template>
    </Card>
  </section>
</template>

<script>
import axios from 'axios'
import _ from 'lodash'
import Message from 'primevue/message';
import ProgressBar from 'primevue/progressbar'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import Button from 'primevue/button'
import Paginator from 'primevue/paginator'
import Card from 'primevue/card'

import { mapStores } from "pinia"
import { useConfigStore } from "../stores/config"

export default {
  name: 'Channels',
  components: { Message, ProgressBar, DataTable, Column, Button, Paginator, Card },
  data () {
    return {
      loading: true,
      error: '',
      channels: []
    }
  },
  computed: {
    ...mapStores(useConfigStore)
  },
  watch: {
    configReady () {
      this.loadChannels()
    }
  },
  mounted () {
    this.loadChannels()
  },
  methods: {
    async loadChannels () {
      this.loading = true
      this.error = ''
      try {
        const response = await axios.get(`${this.configStore.apiBaseUrl}api/v1/channels`)
        this.channels = response.data
      } catch (error) {
        console.error(error)
        if (_.has(error, 'response.data.message')) {
          this.error = error.response.data.message
        } else {
          this.error = error.message
        }
      } finally {
        this.loading = false
      }
    }
  }
}
</script>
