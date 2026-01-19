import { createRouter, createWebHistory } from 'vue-router';
import Home from '../views/Home.vue';
import CreateRoom from '../views/CreateRoom.vue';
import RoomDetail from '../views/RoomDetail.vue';
import RoomsList from '../views/RoomsList.vue';

const routes = [
  {
    path: '/',
    name: 'Home',
    component: Home
  },
  {
    path: '/create',
    name: 'CreateRoom',
    component: CreateRoom
  },
  {
    path: '/room/:address',
    name: 'RoomDetail',
    component: RoomDetail
  },
  {
    path: '/rooms',
    name: 'RoomsList',
    component: RoomsList
  }
];

const router = createRouter({
  history: createWebHistory(),
  routes
});

export default router;
