<script lang="ts">
  import { onMount, onDestroy } from 'svelte'
  import axios from 'axios'
  import _ from 'lodash'
  import { config } from '../stores'
  import {
    Button,
    ButtonSet,
    StructuredList,
    StructuredListHead,
    StructuredListRow,
    StructuredListCell,
    StructuredListBody,
    Loading,
    Pagination,
    InlineNotification
  } from "carbon-components-svelte"
  import { Renew32, Add32 } from "carbon-icons-svelte"
  import AddTaskGroup from '../lib/AddTaskGroup.svelte'

  interface TaskGroupDef {
    _id?: string
    name: string
    isPaused: boolean
    createdAt: string
  }

  let loading = true
  let skip = 0
  let limit = 10
  let max = 0
  let groups : TaskGroupDef[] = []
  let apiBaseUrl = ''
  let showAddModal = false
  let error = ''

	const unsubscribeConfig = config.subscribe(value => {
		apiBaseUrl = value.apiBaseUrl;
	})

	onDestroy(() => {
    unsubscribeConfig()
  })

  async function fetchTaskGroups() {
    try {
      loading = true
      const countResponse = await axios.get(`${apiBaseUrl}api/v1/task_groups/count`)
      max = countResponse.data.count
      const response = await axios.get(`${apiBaseUrl}api/v1/task_groups?limit=${limit}&skip=${skip}`)
      groups = response.data
      loading = false
    } catch (e) {
      console.error(e)
      if (_.has(e, 'response.data.message')) {
        error = e.response.data.message
      } else {
        error = e.message
      }
    } finally {
      loading = false
    }
  }

  let page = 1
  function pageUpdate (e) {
    page = e.detail.page
    skip = (page - 1) * limit
    limit = e.detail.pageSize
    fetchTaskGroups()
  }

  onMount(async () => {
    fetchTaskGroups()
	})
</script>

<h1>Task Groups</h1>

{#if error}
<InlineNotification
  title="Error:"
  subtitle={error}
/>
{/if}

{#if loading}
<Loading />
{/if}

{#if groups.length === 0}
<InlineNotification
  kind="info"
  title="Hint:"
  subtitle="Welcome to Crew!  To get started use the + button below to add your first Task Group."
/>
{/if}

<StructuredList>
  <StructuredListHead>
    <StructuredListRow head>
      <StructuredListCell head>Id</StructuredListCell>
      <StructuredListCell head>Name</StructuredListCell>
      <StructuredListCell head>isPaused</StructuredListCell>
      <StructuredListCell head>createdAt</StructuredListCell>
    </StructuredListRow>
  </StructuredListHead>
  <StructuredListBody>
    {#each groups as group}
    <StructuredListRow>
      <StructuredListCell>
        <a href={'/task_group/' + group._id}>{ group._id }</a>
      </StructuredListCell>
      <StructuredListCell>
        <a href={'/task_group/' + group._id}>{ group.name }</a>
      </StructuredListCell>
      <StructuredListCell>
        { group.isPaused ? 'Yes' : 'No' }
      </StructuredListCell>
      <StructuredListCell>
        { group.createdAt }
      </StructuredListCell>
    </StructuredListRow>
    {/each}
  </StructuredListBody>
</StructuredList>
<Pagination totalItems={max} pageSizes={[10, 20, 50, 100]} pageSize={limit} page={page} on:update={pageUpdate} />

<ButtonSet>
  <Button icon={Renew32} on:click={fetchTaskGroups}>Refresh</Button>
  <Button icon={Add32} on:click={() => (showAddModal = true)} kind="secondary">Add</Button>
</ButtonSet>

<AddTaskGroup bind:open={showAddModal} />
