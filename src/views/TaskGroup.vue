<template>
  <section class="p-4">
    <Card>
      <template #title>
        <span v-if="group">{{ group.name }} <span v-if="group.isPaused"> (Paused)</span></span>
      </template>
      <template #content>
        <ProgressBar v-if="sortedTasks.length > 0" :value="percentComplete" class="mb-4">
          <span style="color: white;">Percent Complete: {{ percentComplete.toFixed(2) }}%</span>
        </ProgressBar>

        <ProgressSpinner v-if="loading" />
        <Message v-if="error" severity="error" :closable="false">{{ error }}</Message>

        <div v-if="configStore.showHints && sortedTasks.length === 0">
          <Message severity="info">
            To add a demo task to this group:<br/>
            1) Use the Add Task button below to create a task with channel = "worker_c", and isSeed = True<br/>
            2) Then start the crew demo workers by running this command in a new terminal window: "orchard-crew work"
          </Message>
        </div>

        <div v-if="group" class="mb-4">
          <span class="p-buttonset">
            <Button label="Add Task" type="button" class="p-button-success" icon="pi pi-plus" @click="showAddDialog = true" />
            <Button label="Delete" type="button" class="p-button-danger" icon="pi pi-trash" @click="showDeleteDialog = true" />
            <Button label="Edit" type="button" class="p-button-info" icon="pi pi-pencil" @click="showEditDialog = true" />
            <Button label="Pause" v-if="!group.isPaused" :disabled="pauseResumeWait" type="button" class="p-button-warning" icon="pi pi-pause" @click="pause" />
            <Button label="Resume" v-if="group.isPaused" :disabled="pauseResumeWait" type="button" class="p-button-warning" icon="pi pi-play" @click="resume" />
            <Button label="Reset" v-if="sortedTasks.length > 0" :disabled="resetWait" type="button" class="p-button-secondary" icon="pi pi-backward" @click="showResetDialog = true" />
            <Button label="Retry Failed Tasks" v-if="sortedTasks.length > 0" type="button" class="p-button-help" icon="pi pi-replay" @click="showRetryDialog = true" />
          </span>
        </div>

        <div v-if="group" class="mb-4">
          <Checkbox v-model="showOnlyIncompleteTasks" :binary="true" />
          <label> Hide Completed</label>
        </div>

        <DataTable v-if="sortedTasks.length > 0" :value="sortedTasks" :paginator="true" :rows="taskRows" class="p-datatable-sm" responsiveLayout="scroll">
          <Column field="_id" header="Id">
            <template #body="slotProps">
              <TaskStatusTag :task="slotProps.data" />
            </template>
          </Column>
          <Column field="name" header="Name">
            <template #body="slotProps">
              <span>{{ truncateName(slotProps.data.name) }}</span>
            </template>
          </Column>
          <Column field="channel" header="Channel"></Column>
          <Column header="Parents">
            <template #body="slotProps">
              <span v-if="slotProps.data.parentIds && slotProps.data.parentIds.length > 0">
                <span v-for="parentId of slotProps.data.parentIds" :key="parentId">
                  <TaskStatusTag :task="tasks[parentId]" />
                </span>
              </span>
            </template>
          </Column>
          <Column field="remainingAttempts" header="Remaining Attempts" />
          <Column field="runAfter" header="Delayed">
            <template #body="slotProps">
              <span v-if="slotProps.data.runAfter">
                {{ formatDate(slotProps.data.runAfter) }}
              </span>
            </template>
          </Column>
          <Column field="isSeed" header="Is Seed">
            <template #body="slotProps">
              <span v-if="slotProps.data.isSeed">
                Yes
              </span>
              <span v-else>
                No
              </span>
            </template>
          </Column>
          <Column header="Actions">
            <template #body="slotProps">
              <Button type="button" class="p-button-danger" icon="pi pi-trash" @click="initDeleteTask(slotProps.data._id)" />
              <Button type="button" class="p-button-secondary" icon="pi pi-eye" @click="initViewTask(slotProps.data._id, true)" />
              <Button type="button" class="p-button-primary" icon="pi pi-pencil" @click="initViewTask(slotProps.data._id, false)" />
            </template>
          </Column>
        </DataTable>

        <Dialog header="Delete Task Group" v-model:visible="showDeleteDialog" >
          <p>
            Really delete this task group and all the tasks it contains?
          </p>
          <Message v-if="deleteError" severity="error" :closable="false">{{ deleteError }}</Message>
          <template #footer>
            <Button label="Cancel" :disabled="deleteWait" @click="showDeleteDialog = false" />
            <Button label="Delete" class="p-button-danger" :disabled="deleteWait" @click="doDelete" />
          </template>
        </Dialog>

        <Dialog header="Reset Task Group" v-model:visible="showResetDialog" >
          <p>
            Really reset this task group and re-run all tasks?
          </p>
          <Message v-if="resetError" severity="error" :closable="false">{{ resetError }}</Message>
          <template #footer>
            <Button label="Cancel" :disabled="resetWait" @click="showResetDialog = false" />
            <Button label="Reset" class="p-button-secondary" :disabled="resetWait" @click="doReset" />
          </template>
        </Dialog>

        <Dialog header="Retry Failed Tasks" v-model:visible="showRetryDialog" >
          <p>All incomplete nodes in this task group will be re-run.</p>
          <div class="p-fluid col-6">
            <div class="p-field">
              <div class="p-field mt-4">
                <label for="retryRemainingAttempts">Max Retries</label>
                <InputNumber :disabled="retryWait" id="retryRemainingAttempts" type="text" v-model="retryRemainingAttempts" />
              </div>
            </div>
          </div>
          <Message v-if="retryError" severity="error" :closable="false">{{ retryError }}</Message>
          <template #footer>
            <Button label="Cancel" :disabled="retryWait" @click="showRetryDialog = false" />
            <Button label="Retry" class="p-button-help" :disabled="retryWait" @click="doRetry" />
          </template>
        </Dialog>

        <Dialog header="Delete Task" v-model:visible="showDeleteTaskDialog" >
          <p>
            Really delete task {{ taskToDelete.name }}?
          </p>
          <Message v-if="deleteTaskError" severity="error" :closable="false">{{ deleteTaskError }}</Message>
          <template #footer>
            <Button label="Cancel" :disabled="deleteTaskWait" @click="showDeleteTaskDialog = false" />
            <Button label="Delete" class="p-button-danger" :disabled="deleteTaskWait" @click="doDeleteTask" />
          </template>
        </Dialog>

        <Dialog header="Edit Task Group" v-model:visible="showEditDialog" >
          <div class="p-fluid">
            <div class="p-field">
              <label for="name">Name</label>
              <InputText autofocus :disabled="addWait" id="name" type="text" v-model="editName" />
            </div>
          </div>
          <Message v-if="editError" severity="error" :closable="false">{{ editError }}</Message>
          <template #footer>
            <Button label="Cancel" :disabled="editWait" @click="showEditDialog = false" />
            <Button label="Save" class="p-button-primary" :disabled="editWait" @click="doEdit" />
          </template>
        </Dialog>

        <Dialog header="Task Detail" v-model:visible="showViewTaskDialog" >
          <div class="grid" v-if="openTask">
            <div class="p-fluid col-6">
              <div class="p-field">
                <label for="name">Name</label>
                <InputText autofocus :disabled="openTaskReadonly || editTaskWait" id="name" type="text" v-model="openTask.name" />
              </div>
              <div class="p-field mt-4">
                <label for="channel">Channel</label>
                <InputText :disabled="openTaskReadonly || editTaskWait" id="channel" type="text" v-model="openTask.channel" />
              </div>
              <div class="p-field mt-4">
                <Checkbox v-model="openTask.isSeed" :disabled="openTaskReadonly || editTaskWait" :binary="true" />
                <label> Is Seed</label>
              </div>
              <div class="p-field mt-4">
                <label for="workgroup">Workgroup</label>
                <InputText :disabled="openTaskReadonly || editTaskWait" id="workgroup" type="text" v-model="openTask.workgroup" />
              </div>
              <div class="p-field mt-4">
                <label for="key">Key</label>
                <InputText :disabled="openTaskReadonly || editTaskWait" id="key" type="text" v-model="openTask.key" />
              </div>
              <div class="p-field mt-4">
                <label for="attempts">Attempts</label>
                <InputNumber :disabled="openTaskReadonly || editTaskWait" id="attempts" type="text" v-model="openTask.remainingAttempts" />
              </div>
              <div class="p-field mt-4">
                <label for="priority">Priority</label>
                <InputNumber :disabled="openTaskReadonly || editTaskWait" id="priority" type="text" v-model="openTask.priority" />
              </div>
              <div class="p-field mt-4">
                <label for="delay">Run After</label>
                <InputText :disabled="openTaskReadonly || editTaskWait" id="delay" type="text" v-model="openTask.runAfter" />
              </div>
              <div class="p-field mt-4">
                <label for="progressWeight">Progress Weight</label>
                <InputNumber :disabled="openTaskReadonly || editTaskWait" id="progressWeight" type="text" v-model="openTask.progressWeight" />
              </div>
              <div class="p-field mt-4">
                <label for="errorDelayInSeconds">Error Delay (Seconds)</label>
                <InputNumber :disabled="openTaskReadonly || editTaskWait" id="errorDelayInSeconds" type="text" v-model="openTask.errorDelayInSeconds" />
              </div>
              <div class="p-field mt-4">
                <label for="parentIds">Parent Ids (Comma Separated)</label>
                <InputText :disabled="openTaskReadonly || editTaskWait" id="parentIds" type="text" v-model="openTask.parentIdsStr" />
              </div>
            </div>
            <div class="p-fluid col-6">
              <div class="grid">
                <div class="col-12">
                  <h2>Input</h2>
                  <div>
                    <vue3-json-editor
                      v-if="openTask"
                      v-model="openTask.input"
                      :mode="'code'"
                      :expandedOnStart="true"
                      @json-change="editTaskInputOnChange"
                      @has-error="editTaskInputOnError"
                    />
                    <Message v-if="editTaskInputError" severity="error" :closable="false">{{ editTaskInputError }}</Message>
                  </div>
                </div>
                <div v-if="openTaskReadonly" class="p-fluid col-12">
                  <h2>Output</h2>
                  <div v-if="openTask.output">
                    <Textarea :modelValue="JSON.stringify(openTask.output)" rows="5" cols="30" />
                  </div>
                  <div v-else>
                    No Output
                  </div>
                </div>
                <div v-if="openTaskReadonly" class="p-fluid col-12">
                  <h2>Errors</h2>
                  <div v-if="openTask.errors">
                    <Textarea :modelValue="JSON.stringify(openTask.errors)" rows="5" cols="30" />
                  </div>
                  <div v-else>
                    No Errors
                  </div>
                </div>
              </div>
            </div>
          </div>
          <Message v-if="editTaskError" severity="error" :closable="false">{{ editTaskError }}</Message>
          <template #footer>
            <Button label="Close" :disabled="editTaskWait" @click="showViewTaskDialog = null" />
            <Button v-if="!openTask.isComplete && openTask.remainingAttempts < 1" label="Retry" class="p-button-help" :disabled="retryTaskWait" @click="retryTask(openTask._id)" />
            <Button label="Reset" class="p-button-secondary" :disabled="resetTaskWait" @click="resetTask(openTask._id)" />
            <Button label="Pluck" class="p-button-warning" :disabled="pluckTaskWait" @click="pluckTask(openTask._id)" />
            <Button v-if="!openTaskReadonly" label="Save" class="p-button-primary" :disabled="editTaskWait || editTaskInputError || !openTask.name || !openTask.channel" @click="doSaveTask" />
          </template>
        </Dialog>

        <Dialog header="Add Task" v-model:visible="showAddDialog" >
          <div class="grid">
            <div class="p-fluid col-6">
              <div class="p-field">
                <label for="name">Name</label>
                <InputText autofocus :disabled="addWait" id="name" type="text" v-model="newTaskName" />
              </div>
              <div class="p-field mt-4">
                <label for="channel">Channel</label>
                <InputText :disabled="addWait" id="channel" type="text" v-model="newTaskChannel" />
              </div>
              <div class="p-field mt-4">
                <Checkbox v-model="newTaskIsSeed" :disabled="addWait" :binary="true" />
                <label> Is Seed</label>
              </div>
              <div class="p-field mt-4">
                <label for="workgroup">Workgroup</label>
                <InputText :disabled="addWait" id="workgroup" type="text" v-model="newTaskWorkgroup" />
              </div>
              <div class="p-field mt-4">
                <label for="key">Key</label>
                <InputText :disabled="addWait" id="key" type="text" v-model="newTaskKey" />
              </div>
              <div class="p-field mt-4">
                <label for="attempts">Attempts</label>
                <InputNumber :disabled="addWait" id="attempts" type="text" v-model="newTaskRemainingAttempts" />
              </div>
              <div class="p-field mt-4">
                <label for="priority">Priority</label>
                <InputNumber :disabled="addWait" id="priority" type="text" v-model="newTaskPriority" />
              </div>
              <div class="p-field mt-4">
                <label for="delay">Delay (Seconds)</label>
                <InputNumber :disabled="addWait" id="delay" type="text" v-model="newTaskDelayInSeconds" />
              </div>
              <div class="p-field mt-4">
                <label for="progressWeight">Progress Weight</label>
                <InputNumber :disabled="addWait" id="progressWeight" type="text" v-model="newTaskProgressWeight" />
              </div>
              <div class="p-field mt-4">
                <label for="errorDelayInSeconds">Error Delay (Seconds)</label>
                <InputNumber :disabled="addWait" id="errorDelayInSeconds" type="text" v-model="newTaskErrorDelayInSeconds" />
              </div>
              <div class="p-field mt-4">
                <label for="parentIds">Parent Ids (Comma Separated)</label>
                <InputText :disabled="addWait" id="parentIds" type="text" v-model="newTaskParentIds" />
              </div>
            </div>
            <div class="p-fluid col-6">
              <div class="p-field">
                <vue3-json-editor
                  v-model="newTaskInput"
                  mode="code"
                  :expandedOnStart="true"
                  @json-change="newTaskInputOnChange"
                  @has-error="newTaskInputOnError"
                />
              </div>
              <Message v-if="newTaskInputError" severity="error" :closable="false">{{ newTaskInputError }}</Message>
            </div>
          </div>
          <Message v-if="addError" severity="error" :closable="false">{{ addError }}</Message>
          <template #footer>
            <Button label="Cancel" :disabled="addWait" @click="showAddDialog = false" />
            <Button label="Add" class="p-button-success" :disabled="addWait || newTaskInputError || !newTaskName || !newTaskChannel" @click="addTask" />
          </template>
        </Dialog>
      </template>
    </Card>
  </section>
