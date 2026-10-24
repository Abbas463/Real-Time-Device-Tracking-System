const express = require('express')
const app = express()
const path = require('path')

const http = require('http')

const socketio = require('socket.io')
const server = http.createServer(app)
const io = socketio(server)
const activeLocations = new Map()

app.set('view engine', 'ejs')
app.use(express.static(path.join(__dirname, 'public')))

io.on('connection', function(socket) {
    console.log('Connected')

    socket.emit('connected-devices', Array.from(activeLocations, ([id, location]) => ({
        id,
        ...location
    })))

    socket.on('send-location', function(location) {
        const { latitude, longitude } = location || {}
        if (
            typeof latitude !== 'number' ||
            typeof longitude !== 'number' ||
            !Number.isFinite(latitude) ||
            !Number.isFinite(longitude) ||
            latitude < -90 ||
            latitude > 90 ||
            longitude < -180 ||
            longitude > 180
        ) {
            return
        }

        const deviceLocation = { latitude, longitude }
        activeLocations.set(socket.id, deviceLocation)
        socket.broadcast.emit('device-location', {
            id: socket.id,
            ...deviceLocation
        })
    })

    socket.on('disconnect', function() {
        activeLocations.delete(socket.id)
        socket.broadcast.emit('device-disconnected', socket.id)
    })
})

app.get('/', function (req, res) {
    res.render('index')
})

server.listen(3000)