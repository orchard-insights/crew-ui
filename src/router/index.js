import { createRouter, createWebHistory } from 'vue-router'
import TaskGroups from '../views/TaskGroups.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'task_groups',
      component: TaskGroups
    },
    {
      path: '/channels',
      name: 'channels',
      component: () => import('../views/Channels.vue')
    },
    {
      path: '/task_group/:group_id',
      name: 'task_group',
      component: () => import('../views/TaskGroup.vue')
    }
  ]
})

export default router
