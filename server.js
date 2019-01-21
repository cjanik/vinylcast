const express = require("express")
const cors = require("cors")
const AudioRecorder = require("node-audiorecorder")
const generator = require("audio-generator")
const ip = require("ip")
const Client = require("castv2-client").Client
const DefaultMediaReceiver = require("castv2-client").DefaultMediaReceiver
const mdns = require("mdns")

const serviceIp = ip.address()
console.log(`running on: ${serviceIp}`)

function ondeviceup(host) {
  var client = new Client()

  client.connect(
    host,
    function() {
      console.log("connected, launching app ...")

      client.launch(DefaultMediaReceiver, function(err, player) {
        var media = {
          // Here you can plug an URL to any mp4, webm, mp3 or jpg file with the proper contentType.
          contentId: `http://${serviceIp}:3030/vinylcast`,
          //  "//commondatastorage.googleapis.com/gtv-videos-bucket/big_buck_bunny_1080p.mp4",
          contentType: "audio/wav",
          streamType: "LIVE", // BUFFERED / LIVE

          // Title and cover displayed while buffering
          metadata: {
            type: 0,
            metadataType: 0,
            title: "Big Buck Bunny",
            images: [
              {
                url:
                  "http://commondatastorage.googleapis.com/gtv-videos-bucket/sample/images/BigBuckBunny.jpg"
              }
            ]
          }
        }

        player.on("status", function(status) {
          console.log("status broadcast playerState=%s", status.playerState)
        })

        console.log(
          'app "%s" launched, loading media %s ...',
          player.session.displayName,
          media.contentId
        )

        player.load(media, { autoplay: true }, function(status) {
          console.log("media loaded playerState=%s", status.playerState)
        })
      })
    }
  )

  client.on("error", function(err) {
    console.log("Error: %s", err.message)
    client.close()
  })
}
const sequence = [
    mdns.rst.DNSServiceResolve(),
    'DNSServiceGetAddrInfo' in mdns.dns_sd ? mdns.rst.DNSServiceGetAddrInfo() : mdns.rst.getaddrinfo({families:[4]}),
    mdns.rst.makeAddressesUnique()
]

const browser = mdns.createBrowser(mdns.tcp("googlecast"), { resolverSequence: sequence })
const devices = []
browser.on("serviceUp", function(service) {
  console.log(`found cast device: ${service.txtRecord.fn}`)
  devices.push({ name: service.txtRecord.fn, address: service.addresses[0] })
  // ondeviceup(service.addresses[0])
  //  browser.stop()
})

browser.on("error", err => console.log(`browser error: ${err}`))
browser.start()
const app = express()

app.get("/list_devices",  (req, res, next) => {
  res.json(devices)
})

app.get("/select_device/:id", (req, res, next) => {
  ondeviceup(devices[req.params.id].address)
  browser.stop()
})
  
app.get("/vinylcast", cors(), (req, res, next) => {
  let src = generator(function(time) {
    return Math.sin(Math.PI * 2 * time * 440)
  })
  src.on("data", chunk => {
    console.log(chunk)
    res.write(chunk)
  })
  // const options = {
  //   program: `arecord`, // Which program to use, either `arecord`, `rec`, or `sox`.
  //   device: "hw:1,0", // Recording device to use.
  //   bits: 16, // Sample size. (only for `rec` and `sox`)
  //   channels: 1, // Channel count.
  //   format: `S16_LE`, // Encoding type. (only for `arecord`)
  //   rate: 44100, // Sample rate.
  //   type: `wav`, // Format type.
  // }

  // const logger = console

  // let audioRecorder = new AudioRecorder(options, logger)
})
app.listen(3030)
console.log("app listening on 3030")

