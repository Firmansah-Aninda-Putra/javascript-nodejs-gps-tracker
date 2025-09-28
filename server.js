// server.js
const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);

// Sajikan file statis yang ada di folder 'public'
app.use(express.static('public'));

// Route utama - kirim index.html pada akses root
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/public/index.html');
});

// Socket.io untuk komunikasi real-time
io.on('connection', (socket) => {
  console.log('Client terhubung.');

  // Menerima update lokasi ambulans
  socket.on('ambulanceLocation', (data) => {
    console.log('Update lokasi untuk', data.ambulanceId, ':', data);
    // Broadcast ke seluruh client lain (termasuk halaman tracking)
    socket.broadcast.emit('updateAmbulance', data);
  });

  socket.on('disconnect', () => {
    console.log('Client terputus.');
  });
});

// Jalankan server pada port 3000 (atau port yang telah disesuaikan)
const port = process.env.PORT || 3000;
http.listen(port, () => {
  console.log(`Server berjalan di port ${port}`);
});
