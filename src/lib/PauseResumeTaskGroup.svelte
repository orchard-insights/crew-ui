<script lang="ts">
  import { Button, Modal } from "carbon-components-svelte"
  import { onDestroy } from 'svelte'
  import axios from 'axios'
  import _ from 'lodash'
  import { config } from '../stores'
  import { Pause32, Hourglass32, Play32 } from "carbon-icons-svelte"
  import { createEventDispatcher } from 'svelte'

	const dispatch = createEventDispatcher()
  
  export let group
  let busy = false
  let error = ''
  let apiBaseUrl = ''

  $: open = error != ''

	const unsubscribeConfig = config.subscribe(value => {
		apiBaseUrl = value.apiBaseUrl;
	})

	onDestroy(() => {
    unsubscribeConfig()
  })

  async function toggleTaskGroup () {
    busy = true
    error = ''
    try {
      if (group.isPaused) {
        await axios.post(`${apiBaseUrl}api/v1/task_group/${group._id}/resume`)
        group.isPaused = false
      } else {
        await axios.post(`${apiBaseUrl}api/v1/task_group/${group._id}/pause`)
        group.isPaused = true
      }
      dispatch('save', group)
    } catch (e) {
      console.error(e)
      if (_.has(e, 'response.data.message')) {
        error = e.response.data.message
      } else {
        error = e.message
      }
    } finally {
      busy = false
    }
  }
</script>

{#if group.isPaused}
<Button icon={busy ? Hourglass32 : Play32} disabled={busy} kind="tertiary" on:click={toggleTaskGroup} iconDescription="Resume" />
{:else}
<Button icon={busy ? Hourglass32 : Pause32} disabled={busy} kind="tertiary" on:click={toggleTaskGroup} iconDescription="Pause" />
{/if}

<Modal
  danger
  bind:open
  modalHeading="Error"
  primaryButtonText="Confirm"
  on:close
  on:click:button--primary={() => (error = '')}
>
  <p>{error}</p>
</Modal>
