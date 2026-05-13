import io from 'socket.io-client';

const socketUrl = import.meta.env.VITE_API_URL ? import.meta.env.VITE_API_URL.replace('/api', '') || '/' : 'http://localhost:9000';
const socket = io(socketUrl);

export default socket;
