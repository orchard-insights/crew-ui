<script lang="ts">
  import { Modal,
    Button,
    InlineNotification,
    Loading,
    Form,
    FormGroup,
    TextInput,
    Checkbox,
    NumberInput,
    DatePicker,
    DatePickerInput,
    TimePicker,
    TimePickerSelect,
    SelectItem} from "carbon-components-svelte"
  import { JSONEditor } from 'svelte-jsoneditor'
  import { onDestroy } from 'svelte'
  import axios from 'axios'
  import _ from 'lodash'
  import { config } from '../stores'
  import { Information32 } from "carbon-icons-svelte"
  import { DateTime } from 'luxon'
  import { createEventDispatcher } from 'svelte'

	const dispatch = createEventDispatcher()
  
  export let task
  let open = false
  let busy = false
  let error = ''
  let apiBaseUrl = ''

  let name = task.name
  let channel = task.channel
  let isSeed = task.isSeed
  let workgroup = task.workgroup
  let key = task.key
  let remainingAttempts = task.remainingAttempts
  let priority = task.priority
  let runAfterDate = ''
  let runAfterTime = ''
  let runAfterAmPm = ''
  let progressWeight = task.progressWeight
  let errorDelayInSeconds = task.errorDelayInSeconds
  let parentIds = task.parentIds.join(',')
  let input = {
    text: undefined,
    json: task.input || {}
  }
  let output = {
    text: undefined,
    json: task.output || {}
  }
  let errors = {
    text: undefined,
    json: task.errors || {}
  }

  if (task.runAfter) {
    let dt = DateTime.fromISO(task.runAfter)
    runAfterDate = dt.toFormat('MM/dd/yyyy') // '03/11/2022'
    runAfterTime = dt.toFormat('hh:mm') // '08:33'
    runAfterAmPm = dt.toFormat('a').toLowerCase() // 'am'
  }

	const unsubscribeConfig = config.subscribe(value => {
		apiBaseUrl = value.apiBaseUrl;
	})

	onDestroy(() => {
    unsubscribeConfig()
  })

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
      const updateTaskData : any = {
        name: name,
        channel: channel,
        remainingAttempts: remainingAttempts,
        priority: priority,
        isSeed: isSeed,
      }
      if (workgroup) {
        updateTaskData.workgroup = workgroup
      }
      if (key) {
        updateTaskData.key = key
      }
      if (runAfterDate && runAfterTime && runAfterAmPm) {
        const runAfterDT = DateTime.fromFormat(`${runAfterDate} ${runAfterTime} ${runAfterAmPm}`, 'MM/dd/yyyy hh:mm a')
        updateTaskData.runAfter = runAfterDT.toISO()
      }
      if (progressWeight) {
        updateTaskData.progressWeight = progressWeight
      }
      if (errorDelayInSeconds) {
        updateTaskData.errorDelayInSeconds = errorDelayInSeconds
      }
      if (parentIds) {
        updateTaskData.parentIds = _.map(parentIds.split(','), item => item.trim())
      } else {
        updateTaskData.parentIds = []
      }
      let inputData = input.json
      if (input.text) {
        inputData = JSON.parse(input.text)
      }
      if (inputData) {
        updateTaskData.input = inputData
      }
      
      const response = await axios.put(`${apiBaseUrl}api/v1/task/${task._id}`, updateTaskData)
      dispatch('save', response.data)
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

<Button icon={Information32} size="small" kind="primary" on:click={() => (open = true)} iconDescription="Task Detail" />

<Modal
  bind:open
  modalHeading="Task Detail"
  primaryButtonText="Save"
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
      <DatePicker bind:value={runAfterDate}>
        <DatePickerInput labelText="Date" placeholder="mm/dd/yyyy" />
        
        <TimePicker light labelText="Time" placeholder="hh:mm" bind:value={runAfterTime}>
          <TimePickerSelect bind:value={runAfterAmPm}>
            <SelectItem value="am" text="AM" />
            <SelectItem value="pm" text="PM" />
          </TimePickerSelect>
        </TimePicker>
      </DatePicker>
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
    <h5 style="margin-top: 20px;">Output:</h5>
    <JSONEditor mode="code" escapeControlCharacters={false} readOnly={true} bind:content={output} />
    <h5 style="margin-top: 20px;">Errors:</h5>
    <JSONEditor mode="code" escapeControlCharacters={false} readOnly={true} bind:content={errors} />
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
