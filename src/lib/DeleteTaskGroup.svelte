<script lang="ts">
  import { Modal, Button, InlineNotification, Loading } from "carbon-components-svelte"
  import { navigate } from "svelte-navigator"
  import { onDestroy } from 'svelte'
  import axios from 'axios'
  import _ from 'lodash'
  import { config } from '../stores'
  import { TrashCan32 } from "carbon-icons-svelte"
  
  export let group
  let open = false
  let busy = false
  let error = ''
  let apiBaseUrl = ''

	const unsubscribeConfig = config.subscribe(value => {
		apiBaseUrl = value.apiBaseUrl;
	})

	onDestroy(() => {
    unsubscribeConfig()
  })

  async function deleteTaskGroup () {
    busy = true
    error = ''
    try {
      await axios.delete(`${apiBaseUrl}api/v1/task_group/${group._id}`)
      navigate('/')
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

<Button icon={TrashCan32} kind="danger" on:click={() => (open = true)} iconDescription="Delete" />

<Modal
  danger
  bind:open
  modalHeading="Delete Task Group"
  primaryButtonText="Delete"
  secondaryButtonText="Cancel"
  on:click:button--secondary={() => (open = false)}
  on:open
  on:close
  on:submit={deleteTaskGroup}
>
  <p>This task group and all the tasks that it contains will be permanently destroyed!</p>

  {#if error}
  <InlineNotification
    title="Error:"
    subtitle={error}
  />
  {/if}
</Modal>

{#if busy}
<Loading />
{/if}
