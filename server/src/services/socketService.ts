import { Server as SocketIOServer, Socket } from "socket.io";

let ioInstance: SocketIOServer | null = null;

export function setupSocketService(io: SocketIOServer) {
  ioInstance = io;

  io.on("connection", (socket: Socket) => {
    // 1. Student joins private attempt room
    socket.on("student:join", ({ attemptId }: { attemptId: string }) => {
      if (!attemptId) return;
      socket.join(`student:${attemptId}`);
    });

    // 2. Instructor joins live assessment monitoring room
    socket.on("admin:monitor:join", ({ assessmentId }: { assessmentId: string }) => {
      if (!assessmentId) return;
      socket.join(`admin:${assessmentId}`);
    });

    socket.on("disconnect", () => {
      // Cleanup
    });
  });
}

export function notifyAdminStudentProgress(assessmentId: string, payload: any) {
  if (!ioInstance) return;
  ioInstance.to(`admin:${assessmentId}`).emit("student:progress", payload);
}

export function notifyStudentSession(attemptId: string, event: string, payload: any) {
  if (!ioInstance) return;
  ioInstance.to(`student:${attemptId}`).emit(event, payload);
}
