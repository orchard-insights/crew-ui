<script lang="ts">
  import { Modal, Button, InlineNotification, Loading, Form, FormGroup, TextInput } from "carbon-components-svelte"
  import { onDestroy } from 'svelte'
  import axios from 'axios'
  import _ from 'lodash'
  import { config } from '../stores'
  import { Edit32 } from "carbon-icons-svelte"
  import { createEventDispatcher } from 'svelte'

	const dispatch = createEventDispatcher()
  
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

  async function saveTaskGroup () {
    busy = true
    error = ''
    try {
      await axios.put(`${apiBaseUrl}api/v1/task_group/${group._id}`, {
        name: group.name
      })
      dispatch('save', group)
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

<Button icon={Edit32} on:click={() => (open = true)} iconDescription="Edit" />

<Modal
  bind:open
  modalHeading="Edit Task Group"
  primaryButtonText="Save"
  secondaryButtonText="Cancel"
  on:click:button--secondary={() => (open = false)}
  on:open
  on:close
  on:submit={saveTaskGroup}
>
  <Form>
    <FormGroup>
      <TextInput bind:value={group.name} labelText="Name" placeholder="Task group name..." />
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
