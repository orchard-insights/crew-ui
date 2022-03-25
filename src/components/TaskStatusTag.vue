<template>
  <span v-if="task">
    <span v-if="task.isComplete">
      <Tag v-if="task.errors && task.errors.length > 0" :value="task._id" severity="success" icon="pi pi-exclamation-triangle"></Tag>
      <Tag v-else :value="task._id" severity="success" icon="pi pi-check"></Tag>
    </span>
    <span v-else>
      <span v-if="task.assignedTo">
        <Tag :value="task._id" severity="info" icon="pi pi-spin pi-spinner"></Tag>
      </span>
      <span v-else>
        <span v-if="task.errors && task.errors.length > 0">
          <Tag v-if="task.remainingAttempts < 1" :value="task._id" severity="danger" icon="pi pi-exclamation-triangle"></Tag>
          <Tag v-else :value="task._id" severity="warning" icon="pi pi-exclamation-triangle"></Tag>
        </span>
        <span v-else>
          <Tag :value="task._id" severity="info" icon="pi pi-clock"></Tag>
        </span>
      </span>
    </span>
  </span>
</template>

<script>
import Tag from 'primevue/tag'

export default {
  name: 'TaskStatusTag',
  components: { Tag },
  props: {
    task: {
      type: Object,
      required: true
    }
  }
}
</script>