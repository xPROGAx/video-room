const WebSocket = require("ws");
const wss = new WebSocket.Server({ host: '192.168.1.149', port: 8080 });

wss.on("connection", (ws) => {
  ws.on("message", (message) => {
    wss.clients.forEach((client) => {
      if (client !== ws && client.readyState === WebSocket.OPEN) {
        client.send(message);
      }
    });
  });
});

console.log("WebSocket сервер запущен на ws://192.168.1.149:8080");
