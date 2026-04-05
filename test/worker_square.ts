import { parentPort } from "node:worker_threads"

if (!parentPort) throw new Error("worker_square must be run as a worker thread")

parentPort.on("message", (msg: { id: string; x: number }) => {
  const { id, x } = msg
  parentPort!.postMessage({ id, y: x * x })
})

