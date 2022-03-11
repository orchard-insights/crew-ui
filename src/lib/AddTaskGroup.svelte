<script lang="ts">
  import { Modal, TextInput, Checkbox, Form, FormGroup, Loading, InlineNotification } from "carbon-components-svelte"
  import { navigate } from "svelte-navigator"
  import { onDestroy } from 'svelte'
  import axios from 'axios'
  import _ from 'lodash'
  import { config } from '../stores'
  export let open = false
  let busy = false
  let name = ''
  let isPaused = false
  let error = ''
  let apiBaseUrl = ''

	const unsubscribeConfig = config.subscribe(value => {
		apiBaseUrl = value.apiBaseUrl;
	})

	onDestroy(() => {
    unsubscribeConfig()
  })

  async function addTaskGroup () {
    busy = true
    error = ''
    try {
      if (!name) {
        throw new Error('Name is required!')
      }
      const response = await axios.post(`${apiBaseUrl}api/v1/task_groups`, {
        name: name,
        isPaused: isPaused
      })
      navigate('/task_group/' + response.data._id)
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

<Modal
  bind:open
  modalHeading="Add Task Group"
  primaryButtonText="Add"
  secondaryButtonText="Cancel"
  on:click:button--secondary={() => (open = false)}
  on:open
  on:close
  on:submit={addTaskGroup}
>
  <Form>
    <FormGroup>
      <TextInput bind:value={name} labelText="Name" placeholder="Task group name..." />
    </FormGroup>
    <FormGroup>
      <Checkbox bind:checked={isPaused} labelText="Paused" />
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