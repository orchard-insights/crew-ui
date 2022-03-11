<script lang="ts">
  import { Modal, Button, InlineNotification, Loading } from "carbon-components-svelte"
  import { navigate } from "svelte-navigator"
  import { onDestroy } from 'svelte'
  import axios from 'axios'
  import _ from 'lodash'
  import { config } from '../stores'
  import { Replicate32 } from "carbon-icons-svelte"
  
  export let task
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

  async function pluckTask () {
    busy = true
    error = ''
    try {
      const response = await axios.post(`${apiBaseUrl}api/v1/task/${task._id}/pluck`)
      open = false
      navigate('/task_group/' + response.data.taskGroupId)
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

<Button icon={Replicate32} on:click={() => (open = true)} kind="tertiary" size="small" iconDescription="Pluck Task" />

<Modal
  bind:open
  modalHeading="Pluck Task"
  primaryButtonText="Pluck"
  secondaryButtonText="Cancel"
  on:click:button--secondary={() => (open = false)}
  on:open
  on:close
  on:submit={pluckTask}
>
  <p>Clone this task into a new task group?</p>

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
