const socket = io()

const locationStatus = document.getElementById('location-status')
const map = L.map('map', { zoomControl: true }).setView([0, 0], 10)

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap contributors'
}).addTo(map)

if (!window.isSecureContext) {
    locationStatus.textContent = 'Location access requires HTTPS (or localhost). Open this app using a secure connection.'
} else if (navigator.geolocation) {
    locationStatus.textContent = 'Requesting location permission...'
    navigator.geolocation.watchPosition(
        (position) => {
            const { latitude, longitude } = position.coords
            locationStatus.textContent = 'Location access granted.'
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
