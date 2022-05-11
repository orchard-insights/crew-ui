<template>
  <section class="p-4">
    <Card>
      <template #title>
        Operators
      </template>
      <template #content>
        <Message v-if="error" severity="error" :closable="false">{{ error }}</Message>
        <DataTable v-if="operators.length > 0" :value="operators">
          <Column field="_id" header="Id">
            <template #body="slotProps">
              <span>{{ slotProps.data._id }}</span>
            </template>
          </Column>
          <Column field="channel" header="Channel" />
          <Column field="url" header="Channel" />
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
          <Column header="Actions">
            <template #body="slotProps">
              <Button type="button" class="p-button-danger" icon="pi pi-trash" @click="initDeleteOperator(slotProps.data)" />
              <Button type="button" class="p-button-secondary" icon="pi pi-eye" @click="initViewOperator(slotProps.data, true)" />
              <Button type="button" class="p-button-primary" icon="pi pi-pencil" @click="initViewOperator(slotProps.data, false)" />
            </template>
          </Column>
        </DataTable>
        <ProgressBar mode="indeterminate" v-if="loading" />
        <Paginator v-if="operators.length > 0" v-model:first="skip" v-model:rows="limit" :totalRecords="totalOperators" :rowsPerPageOptions="[10,50,100]" />
        <Dialog header="Add Operator" v-model:visible="showAddDialog" >
          <div class="p-fluid">
            <div class="p-field">
              <label for="channel">Channel</label>
              <InputText autofocus :disabled="addWait" id="channel" type="text" v-model="newChannel" />
            </div>
            <div class="p-field mt-4">
              <label for="url">Url</label>
              <InputText autofocus :disabled="addWait" id="url" type="text" v-model="newUrl" />
            </div>

            <div class="p-field mt-4">
              <label>Request Config</label>
              <vue3-json-editor
                v-model="newRequestConfig"
                :mode="'code'"
                :expandedOnStart="true"
                @json-change="newRequestConfigOnChange"
                @has-error="newRequestConfigOnError"
              />
              <Message v-if="newRequestConfigInputError" severity="error" :closable="false">{{ newRequestConfigInputError }}</Message>
            </div>

            <div class="p-field mt-4">
              <Checkbox v-model="newPaused" :disabled="addWait" :binary="true" />
              <label for="isPaused"> Paused</label>
            </div>
          </div>
          <Message v-if="addError" severity="error" :closable="false">{{ addError }}</Message>
          <template #footer>
            <Button label="Cancel" :disabled="addWait" @click="showAddDialog = false" />
            <Button label="Add" class="p-button-success" :disabled="addWait" @click="add" />
          </template>
        </Dialog>
        <div v-if="configStore.showHints && operators.length === 0">
          <Message severity="info">
            Use the + button below to add your first operator.
          </Message>
        </div>
      </template>
      <template #footer>
        <Button type="button" icon="pi pi-refresh" @click="loadOperators" :disabled="loading" label="Reload" />
        <Button type="button" class="p-button-success" icon="pi pi-plus" label="Add Operator" style="margin-left: .5em" @click="showAddDialog = true" />
      </template>
    </Card>

    <Dialog header="Delete Operator" v-model:visible="showDeleteOperatorDialog" >
      <p>
        Really delete operator {{ operatorToDelete._id }}?
      </p>
      <Message v-if="deleteOperatorError" severity="error" :closable="false">{{ deleteOperatorError }}</Message>
      <template #footer>
        <Button label="Cancel" :disabled="deleteOperatorWait" @click="showDeleteOperatorDialog = false" />
        <Button label="Delete" class="p-button-danger" :disabled="deleteOperatorWait" @click="doDeleteOperator" />
      </template>
    </Dialog>

    <Dialog header="Operator" v-model:visible="showViewOperatorDialog" >
      <div class="grid" v-if="openOperator">
        <div class="p-fluid col-6">

          <div class="p-field mt-4">
            <label for="channel">Channel</label>
            <InputText :disabled="openOperatorReadonly || editOperatorWait" id="channel" type="text" v-model="openOperator.channel" />
          </div>
          <div class="p-field">
            <label for="url">Url</label>
            <InputText autofocus :disabled="openOperatorReadonly || editOperatorWait" id="url" type="text" v-model="openOperator.url" />
          </div>

          <div class="p-field mt-4">
            <label>Request Config</label>
            <vue3-json-editor
              v-if="openOperator"
              v-model="openOperator.requestConfig"
              :mode="'code'"
              :expandedOnStart="true"
              @json-change="editRequestConfigOnChange"
              @has-error="editRequestConfigOnError"
            />
            <Message v-if="editRequestConfigInputError" severity="error" :closable="false">{{ editRequestConfigInputError }}</Message>
          </div>

          <div class="p-field mt-4">
            <Checkbox v-model="openOperator.isPaused" :disabled="openOperatorReadonly || editOperatorWait" :binary="true" />
            <label> Paused</label>
          </div>
        </div>
      </div>
      <Message v-if="editOperatorError" severity="error" :closable="false">{{ editOperatorError }}</Message>
      <template #footer>
        <Button label="Close" :disabled="editOperatorWait" @click="showViewOperatorDialog = null" />
        <Button v-if="openOperator && !openOperatorReadonly" label="Save" class="p-button-primary" :disabled="editOperatorWait || editRequestConfigInputError || !openOperator.url || !openOperator.channel" @click="doSaveOperator" />
      </template>
    </Dialog>

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
import InputNumber from 'primevue/inputnumber'
import Checkbox from 'primevue/checkbox'
import Card from 'primevue/card'
import Panel from 'primevue/panel'
import { DateTime } from 'luxon'

