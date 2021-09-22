import { createClient } from '@signalwire/realtime-api'

const client = await createClient({
  project: '<project-id>',
  token: '<project-token>'
})

client.video.on('room.started', async (roomSession) => {
  console.log("Room started")

  roomSession.on('member.joined', async (member) => {
    await member.videoMute()
  })

  await roomSession.subscribe()
});

await client.connect()