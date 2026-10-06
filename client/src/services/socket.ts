import { io, Socket } from "socket.io-client";

let socket: Socket | null = null;

export function getSocket(): Socket {
  if (!socket) {
    socket = io({
      autoConnect: true,
      transports: ["websocket", "polling"],
    });
  }
  return socket;
}

export function joinStudentRoom(attemptId: string) {
  const s = getSocket();
  s.emit("student:join", { attemptId });
}

export function joinAdminMonitorRoom(assessmentId: string) {
  const s = getSocket();
  s.emit("admin:monitor:join", { assessmentId });
}
