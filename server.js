const express = require("express")
const cors = require("cors")
const AudioRecorder = require("node-audiorecorder")
const ip = require("ip")
const Client = require("castv2-client").Client
const DefaultMediaReceiver = require("castv2-client").DefaultMediaReceiver
const mdns = require("mdns")

const serviceIp = ip.address()
console.log(`running on: ${serviceIp}`)

function castToDevice(host) {
  var client = new Client()

  client.connect(
    host,
    function() {
      console.log("connected, launching app ...")

      client.launch(DefaultMediaReceiver, function(err, player) {
        var media = {
          contentId: `http://${serviceIp}:3030/vinylcast`,
          contentType: "audio/wav",
          streamType: "LIVE", // BUFFERED / LIVE
          // Title and cover displayed while buffering
          metadata: {
            type: 0,
            metadataType: 0,
            title: "From the turntable"
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
          console.log(
            "media loaded playerState=%s",
            status && status.playerState
          )
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
  "DNSServiceGetAddrInfo" in mdns.dns_sd
    ? mdns.rst.DNSServiceGetAddrInfo()
    : mdns.rst.getaddrinfo({ families: [4] }),
  mdns.rst.makeAddressesUnique()
]

const browser = mdns.createBrowser(mdns.tcp("googlecast"), {
  resolverSequence: sequence
})
const devices = []
browser.on("serviceUp", function(service) {
  console.log(`found cast device: ${service.txtRecord.fn}`)
  devices.push({ name: service.txtRecord.fn, address: service.addresses[0] })
})

browser.on("error", err => console.log(`browser error: ${err}`))
browser.start()

const options = {
  program: `arecord`, // Which program to use, either `arecord`, `rec`, or `sox`.
  device: "hw:1,0", // Recording device to use.
  bits: 16, // Sample size. (only for `rec` and `sox`)
  channels: 2, // Channel count.
  format: `S16_LE`, // Encoding type. (only for `arecord`)
  rate: 44100, // Sample rate.
  type: `wav` // Format type.
}

const audioRecorder = new AudioRecorder(options, console)

const app = express()

app.get("/list_devices", (req, res, next) => {
  res.json(devices)
})

app.get("/select_device/:id", (req, res, next) => {
  audioRecorder.start()
  castToDevice(devices[req.params.id].address)
  browser.stop()
  res.send("starting")
})

app.get("/vinylcast", cors(), (req, res, next) => {
  audioRecorder.stream().on("data", chunk => res.write(chunk))
})
app.listen(3030)
console.log("app listening on 3030")
