<template>
  <section class="p-4">
    <Card>
      <template #title>
        Task Groups
      </template>
      <template #content>
        <Message v-if="error" severity="error" :closable="false">{{ error }}</Message>
        <DataTable v-if="groups.length > 0" :value="groups">
          <Column field="_id" header="Id">
            <template #body="slotProps">
              <router-link :to="'/task_group/' + slotProps.data._id">{{ slotProps.data._id }}</router-link>
            </template>
          </Column>
          <Column field="name" header="Name">
            <template #body="slotProps">
              <router-link :to="'/task_group/' + slotProps.data._id">{{ slotProps.data.name }}</router-link>
            </template>
          </Column>
          <Column field="isPaused" header="Paused">
            <template #body="slotProps">
              <span v-if="slotProps.data.isPaused">Yes</span>
              <span v-else>No</span>
            </template>
          </Column>
          <Column field="createdAt" header="Created At">
            <template #body="slotProps">
              {{ formatDate(slotProps.data.createdAt) }}
            </template>
          </Column>
        </DataTable>
        <ProgressBar mode="indeterminate" v-if="loading" />
        <Paginator v-if="groups.length > 0" v-model:first="skip" v-model:rows="limit" :totalRecords="totalTaskGroups" :rowsPerPageOptions="[10,50,100]" />
        <Dialog header="Add Task Group" v-model:visible="showAddDialog" >
          <div class="p-fluid">
            <div class="p-field">
              <label for="name">Name</label>
              <InputText autofocus :disabled="addWait" id="name" type="text" v-model="newName" @keyup.enter="add" />
            </div>
            <div class="p-field mt-4">
              <Checkbox v-model="newPaused" :disabled="addWait" :binary="true" />
              <label for="name"> Paused</label>
            </div>
          </div>
          <Message v-if="addError" severity="error" :closable="false">{{ addError }}</Message>
          <template #footer>
            <Button label="Cancel" :disabled="addWait" @click="showAddDialog = false" />
            <Button label="Add" class="p-button-success" :disabled="addWait" @click="add" />
          </template>
        </Dialog>
        <div v-if="configStore.showHints && groups.length === 0">
          <Message severity="info">
            Welcome to Crew!  To get started use the + button below to add your first Task Group.
          </Message>
        </div>
      </template>
      <template #footer>
        <Button type="button" icon="pi pi-refresh" @click="loadTaskGroups" :disabled="loading" label="Reload" />
        <Button type="button" class="p-button-success" icon="pi pi-plus" label="Add Task Group" style="margin-left: .5em" @click="showAddDialog = true" />
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
import Dialog from 'primevue/dialog'
import InputText from 'primevue/inputtext'
import Checkbox from 'primevue/checkbox'
import Card from 'primevue/card'
import Panel from 'primevue/panel'
import { DateTime } from 'luxon'

import { mapStores } from "pinia"
import { useConfigStore } from "../stores/config"

export default {
  name: 'TaskGroups',
  components: { Panel, Message, ProgressBar, DataTable, Column, Button, Paginator, Dialog, InputText, Checkbox, Card },
  data () {
    return {
      loading: true,
      error: '',
      groups: [],
      limit: parseInt(this.$route.query.limit || '10'),
      skip: parseInt(this.$route.query.skip || '0'),
      totalTaskGroups: 0,
      showAddDialog: false,
      addWait: false,
      addError: '',
      newName: '',
      newPaused: false
    }
  },
  computed: {
    ...mapStores(useConfigStore)
  },
  watch: {
    skip () {
      this.pushParams()
      this.loadTaskGroups()
    },
    limit () {
      this.pushParams()
      this.loadTaskGroups()
    },
    configReady () {
      this.loadTaskGroups()
    }
  },
  mounted () {
    this.loadTaskGroups()
  },
  methods: {
    async add () {
      this.addWait = true
      this.addError = ''
      try {
        if (!this.newName) {
          throw new Error('Name is required!')
        }
        const response = await axios.post(`${this.configStore.apiBaseUrl}api/v1/task_groups`, {
          name: this.newName,
          isPaused: this.newPaused
        })
        this.$router.push('/task_group/' + response.data._id)
      } catch (error) {
        console.error(error)
        if (_.has(error, 'response.data.message')) {
          this.addError = error.response.data.message
        } else {
          this.addError = error.message
        }
      } finally {
        this.addWait = false
      }
    },
    pushParams (){
      this.$router.replace({
        query: { skip: this.skip + '', limit: this.limit + '' }
      })
    },
    formatDate (iso) {
      return DateTime.fromISO(iso).toFormat('fff')
    },
    async loadTaskGroups () {
      this.loading = true
      this.error = ''
      try {
        const countResponse = await axios.get(`${this.configStore.apiBaseUrl}api/v1/task_groups/count`)
        this.totalTaskGroups = countResponse.data.count
        const response = await axios.get(`${this.configStore.apiBaseUrl}api/v1/task_groups?limit=${this.limit}&skip=${this.skip}`)
        this.groups = response.data
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
