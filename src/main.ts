const socket = new WebSocket("ws://192.168.1.149:8080");

const elements = {
  roomIdInput: document.getElementById("roomId") as HTMLInputElement,
  joinBtn: document.getElementById("joinBtn")!,
  videoContainer: document.getElementById("video-container")!,
  localVideo: document.getElementById("localVideo") as HTMLVideoElement,
  remoteVideo: document.getElementById("remoteVideo") as HTMLVideoElement,
  chatBox: document.getElementById("chat-box")!,
  chatInput: document.getElementById("chatInput") as HTMLInputElement,
  sendBtn: document.getElementById("sendBtn")!,
};

let localStream: MediaStream;
let peerConnection: RTCPeerConnection | null = null;

elements.joinBtn.addEventListener("click", () => handleJoinRoom(elements.roomIdInput.value.trim()));
elements.sendBtn.addEventListener("click", handleSendMessage);

socket.onmessage = handleSocketMessage;

function handleSocketMessage(event: MessageEvent) {
  const data = JSON.parse(event.data);

  if (data.sdp) handleSDP(data.sdp);
  else if (data.ice) handleICE(data.ice);
  else if (data.message) displayMessage(data.message, "Другой участник");
}

function handleSDP(sdp: RTCSessionDescriptionInit) {
  peerConnection?.setRemoteDescription(new RTCSessionDescription(sdp));
  if (sdp.type === "offer") {
    peerConnection?.createAnswer().then((answer) => {
      peerConnection!.setLocalDescription(answer);
      socket.send(JSON.stringify({ sdp: answer }));
    });
  }
}

function handleICE(candidate: RTCIceCandidateInit) {
  peerConnection?.addIceCandidate(new RTCIceCandidate(candidate));
}

function handleJoinRoom(roomId: string) {
  if (!roomId) return;
  initPeerConnection(roomId);
  elements.videoContainer.style.display = "block";
}

async function initPeerConnection(roomId: string) {
  console.log(`Подключение к комнате с ID: ${roomId}`);

  if (!peerConnection) {
    const config = { iceServers: [{ urls: "stun:stun.l.google.com:19302" }] };
    peerConnection = new RTCPeerConnection(config);

    peerConnection.onicecandidate = (event) => {
      if (event.candidate) socket.send(JSON.stringify({ ice: event.candidate }));
    };

    peerConnection.ontrack = (event) => {
      elements.remoteVideo.srcObject = event.streams[0];
    };

    localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
    elements.localVideo.srcObject = localStream;
    localStream.getTracks().forEach((track) => peerConnection!.addTrack(track, localStream));
  }

  peerConnection.createOffer().then((offer) => {
    peerConnection!.setLocalDescription(offer);
    socket.send(JSON.stringify({ sdp: offer }));
  });
}

function handleSendMessage() {
  const message = elements.chatInput.value.trim();
  if (message) {
    displayMessage(message, "Вы");
    socket.send(JSON.stringify({ message }));
    elements.chatInput.value = "";
  }
}

function displayMessage(message: string, sender: string) {
  const messageElement = document.createElement("div");
  messageElement.textContent = `${sender}: ${message}`;
  elements.chatBox.appendChild(messageElement);
}
