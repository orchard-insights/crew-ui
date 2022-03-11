<script lang="ts">
  import { Modal, Button, InlineNotification, Loading, Form, FormGroup, NumberInput } from "carbon-components-svelte"
  import { onDestroy } from 'svelte'
  import axios from 'axios'
  import _ from 'lodash'
  import { config } from '../stores'
  import { RetryFailed32 } from "carbon-icons-svelte"
  import { createEventDispatcher } from 'svelte'

	const dispatch = createEventDispatcher()
  
  export let group
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

  async function retryTaskGroup () {
    busy = true
    error = ''
    try {
      if (attempts < 1) {
        throw new Error('Attempts must be greater than zero!')
      }
      await axios.post(`${apiBaseUrl}api/v1/task_group/${group._id}/retry`, {
        remainingAttempts: attempts
      })
      dispatch('retry', group)
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

<Button icon={RetryFailed32} on:click={() => (open = true)} kind="tertiary" iconDescription="Retry Failed Tasks" />

<Modal
  bind:open
  modalHeading="Retry Failed Tasks"
  primaryButtonText="Retry"
  secondaryButtonText="Cancel"
  on:click:button--secondary={() => (open = false)}
  on:open
  on:close
  on:submit={retryTaskGroup}
>
  <Form>
    <FormGroup>
      <NumberInput bind:value={attempts} label="Attempts" />
    </FormGroup>
  </Form>

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