import { mapStores } from "pinia"
import { useConfigStore } from "../stores/config"

import { Vue3JsonEditor } from 'vue3-json-editor'

export default {
  name: 'Operators',
  components: { Panel, Message, ProgressBar, DataTable, Column, Button, Paginator, Dialog, InputText, InputNumber, Checkbox, Card, Vue3JsonEditor },
  data () {
    return {
      loading: true,
      error: '',
      operators: [],
      limit: parseInt(this.$route.query.limit || '10'),
      skip: parseInt(this.$route.query.skip || '0'),
      totalOperators: 0,
      showAddDialog: false,
      addWait: false,
      addError: '',
      newChannel: '',
      newUrl: '',
      newRequestConfig: {},
      actualNewRequestConfig: {},
      newRequestConfigInputError: '',
      newPaused: false,
      operatorToDelete: null,
      deleteOperatorError: '',
      deleteOperatorWait: false,
      showDeleteOperatorDialog: false,
      showViewOperatorDialog: false,
      openOperator: null,
      openOperatorReadonly: true,
      actualEditRequestConfig: {},
      editRequestConfigInputError: '',
      editOperatorWait: false,
      editOperatorError: ''
    }
  },
  computed: {
    ...mapStores(useConfigStore)
  },
  watch: {
    skip () {
      this.pushParams()
      this.loadOperators()
    },
    limit () {
      this.pushParams()
      this.loadOperators()
    },
    configReady () {
      this.loadOperators()
    }
  },
  mounted () {
    this.loadOperators()
  },
  methods: {
    async doSaveOperator () {
      if (!this.openOperatorReadonly) {
        this.editOperatorWait = true
        this.editOperatorError = ''
        try {
          const updates = {
            channel: this.openOperator.channel,
            url: this.openOperator.url,
            requestConfig: JSON.parse(JSON.stringify(this.actualEditRequestConfig)),
            isPaused: this.openOperator.isPaused
          }

          await axios.put(`${this.configStore.apiBaseUrl}api/v1/operator/${this.openOperator._id}`, updates)
          this.showViewOperatorDialog = null
          this.openOperator = null
          // await this.loadOperators()
        } catch (error) {
          if (_.has(error, 'response.data.message')) {
            this.editOperatorError = error.response.data.message
          } else {
            this.editOperatorError = error.message
          }
        } finally {
          this.editOperatorWait = false
        }

      }
    },
    initViewOperator (operator, readonly) {
      this.actualEditRequestConfig = operator.requestConfig || {}
      this.openOperatorReadonly = readonly
      this.openOperator = operator
      this.showViewOperatorDialog = true
    },
    initDeleteOperator (operator) {
      this.deleteOperatorError = ''
      this.operatorToDelete = operator
      this.showDeleteOperatorDialog = true
    },
    async doDeleteOperator () {
      this.deleteOperatorWait = true
      this.deleteOperatorError = ''
      try {
        await axios.delete(`${this.configStore.apiBaseUrl}api/v1/operator/${this.operatorToDelete._id}`)
        this.operatorToDelete = null
        this.showDeleteOperatorDialog = false
        await this.loadOperators()
      } catch (error) {
        if (_.has(error, 'response.data.message')) {
          this.deleteOperatorError = error.response.data.message
        } else {
          this.deleteOperatorError = error.message
        }
      } finally {
        this.deleteOperatorWait = false
      }
    },
    editRequestConfigOnChange (value) {
      this.editRequestConfigInputError = ''
      this.actualEditRequestConfig = value
    },
    editRequestConfigOnError (error) {
      this.editRequestConfigInputError = error.message
    },
    newRequestConfigOnChange (value) {
      this.newRequestConfigInputError = ''
      this.actualNewRequestConfig = value
    },
    newRequestConfigOnError (error) {
      this.newRequestConfigInputError = error.message
    },
    resetNewOperatorForm () {
      this.newChannel = ''
      this.newUrl = ''
      this.newRequestConfig = {}
      this.actualNewRequestConfig = {}
      this.newPaused = false
    },
    async add () {
      this.addWait = true
      this.addError = ''
      try {
        if (!this.newChannel) {
          throw new Error('Channel is required!')
        }
        if (!this.newUrl) {
          // TODO - make sure url is a url
          throw new Error('Url is required!')
        }

        await axios.post(`${this.configStore.apiBaseUrl}api/v1/operators`, {
          channel: this.newChannel,
          url: this.newUrl,
          requestConfig: JSON.parse(JSON.stringify(this.actualNewRequestConfig)),
          isPaused: this.newPaused
        })
        this.showAddDialog = false
        this.resetNewOperatorForm()
        await this.loadOperators()
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
    async loadOperators () {
      this.loading = true
      this.error = ''
      try {
        const countResponse = await axios.get(`${this.configStore.apiBaseUrl}api/v1/operators/count`)
        this.totalOperators = countResponse.data.count
        const response = await axios.get(`${this.configStore.apiBaseUrl}api/v1/operators?limit=${this.limit}&skip=${this.skip}`)
        this.operators = response.data
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
