const socket = io()

const locationStatus = document.getElementById('location-status')
const map = L.map('map', { zoomControl: true }).setView([0, 0], 2)
const peerMarkers = new Map()
let myMarker
let accuracyCircle
let myLocation
let hasCenteredOnLocation = false

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap contributors'
}).addTo(map)

const locationIcon = L.divIcon({
    className: 'location-marker',
    html: '<span></span>',
    iconSize: [22, 22],
    iconAnchor: [11, 11]
})

const locateControl = L.control({ position: 'topright' })
locateControl.onAdd = function () {
    const button = L.DomUtil.create('button', 'locate-control')
    button.type = 'button'
    button.title = 'Show my location'
    button.setAttribute('aria-label', 'Show my location')
    button.textContent = '◎'
    L.DomEvent.disableClickPropagation(button)
    L.DomEvent.on(button, 'click', () => {
        if (myLocation) {
            map.setView(myLocation, Math.max(map.getZoom(), 15))
        } else {
            locationStatus.textContent = 'Your location is not available yet.'
        }
    })
    return button
}
locateControl.addTo(map)

function updatePeerLocation(id, latitude, longitude) {
    if (id === socket.id) return

    const position = [latitude, longitude]
    let marker = peerMarkers.get(id)

    if (marker) {
        marker.setLatLng(position)
    } else {
        marker = L.marker(position, { icon: locationIcon })
            .bindPopup('Connected device')
            .addTo(map)
        peerMarkers.set(id, marker)
    }
}

socket.on('connected-devices', (devices) => {
    devices.forEach(({ id, latitude, longitude }) => {
        updatePeerLocation(id, latitude, longitude)
    })
})

socket.on('device-location', ({ id, latitude, longitude }) => {
    updatePeerLocation(id, latitude, longitude)
})

socket.on('device-disconnected', (id) => {
    const marker = peerMarkers.get(id)
    if (marker) {
        map.removeLayer(marker)
        peerMarkers.delete(id)
    }
})

socket.on('connect', () => {
    if (myLocation) {
        locationStatus.textContent = 'Location access granted. Sharing your live location.'
    }
})

socket.on('disconnect', () => {
    if (myLocation) {
        locationStatus.textContent = 'Map connection lost. Reconnecting...'
    }
})

if (!window.isSecureContext) {
    locationStatus.textContent = 'Location access requires HTTPS (or localhost). Open this app using a secure connection.'
} else if (navigator.geolocation) {
    locationStatus.textContent = 'Requesting location permission...'
    navigator.geolocation.watchPosition(
        (position) => {
            const { latitude, longitude, accuracy } = position.coords
            myLocation = [latitude, longitude]

            if (myMarker) {
                myMarker.setLatLng(myLocation)
                accuracyCircle.setLatLng(myLocation).setRadius(accuracy)
            } else {
                myMarker = L.marker(myLocation, { icon: locationIcon })
                    .bindPopup('Your location')
                    .addTo(map)
                accuracyCircle = L.circle(myLocation, {
                    radius: accuracy,
                    color: '#2563eb',
                    fillColor: '#3b82f6',
                    fillOpacity: 0.15,
                    weight: 1
                }).addTo(map)
            }

            if (!hasCenteredOnLocation) {
                map.setView(myLocation, 15)
                hasCenteredOnLocation = true
            }

            locationStatus.textContent = 'Location access granted. Sharing your live location.'
            socket.emit('send-location', { latitude, longitude })
        },
        (error) => {
            console.error(error)
            if (error.code === error.PERMISSION_DENIED) {
                locationStatus.textContent = 'Location permission was denied. Allow location access in your browser site settings and reload.'
            } else if (error.code === error.POSITION_UNAVAILABLE) {
                locationStatus.textContent = 'Your location is currently unavailable.'
            } else if (error.code === error.TIMEOUT) {
                locationStatus.textContent = 'Timed out while getting your location. Waiting to try again.'
            }
        },
        {
            enableHighAccuracy: true,
            timeout: 5000,
            maximumAge: 0
        }
    )
} else {
    locationStatus.textContent = 'Geolocation is not supported by this browser.'
}
