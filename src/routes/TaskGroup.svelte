<script lang="ts">
  import { onMount, onDestroy } from 'svelte'
  import axios from 'axios'
  import { io } from 'socket.io-client'
  import _ from 'lodash'
  import { config } from '../stores'
  import {
    StructuredList,
    StructuredListHead,
    StructuredListRow,
    StructuredListCell,
    StructuredListBody,
    Loading,
    InlineNotification,
    Pagination,
    ProgressBar
  } from "carbon-components-svelte"
  import TaskStatusTag from '../lib/TaskStatusTag.svelte'
  import DeleteTaskGroup from '../lib/DeleteTaskGroup.svelte'
  import AddTask from '../lib/AddTask.svelte'
  import EditTaskGroup from '../lib/EditTaskGroup.svelte'
  import PauseResumeTaskGroup from '../lib/PauseResumeTaskGroup.svelte'
  import ResetTaskGroup from '../lib/ResetTaskGroup.svelte'
  import TaskDetail from '../lib/TaskDetail.svelte'
  import RetryTaskGroup from '../lib/RetryTaskGroup.svelte'
  import RetryTask from '../lib/RetryTask.svelte'
  import ResetTask from '../lib/ResetTask.svelte'
  import PluckTask from '../lib/PluckTask.svelte'

  export let groupId
  let loading = true
  let group = null
  let tasks = null
  let apiBaseUrl = ''
  let apiWsUrl = ''
  let error = ''
  let socket = null
  let pageSize = 10
  let page = 1
  let percentComplete = 0

  $: {
    console.log('groupId changed', groupId);
    fetchGroup()
    watchGroup()
  }

  // onMount(async () => {
  //   // ??? using $: above for this
  //   fetchGroup()
	// })

  const unsubscribeConfig = config.subscribe(value => {
		apiBaseUrl = value.apiBaseUrl
    apiWsUrl = value.apiWsUrl
	})

	onDestroy(() => {
    unsubscribeConfig()
    unWatchGroup()
  })

  $: taskCount = () => {
    return _.values(tasks).length
  }

  $: sortedAndPaginatedTasks = () => {
    if (!tasks) {
      return []
    }
    let sorted = _.orderBy(_.values(tasks), ['priority', 'createdAt'], ['desc', 'asc'])
    
    // Apply pagination
    let start = (page - 1) * pageSize
    let end = start + pageSize
    return sorted.slice(start, end)
  }

  async function fetchGroup () {
    loading = true
    error = ''
    try {
      const groupResponse = await axios.get(`${apiBaseUrl}api/v1/task_group/${groupId}`)
      group = groupResponse.data
      const tasksResponse = await axios.get(`${apiBaseUrl}api/v1/task_group/${groupId}/tasks`)
      const newTasks = {}
      for (const task of tasksResponse.data) {
        newTasks[task._id] = task
      }
      tasks = newTasks
      debouncedUpdatePercentComplete()
      if (!socket) {
        watchGroup()
      }
    } catch (error) {
      console.error(error)
      if (_.has(error, 'response.data.message')) {
        error = error.response.data.message
      } else {
        error = error.message
      }
    } finally {
      loading = false
    }
  }

  function pageUpdate (e) {
    page = e.detail.page
    pageSize = e.detail.pageSize
  }

  function onNewTask(event) {
    tasks[event.detail._id] = event.detail
  }

  function onSaveTask(event) {
    tasks[event.detail._id] = event.detail
  }

  function onSave(event) {
    group = event.detail
  }

  function onReset(event) {
    debouncedFetchGroup()
  }

  function onRetry(event) {
    debouncedFetchGroup()
  }

  let debouncedFetchGroup = _.debounce(function () {
    fetchGroup()
  }, 1100, { trailing: true }) 

  let debouncedUpdatePercentComplete = _.throttle(function () {
    updatePercentComplete()
  }, 2000, { trailing: true })

  function updatePercentComplete () {
    let totalTasks = 0
    let completeTasks = 0
    for(const task of _.values(tasks)) {
      if (task.isComplete) {
        completeTasks++
      }
      totalTasks++
    }
    percentComplete = (completeTasks / totalTasks) * 100
  }

  function unWatchGroup () {
    if (socket) {
      socket.disconnect()
      socket = null
    }
  }

  function watchGroup() {
    unWatchGroup()
    socket = io(apiWsUrl)
    socket.on('connect', () => {
      socket.emit('watchTaskGroup', {
        taskGroupId: groupId
      })
    })
    socket.on('task_group:update', (data) => {
      if (_.has(data, 'name')) {
        group.name = data.name
      }
      if (_.has(data, 'isPaused')) {
        group.isPaused = data.isPaused
      }
    })
    socket.on('task:create', (data) => {
      tasks[data._id] = data
      debouncedUpdatePercentComplete()
    })
    socket.on('task:update', (data) => {
      tasks[data._id] = data
      debouncedUpdatePercentComplete()
    })
    socket.on('task:delete', (data) => {
      delete tasks[data._id]
      debouncedUpdatePercentComplete()
    })
    socket.on('task:acquire:key', (data) => {
      for (const task of _.values(tasks)) {
        if (task.key === data.key && task.channel === data.channel) {
          task.assignedTo = data.update.assignedTo
          task.assignedAt = data.update.assignedAt
        }
      }
    })
    socket.on('task:release:key', (data) => {
      for (const task of _.values(tasks)) {
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
      debouncedUpdatePercentComplete()
    })
    socket.on('workgroup:delay', (data) => {
      for (const task of _.values(tasks)) {
        if (task.workgroup && task.workgroup === data.workgroup) {
          task.runAfter = data.update.runAfter
        }
      }
    })
    socket.on('group:syncPause', (data) => {
      for(const task of _.values(tasks)) {
        task.isPaused = data.isPaused
      }
      group.isPaused = data.isPaused
    })
    socket.on('group:reset', (data) => {
      debouncedFetchGroup()
    })
    socket.on('group:retry', (data) => {
      debouncedFetchGroup()
    })
    socket.on('group:delete', (data) => {
      error = 'This task group has been deleted!'
      tasks = {}
    })
  }
</script>

{#if loading}
<Loading />
{/if}

{#if group}
<h1>{ group.name }</h1>
{#if taskCount() > 0}
<ProgressBar
  value={percentComplete}
  labelText="Progress"
  helperText={(percentComplete).toFixed(2) + '%'}
/>
{/if}
{/if}

{#if error}
<InlineNotification
  title="Error:"
  subtitle={error}
/>
{/if}

{#if sortedAndPaginatedTasks().length === 0}
<InlineNotification
  kind="info"
  title="Hint:"
>
  <p>
    To add a demo task to this group:<br/>
    1) Use the Add Task button below to create a task with channel = "worker_c", and isSeed = True<br/>
    2) Then start the crew demo workers by running this command in a new terminal window: "orchard-crew work"
  </p>
</InlineNotification>
{/if}

{#if group}
<div style="margin-top: 20px; margin-bottom: 20px;">
<AddTask group={group} on:newtask={onNewTask} />
<EditTaskGroup group={group} on:save={onSave} />
<DeleteTaskGroup group={group} />
<PauseResumeTaskGroup group={group} on:save={onSave} />
<ResetTaskGroup group={group} on:reset={onReset} />
<RetryTaskGroup group={group} on:retry={onRetry} />
</div>
{/if}

{#if sortedAndPaginatedTasks().length > 0}
<StructuredList>
  <StructuredListHead>
    <StructuredListRow head>
      <StructuredListCell head>Id</StructuredListCell>
      <StructuredListCell head>Name</StructuredListCell>
      <StructuredListCell head>Channel</StructuredListCell>
      <StructuredListCell head>Parents</StructuredListCell>
      <StructuredListCell head>Remaining Attempts</StructuredListCell>
      <StructuredListCell head>Run After</StructuredListCell>
      <StructuredListCell head>Is Seed</StructuredListCell>
      <StructuredListCell head>Actions</StructuredListCell>
    </StructuredListRow>
  </StructuredListHead>
  <StructuredListBody>
    {#each sortedAndPaginatedTasks() as task}
    <StructuredListRow>
      <StructuredListCell>
        <TaskStatusTag task={task} />
      </StructuredListCell>
      <StructuredListCell>
        { task.name }
      </StructuredListCell>
      <StructuredListCell>
        { task.channel }
      </StructuredListCell>
      <StructuredListCell>
        {#if task.parentIds && task.parentIds.length > 0}
          {#each task.parentIds as parentId}
            <TaskStatusTag task={tasks[parentId]} />
          {/each}
        {/if}
      </StructuredListCell>
      <StructuredListCell>
        { task.remainingAttempts }
      </StructuredListCell>
      <StructuredListCell>
        {#if task.runAfter}
        { task.runAfter }
        {/if}
      </StructuredListCell>
      <StructuredListCell>
        { task.isSeed ? 'Yes' : 'No' }
      </StructuredListCell>
      <StructuredListCell>
        <TaskDetail task={task} on:save={onSaveTask} />
        <RetryTask task={task} on:retry={onSaveTask} />
        <ResetTask task={task} on:reset={onSaveTask} />
        <PluckTask task={task} />
      </StructuredListCell>
    </StructuredListRow>
    {/each}
  </StructuredListBody>
</StructuredList>
<Pagination totalItems={taskCount()} pageSizes={[10, 20, 50, 100]} pageSize={pageSize} page={page} on:update={pageUpdate} />
{/if}