</template>

<style scoped>
.p-buttonset .p-button {
  margin-left: .5em
}
</style>

<script>
import axios from 'axios'
import _ from 'lodash'
import Message from 'primevue/message';
import ProgressSpinner from 'primevue/progressspinner'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import Button from 'primevue/button'
import Paginator from 'primevue/paginator'
import Dialog from 'primevue/dialog'
import InputText from 'primevue/inputtext'
import InputNumber from 'primevue/inputnumber'
import Checkbox from 'primevue/checkbox'
import Textarea from 'primevue/textarea'
import TaskStatusTag from '../components/TaskStatusTag.vue'
import ProgressBar from 'primevue/progressbar'
import Card from 'primevue/card'
import { Vue3JsonEditor } from 'vue3-json-editor'
import { DateTime } from 'luxon'
import { io } from 'socket.io-client'

import { mapStores } from "pinia"
import { useConfigStore } from "../stores/config"

export default {
  name: 'TaskGroup',
  components: { Card, Message, ProgressSpinner, DataTable, Column, Button, Paginator, Dialog, InputText, InputNumber, Checkbox, Vue3JsonEditor, Textarea, TaskStatusTag, ProgressBar },
  data () {
    return {
      loading: true,
      error: '',
      group: null,
      tasks: {},
      socket: null,
      showDeleteDialog: false,
      deleteWait: false,
      deleteError: '',
      showEditDialog: false,
      editWait: false,
      editError: '',
      editName: '',
      pauseResumeWait: false,
      showAddDialog: false,
      addWait: false,
      addError: '',
      newTaskName: '',
      newTaskChannel: '',
      newTaskWorkgroup: '',
      newTaskKey: '',
      newTaskRemainingAttempts: 2,
      newTaskPriority: 0,
      newTaskDelayInSeconds: null,
      newTaskProgressWeight:  1,
      newTaskErrorDelayInSeconds: 60,
      newTaskIsSeed: false,
      newTaskParentIds: '',
      newTaskInput: {},
      actualNewTaskInput: {},
      newTaskInputError: '',
      taskToDelete: null,
      deleteTaskError: '',
      deleteTaskWait: false,
      showResetDialog: false,
      resetError: '',
      resetWait: false,
      showRetryDialog: false,
      retryError: '',
      retryWait: false,
      retryRemainingAttempts: 2,
      showViewTaskDialog: false,
      openTask: null,
      openTaskReadonly : true,
      editTaskInputError: '',
      actualEditTaskInput: {},
      editTaskWait: false,
      editTaskError: '',
      showDeleteTaskDialog: false,
      taskRows: 100,
      retryTaskWait: false,
      resetTaskWait: false,
      pluckTaskWait: false,
      percentComplete: 0,
      showOnlyIncompleteTasks: false
    }
  },
  computed: {
    ...mapStores(useConfigStore),
    sortedTasks () {
      let tasks = _.values(this.tasks)
      if (this.showOnlyIncompleteTasks) {
        tasks = _.filter(tasks, (t) => { return !t.isComplete })
      }
      return _.orderBy(tasks, ['priority', 'createdAt'], ['desc', 'asc'])
    }
  },
  mounted () {
    this.loadTaskGroup()
  },
  beforeUnmount () {
    this.unWatchGroup()
  },
  watch: {
    group () {
      this.editName = this.group.name
    },
    '$route.params.group_id' () {
      this.unWatchGroup()
      if (this.$route.params.group_id) {
        this.loadTaskGroup()
      }
    },
    configReady () {
      this.loadTaskGroup()
    }
  },
  methods: {
    debouncedUpdatePercentComplete: _.throttle(function () {
      this.updatePercentComplete()
    }, 2000, { trailing: true }),
    updatePercentComplete () {
      let totalTasks = 0
      let completeTasks = 0
      for(const task of _.values(this.tasks)) {
        if (task.isComplete) {
          completeTasks++
        }
        totalTasks++
      }
      this.percentComplete = (completeTasks / totalTasks) * 100
    },
    truncateName (name) {
      return _.truncate(name, {length: 100})
    },
    async pluckTask (taskId) {
      this.pluckWait = true
      try {
        const response = await axios.post(`${this.configStore.apiBaseUrl}api/v1/task/${taskId}/pluck`)
        this.showViewTaskDialog = false
        this.$router.push('/task_group/' + response.data.taskGroupId)
      } catch (error) {
        if (_.has(error, 'response.data.message')) {
          this.$toast.add({severity:'error', summary: 'Pluck Task Error', detail: error.response.data.message, life: 8000})
        } else {
          this.$toast.add({severity:'error', summary: 'Pluck Task Error', detail: error.message, life: 8000})
        }
      } finally {
        this.pluckWait = false
      }
    },
    async retryTask (taskId) {
      this.retryTaskWait = true
      try {
        await axios.post(`${this.configStore.apiBaseUrl}api/v1/task/${taskId}/retry`, {
          remainingAttempts: 1
        })
        this.$toast.add({severity:'success', summary: 'Retry Task', detail: 'Task remaining attempts has been increased!', life: 5000})
      } catch (error) {
        if (_.has(error, 'response.data.message')) {
          this.$toast.add({severity:'error', summary: 'Retry Task Error', detail: error.response.data.message, life: 8000})
        } else {
          this.$toast.add({severity:'error', summary: 'Retry Task Error', detail: error.message, life: 8000})
        }
      } finally {
        this.retryTaskWait = false
      }
    },
    async resetTask (taskId) {
      this.resetTaskWait = true
      try {
        await axios.post(`${this.configStore.apiBaseUrl}api/v1/task/${taskId}/reset`, {
          remainingAttempts: 1
        })
        this.$toast.add({severity:'success', summary: 'Reset Task', detail: 'Task has been reset!', life: 5000})
        this.showViewTaskDialog = null
        this.showEditDialog = false
      } catch (error) {
        if (_.has(error, 'response.data.message')) {
          this.$toast.add({severity:'error', summary: 'Reset Task Error', detail: error.response.data.message, life: 8000})
        } else {
          this.$toast.add({severity:'error', summary: 'Reset Task Error', detail: error.message, life: 8000})
        }
      } finally {
        this.resetTaskWait = false
      }
    },
    async doSaveTask () {
      if (!this.openTaskReadonly) {
        this.editTaskWait = true
        this.editTaskError = ''
        try {
          const updates = {
            name: this.openTask.name,
            channel: this.openTask.channel,
            workgroup: this.openTask.workgroup || null,
            key: this.openTask.key || null,
            remainingAttempts: this.openTask.remainingAttempts,
            priority: this.openTask.priority || 0,
            progressWeight: this.openTask.progressWeight,
            errorDelayInSeconds: this.openTask.errorDelayInSeconds,
            isSeed: this.openTask.isSeed,
          }

          if (this.openTask.runAfter) {
            // Should be an ISO timestring!
            updates.runAfter = this.openTask.runAfter
          } else  {
            updates.runAfter = null
          }

          if (this.actualEditTaskInput) {
            updates.input = this.actualEditTaskInput
          } else {
            updates.input = null
          }

          if (this.openTask.parentIdsStr) {
            updates.parentIds = _.map(this.openTask.parentIdsStr.split(','), item => item.trim())
          } else {
            updates.parentIds = []
          }
          
          const response = await axios.put(`${this.configStore.apiBaseUrl}api/v1/task/${this.openTask._id}`, updates)
          this.tasks[response.data._id] = response.data
          this.openTask = this.tasks[response.data._id]
          this.showViewTaskDialog = null
        } catch (error) {
          if (_.has(error, 'response.data.message')) {
            this.editTaskError = error.response.data.message
          } else {
            this.editTaskError = error.message
          }
        } finally {
          this.editTaskWait = false
        }

      }
    },
    async doRetry () {
      this.retryWait = true
      this.retryError = ''
      try {
        if (this.retryRemainingAttempts < 1) {
          throw new Error('Attempts must be greater than zero!')
        }
        await axios.post(`${this.configStore.apiBaseUrl}api/v1/task_group/${this.group._id}/retry`, {
          remainingAttempts: this.retryRemainingAttempts
        })
        this.showRetryDialog = false
        this.retryRemainingAttempts = 2
        this.debouncedLoadTaskGroup()
      } catch (error) {
        if (_.has(error, 'response.data.message')) {
          this.retryError = error.response.data.message
        } else {
          this.retryError = error.message
        }
      } finally {
        this.retryWait = false
      }
    },
    async doReset () {
      this.resetWait = true
      this.resetError = ''
      try {
        await axios.post(`${this.configStore.apiBaseUrl}api/v1/task_group/${this.group._id}/reset`)
        this.showResetDialog = false
        this.debouncedLoadTaskGroup()
      } catch (error) {
        if (_.has(error, 'response.data.message')) {
          this.resetError = error.response.data.message
        } else {
          this.resetError = error.message
        }
      } finally {
        this.resetWait = false
      }
    },
    initViewTask (id, readonly) {
      if (this.tasks[id]) {
        const task = this.tasks[id]
        task.parentIdsStr = ''
        if (task.parentIds) {
          task.parentIdsStr = task.parentIds.join(',')
        }
        this.actualEditTaskInput = task.input
        this.openTaskReadonly = readonly
        this.openTask = task
        this.showViewTaskDialog = true
      }
    },
    initDeleteTask (id) {
      this.deleteTaskError = ''
      if (this.tasks[id]) {
        this.taskToDelete = this.tasks[id]
        this.showDeleteTaskDialog = true
      }
    },
    async doDeleteTask () {
      this.deleteTaskWait = true
      this.deleteTaskError = ''
      try {
        await axios.delete(`${this.configStore.apiBaseUrl}api/v1/task/${this.taskToDelete._id}`)
        delete this.tasks[this.taskToDelete._id]
        this.debouncedUpdatePercentComplete()
        this.taskToDelete = null
        this.showDeleteTaskDialog = false
      } catch (error) {
        if (_.has(error, 'response.data.message')) {
          this.deleteTaskError = error.response.data.message
        } else {
          this.deleteTaskError = error.message
        }
      } finally {
        this.deleteTaskWait = false
      }
    },
    async addTask () {
      this.addWait = true
      this.addError = ''
      try {
        if (!this.newTaskName) {
          throw new Error('Name is required!')
        }
        if (!this.newTaskChannel) {
          throw new Error('Channel is required!')
        }
        if (this.newTaskRemainingAttempts < 1) {
          throw new Error('Attempts must be greater than zero!')
        }
        const newTaskData = {
          name: this.newTaskName,
          channel: this.newTaskChannel,
          remainingAttempts: this.newTaskRemainingAttempts,
          priority: this.newTaskPriority,
          isSeed: this.newTaskIsSeed,
        }
        if (this.newTaskWorkgroup) {
          newTaskData.workgroup = this.newTaskWorkgroup
        }
        if (this.newTaskKey) {
          newTaskData.key = this.newTaskKey
        }
        if (this.newTaskDelayInSeconds) {
          newTaskData.runAfter = DateTime.now().plus({ seconds: this.newTaskDelayInSeconds }).toISO()
        }
        if (this.newTaskProgressWeight) {
          newTaskData.progressWeight = this.newTaskProgressWeight
        }
        if (this.newTaskErrorDelayInSeconds) {
          newTaskData.errorDeleayInSeconds = this.newTaskErrorDelayInSeconds
        }
        if (this.newTaskParentIds) {
          newTaskData.parentIds = _.map(this.newTaskParentIds.split(','), item => item.trim())
        }
        if (this.actualNewTaskInput) {
          newTaskData.input = this.actualNewTaskInput
        }

        const response = await axios.post(`${this.configStore.apiBaseUrl}api/v1/task_group/${this.group._id}/tasks`, newTaskData)
        this.tasks[response.data._id] = response.data
        this.showAddDialog = false
        this.resetNewTaskForm()
        this.debouncedUpdatePercentComplete()
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
    resetNewTaskForm () {
      this.newTaskName = ''
      this.newTaskChannel = ''
      this.newTaskWorkgroup = ''
      this.newTaskKey = ''
      this.newTaskRemainingAttempts = 2
      this.newTaskPriority = 0
      this.newTaskDelayInSeconds = null
      this.newTaskIsSeed = false
      this.newTaskParentIds = ''
      this.newTaskInput = {}
      this.actualNewTaskInput = {}
      this.newTaskInputError = ''
    },
    newTaskInputOnChange (value) {
      this.newTaskInputError = ''
      this.actualNewTaskInput = value
    },
    newTaskInputOnError (error) {
      this.newTaskInputError = error.message
    },
    editTaskInputOnChange (value) {
      this.editTaskInputError = ''
      this.actualEditTaskInput = value
    },
    editTaskInputOnError (error) {
      this.editTaskInputError = error.message
    },
    async pause () {
      this.pauseResumeWait = true
      try {
        await axios.post(`${this.configStore.apiBaseUrl}api/v1/task_group/${this.group._id}/pause`)
        this.group.isPaused = true
      } catch (error) {
        if (_.has(error, 'response.data.message')) {
          this.$toast.add({severity:'error', summary: 'Pause Error', detail: error.response.data.message, life: 8000})
        } else {
          this.$toast.add({severity:'error', summary: 'Pause Error', detail: error.message, life: 8000})
        }
      } finally {
        this.pauseResumeWait = false
      }
    },
    async resume () {
      this.pauseResumeWait = true
      try {
        await axios.post(`${this.configStore.apiBaseUrl}api/v1/task_group/${this.group._id}/resume`)
        this.group.isPaused = false
      } catch (error) {
        if (_.has(error, 'response.data.message')) {
          this.$toast.add({severity:'error', summary: 'Resume Error', detail: error.response.data.message, life: 8000})
        } else {
          this.$toast.add({severity:'error', summary: 'Resume Error', detail: error.message, life: 8000})
        }
      } finally {
        this.pauseResumeWait = false
      }
    },
    async doEdit () {
      this.editWait = true
      this.editError = ''
      try {
        const response = await axios.put(`${this.configStore.apiBaseUrl}api/v1/task_group/${this.group._id}`, {
          name: this.editName
        })
        this.group = response.data
        this.showEditDialog = false
      } catch (error) {
        if (_.has(error, 'response.data.message')) {
          this.editError = error.response.data.message
        } else {
          this.editError = error.message
        }
      } finally {
        this.editWait = false
      }
    },
    async doDelete () {
      this.deleteWait = true
      this.deleteError = ''
      try {
        await axios.delete(`${this.configStore.apiBaseUrl}api/v1/task_group/${this.group._id}`)
        this.$router.replace('/')
      } catch (error) {
        if (_.has(error, 'response.data.message')) {
          this.deleteError = error.response.data.message
        } else {
          this.deleteError = error.message
        }
      } finally {
        this.deleteWait = false
      }
    },
    formatDate (iso) {
      return DateTime.fromISO(iso).toFormat('FF')
    },
    watchGroup () {
      this.socket = io(this.configStore.apiWsUrl)
      this.socket.on('connect', () => {
        this.socket.emit('watchTaskGroup', {
          taskGroupId: this.$route.params.group_id
        })
      })
      this.socket.on('task_group:update', (data) => {
        if (_.has(data, 'name')) {
          this.group.name = data.name
          this.editName = data.name
        }
        if (_.has(data, 'isPaused')) {
          this.group.isPaused = data.isPaused
        }
      })
      this.socket.on('task:create', (data) => {
        this.tasks[data._id] = data
        this.debouncedUpdatePercentComplete()
      })
      this.socket.on('task:update', (data) => {
        this.tasks[data._id] = data
        this.debouncedUpdatePercentComplete()
      })
      this.socket.on('task:delete', (data) => {
        delete this.tasks[data._id]
        this.debouncedUpdatePercentComplete()
      })
      this.socket.on('task:acquire:key', (data) => {
        for (const task of _.values(this.tasks)) {
          if (task.key === data.key && task.channel === data.channel) {
            task.assignedTo = data.update.assignedTo
            task.assignedAt = data.update.assignedAt
          }
        }
      })
      this.socket.on('task:release:key', (data) => {
        for (const task of _.values(this.tasks)) {
          if (task.key === data.key && task.channel === data.channel) {
            task.assignedTo = data.update.assignedTo
            task.assignedAt = data.update.assignedAt
            if (data.update.error) {
              task.errors.push(data.update.error)
            } else {
              task.output = data.update.output
            }
            task.isComplete = data.update.isComplete
            task.runAfter = data.update.runAfter
            task.remainingAttempts = data.update.remainingAttempts
          }
        }
        this.debouncedUpdatePercentComplete()
      })
      this.socket.on('workgroup:delay', (data) => {
        for (const task of _.values(this.tasks)) {
          if (task.workgroup && task.workgroup === data.workgroup) {
            task.runAfter = data.update.runAfter
          }
        }
      })
      this.socket.on('group:syncPause', (data) => {
        for(const task of _.values(this.tasks)) {
          task.isPaused = data.isPaused
        }
        this.group.isPaused = data.isPaused
      })
      this.socket.on('group:reset', (data) => {
        this.debouncedLoadTaskGroup()
      })
      this.socket.on('group:retry', (data) => {
        this.debouncedLoadTaskGroup()
      })
      this.socket.on('group:delete', (data) => {
        this.error = 'This task group has been deleted!'
        this.tasks = {}
      })
    },
    unWatchGroup () {
      if (this.socket) {
        this.socket.disconnect()
        this.socket = null
      }
    },
    debouncedLoadTaskGroup: _.debounce(function () {
      this.loadTaskGroup()
    }, 1100, { trailing: true }),
    async loadTaskGroup () {
      this.loading = true
      this.error = ''
      try {
        const groupResponse = await axios.get(`${this.configStore.apiBaseUrl}api/v1/task_group/${this.$route.params.group_id}`)
        this.group = groupResponse.data
        const tasksResponse = await axios.get(`${this.configStore.apiBaseUrl}api/v1/task_group/${this.$route.params.group_id}/tasks`)
        const newTasks = {}
        for (const task of tasksResponse.data) {
          newTasks[task._id] = task
        }
        this.tasks = newTasks
        this.debouncedUpdatePercentComplete()
        if (!this.socket) {
          this.watchGroup()
        }
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
