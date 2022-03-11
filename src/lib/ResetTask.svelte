<script lang="ts">
  import { Modal, Button, InlineNotification, Loading, Form, FormGroup, NumberInput } from "carbon-components-svelte"
  import { onDestroy } from 'svelte'
  import axios from 'axios'
  import _ from 'lodash'
  import { config } from '../stores'
  import { Reset32 } from "carbon-icons-svelte"
  import { createEventDispatcher } from 'svelte'

	const dispatch = createEventDispatcher()
  
  export let task
  let open = false
  let busy = false
  let error = ''
  let apiBaseUrl = ''
  let attempts = 1

	const unsubscribeConfig = config.subscribe(value => {
		apiBaseUrl = value.apiBaseUrl;
	})

	onDestroy(() => {
    unsubscribeConfig()
  })

  async function resetTask () {
    busy = true
    error = ''
    try {
      if (attempts < 1) {
        throw new Error('Attempts must be greater than zero!')
      }
      await axios.post(`${apiBaseUrl}api/v1/task/${task._id}/reset`, {
        remainingAttempts: attempts
      })
      dispatch('reset', task)
      open = false
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

<Button icon={Reset32} on:click={() => (open = true)} kind="tertiary" size="small" iconDescription="Reset Task" />

<Modal
  bind:open
  modalHeading="Reset Task"
  primaryButtonText="Reset"
  secondaryButtonText="Cancel"
  on:click:button--secondary={() => (open = false)}
  on:open
  on:close
  on:submit={resetTask}
>
  <p>Reset this task?  All output and error information will be lost.</p>

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
