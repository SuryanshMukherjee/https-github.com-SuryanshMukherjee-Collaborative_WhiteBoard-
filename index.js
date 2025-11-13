let express = require('express');
let app = express();
let httpServer = require('http').createServer(app);
let io = require('socket.io')(httpServer);

app.use(express.static("public"));

io.on("connect", (socket) => {
  console.log(`${socket.id} connected`);

  socket.on("draw", (data) => socket.broadcast.emit("ondraw", data));
  socket.on("down", (data) => socket.broadcast.emit("ondown", data));

  socket.on("clear", () => {
    socket.broadcast.emit("clearBoard");
  });
  socket.on("moveCanvas", (data) => {
  socket.broadcast.emit("onMoveCanvas", data);
});
  socket.on("shapeDraw", (data) => {
  socket.broadcast.emit("onShapeDraw", data);
});


  socket.on("disconnect", () => console.log(`${socket.id} disconnected`));
});

let PORT = process.env.PORT || 8080;
httpServer.listen(PORT, () => console.log(`Server running on port ${PORT}`));
