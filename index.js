const express = require('express');
require('dotenv').config()

const PORT = process.env.PORT || 5000
const app = express();
const http = require('http').createServer(app);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.set('view engine', 'ejs');
var expressLayouts = require('express-ejs-layouts');
app.use(expressLayouts);
app.use(express.static('public'))
var cors = require('cors')
app.use(cors());
const axios = require('axios');

// Utility methods
async function apiRequest(path, data = {}, method = 'post') {
  var url = `https://${process.env.SIGNALWIRE_SPACE}${path}`
  console.log(url)
  const res = await axios({
    method,
    url,
    data,
    auth: {
      username: process.env.SIGNALWIRE_PROJECT_KEY,
      password: process.env.SIGNALWIRE_TOKEN
    },
    validateStatus: () => true
  });
  
  return res;
}

async function getVideoToken(room_name, user_name, display_name) {
  var create_request = await apiRequest('/api/video/rooms', {name: room_name, display_name});
  var permissions = [
    'room.self.audio_mute',
    'room.self.audio_unmute',
    'room.self.video_mute',
    'room.self.video_unmute',
    'room.self.deaf',
    'room.self.undeaf',
    'room.self.set_input_volume',
    'room.self.set_output_volume',
    'room.self.set_input_sensitivity',
    'room.list_available_layouts',
    'room.set_layout',
    'room.member.video_mute',
    'room.member.audio_mute',
    'room.member.remove'
  ]
  var token_request = await apiRequest('/api/video/room_tokens', {room_name, user_name, permissions});
  return token_request.data.token
}

function getRandomInt(max) {
  return Math.floor(Math.random() * max);
}

async function getActiveRooms() {
  var output = [];
  var sessions = await apiRequest('/api/video/room_sessions', {}, 'get');

  for (let s of sessions.data.data) {
    if (s.status == 'in-progress') {
      var memberList = [];
      var members = await apiRequest(`/api/video/room_sessions/${s.id}/members`, {}, 'get');
      members.data.data.forEach((m) => {
        if (m.leave_time == null) {
          memberList.push(m.name);
        }
      });
      output.push({
        id: s.name,
        display_name: s.display_name,
        members: memberList
      });
    }
  }

  return output;
}

// SSE for alerts
var SSE = require('express-sse');
var sse = new SSE(['SignalWire SSE started']);
app.get('/stream', (req, res, next) => {
  res.flush = () => {}; 
  next();
}, sse.init);

async function sendEvent(payload) {
  console.log(payload);
  await sse.send(payload);
}

// SignalWire real time events
const createClient = require('@signalwire/realtime-api').createClient;
createClient({
  project: process.env.SIGNALWIRE_PROJECT_KEY,
  token: process.env.SIGNALWIRE_TOKEN
}).then(async (client) => {
  client.video.on('room.started', async (roomSession) => {
    sendEvent(await getActiveRooms());
  
    roomSession.on('member.joined', async (member) => {
      sendEvent(await getActiveRooms());
    })

    roomSession.on('member.left', async (member) => {
      sendEvent(await getActiveRooms());
    })
  
    await roomSession.subscribe()
  });

  client.video.on('room.ended', async (roomSession) => {
    sendEvent(await getActiveRooms());
  });

  client.connect()
});

app.get('/', async (req, res) => {
  var room = req.query.room || `room${getRandomInt(1000)}`;
  var user = req.query.user || `user${getRandomInt(1000)}`;
  var token = await getVideoToken(room, user, 'Room name: ' + room);
  res.render('index', { room, user, token })
});

app.get('/dashboard', async (req, res) => {
  var rooms = await getActiveRooms();
  console.log(rooms)
  res.render('dashboard', { rooms })
});

http.listen(PORT, '0.0.0.0', () => {
  console.log(`Listening to ${PORT}`);
});