<script lang="ts">
  import { Modal, Button, InlineNotification, Loading, Form, FormGroup, TextInput, Checkbox, NumberInput } from "carbon-components-svelte"
  import { JSONEditor } from 'svelte-jsoneditor'
  import { onDestroy } from 'svelte'
  import axios from 'axios'
  import _ from 'lodash'
  import { config } from '../stores'
  import { Add32 } from "carbon-icons-svelte"
  import { DateTime } from 'luxon'
  import { createEventDispatcher } from 'svelte'

	const dispatch = createEventDispatcher()
  
  export let group
  let open = false
  let busy = false
  let error = ''
  let apiBaseUrl = ''

  let name = ''
  let channel = ''
  let isSeed = false
  let workgroup = ''
  let key = ''
  let remainingAttempts = 5
  let priority = 0
  let delayInSeconds = 0
  let progressWeight = 1
  let errorDelayInSeconds = 30
  let parentIds = ''
  let input = {
    text: undefined,
    json: {}
  }

	const unsubscribeConfig = config.subscribe(value => {
		apiBaseUrl = value.apiBaseUrl;
	})

	onDestroy(() => {
    unsubscribeConfig()
  })

  function reset () {
    name = ''
    channel = ''
    isSeed = false
    workgroup = ''
    key = ''
    remainingAttempts = 5
    priority = 0
    delayInSeconds = 0
    progressWeight = 1
    errorDelayInSeconds = 30
    parentIds = ''
    input = {
      text: undefined,
      json: {}
    }
  }

  async function addTask () {
    busy = true
    error = ''
    try {
      if (!name) {
        throw new Error('Name is required!')
      }
      if (!channel) {
        throw new Error('Channel is required!')
      }
      if (remainingAttempts < 1) {
        throw new Error('Attempts must be greater than zero!')
      }
      const newTaskData : any = {
        name: name,
        channel: channel,
        remainingAttempts: remainingAttempts,
        priority: priority,
        isSeed: isSeed,
      }
      if (workgroup) {
        newTaskData.workgroup = workgroup
      }
      if (key) {
        newTaskData.key = key
      }
      if (delayInSeconds) {
        newTaskData.runAfter = DateTime.now().plus({ seconds: delayInSeconds }).toISO()
      }
      if (progressWeight) {
        newTaskData.progressWeight = progressWeight
      }
      if (errorDelayInSeconds) {
        newTaskData.errorDelayInSeconds = errorDelayInSeconds
      }
      if (parentIds) {
        newTaskData.parentIds = _.map(parentIds.split(','), item => item.trim())
      }

      let inputData = input.json
      if (input.text) {
        inputData = JSON.parse(input.text)
      }
      if (inputData) {
        newTaskData.input = inputData
      }
      
      const response = await axios.post(`${apiBaseUrl}api/v1/task_group/${group._id}/tasks`, newTaskData)
      dispatch('newtask', response.data)
      open = false
      reset()
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

<Button icon={Add32} kind="primary" on:click={() => (open = true)} iconDescription="Add Task" />

<Modal
  bind:open
  modalHeading="Add Task"
  primaryButtonText="Add"
  secondaryButtonText="Cancel"
  on:click:button--secondary={() => (open = false)}
  on:open
  on:close
  on:submit={addTask}
>
  <Form>
    <FormGroup>
      <TextInput bind:value={name} labelText="Name" placeholder="Task name" />
    </FormGroup>
    <FormGroup>
      <TextInput bind:value={channel} labelText="Channel" placeholder="worker_a" />
    </FormGroup>
    <FormGroup>
      <Checkbox bind:checked={isSeed} labelText="Is Seed" />
    </FormGroup>
    <FormGroup>
      <TextInput bind:value={workgroup} labelText="Workgroup" placeholder="" />
    </FormGroup>
    <FormGroup>
      <TextInput bind:value={key} labelText="Key" placeholder="" />
    </FormGroup>
    <FormGroup>
      <NumberInput allowEmpty bind:value={remainingAttempts} label="Attempts" />
    </FormGroup>
    <FormGroup>
      <NumberInput allowEmpty bind:value={priority} label="Priority" />
    </FormGroup>
    <FormGroup>
      <NumberInput allowEmpty bind:value={delayInSeconds} label="Delay (seconds)" />
    </FormGroup>
    <FormGroup>
      <NumberInput allowEmpty bind:value={progressWeight} label="Progress Weight" />
    </FormGroup>
    <FormGroup>
      <NumberInput allowEmpty bind:value={errorDelayInSeconds} label="Delay After Error (seconds)" />
    </FormGroup>
    <FormGroup>
      <TextInput bind:value={parentIds} labelText="Parent Ids (comma separated)" placeholder="abc,def" />
    </FormGroup>
    <h5>Input:</h5>
    <JSONEditor mode="code" escapeControlCharacters={false} bind:content={input} />
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
