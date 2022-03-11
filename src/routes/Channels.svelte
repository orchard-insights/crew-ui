<script lang="ts">
  import { onMount, onDestroy } from 'svelte'
  import axios from 'axios'
  import _ from 'lodash'
  import { config } from '../stores'
  import {
    StructuredList,
    StructuredListHead,
    StructuredListRow,
    StructuredListCell,
    StructuredListBody,
    Loading,
    InlineNotification
  } from "carbon-components-svelte"

  let loading = true
  let channels = []
  let apiBaseUrl = ''
  let error = ''

  const unsubscribeConfig = config.subscribe(value => {
		apiBaseUrl = value.apiBaseUrl;
	})

	onDestroy(() => {
    unsubscribeConfig()
  })

  async function fetchChannels() {
    try {
      loading = true
      const response = await axios.get(`${apiBaseUrl}api/v1/channels`)
      channels = response.data
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
  
  onMount(async () => {
    fetchChannels()
	})
</script>

<h1>Channels</h1>

{#if error}
<InlineNotification
  title="Error:"
  subtitle={error}
/>
{/if}

{#if loading}
<Loading />
{/if}

<InlineNotification
  kind="info"
  title="Hint:"
  subtitle="This page lists all the channels that have tasks.  Create workers for each of these or nothing will get done!"
/>

<StructuredList>
  <StructuredListHead>
    <StructuredListRow head>
      <StructuredListCell head>Name</StructuredListCell>
      <StructuredListCell head>Total Tasks</StructuredListCell>
      <StructuredListCell head>Completed Tasks</StructuredListCell>
      <StructuredListCell head>Assigned Tasks</StructuredListCell>
    </StructuredListRow>
  </StructuredListHead>
  <StructuredListBody>
    {#each channels as channel}
    <StructuredListRow>
      <StructuredListCell>
        { channel.name }
      </StructuredListCell>
      <StructuredListCell>
        { channel.totalCount }
      </StructuredListCell>
      <StructuredListCell>
        { channel.completedCount }
      </StructuredListCell>
      <StructuredListCell>
        { channel.assignedCount }
      </StructuredListCell>
    </StructuredListRow>
    {/each}
  </StructuredListBody>
</StructuredList>