<script lang="ts">
  import { Tag } from "carbon-components-svelte"
  import type { TagProps } from "carbon-components-svelte/types/Tag/Tag.svelte"
  import {
    Checkmark16,
    Hourglass16,
    Misuse16,
    InProgressError16,
    InProgress16,
    CheckmarkOutlineError16
  } from "carbon-icons-svelte";

  export let task

  $: getTagIcon = () => {
    if (!task) { return CheckmarkOutlineError16 }
    if (task.isComplete) {
      if (task.errors && task.errors.length > 0) {
        return CheckmarkOutlineError16
      }
      return Checkmark16
    } else {
      if (task.assignedTo) {
        return Hourglass16
      }
      if (task.errors && task.errors.length > 0) {
        if (task.remainingAttempts < 1) {
          return Misuse16
        }
        return InProgressError16
      }
    }
    return InProgress16
  }

  $: getTagType = () => {
    if (!task) { return 'red' }
    if (task.isComplete) {
      return 'green'
    } else {
      if (task.assignedTo) {
        return 'blue'
      } else if (task.errors && task.errors.length > 0) {
        if (task.remainingAttempts < 1) {
          return 'red'
        }
        return 'purple'
      }
    }
    return 'gray'
  }
</script>

<Tag type={getTagType()} icon={getTagIcon()}>{ task ? task._id : '?' }</Tag>
