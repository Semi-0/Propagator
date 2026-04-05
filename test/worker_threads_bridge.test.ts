import { describe, test, expect, beforeEach } from "bun:test"
import { Worker } from "node:worker_threads"

import { construct_cell, update_cell, cell_strongest_base_value } from "@/cell/Cell"
import { the_nothing } from "@/cell/CellValue"
import { construct_propagator } from "../Propagator/Propagator"
import { execute_all_tasks_sequential } from "../Shared/Scheduler/Scheduler"
import { set_global_state, PublicStateCommand } from "../Shared/PublicState"
import { set_merge } from "@/cell/Merge"
import { merge_temporary_value_set } from "../DataTypes/TemporaryValueSet"

type SquareResp = { id: string; y: number }

beforeEach(() => {
  set_global_state(PublicStateCommand.CLEAN_UP)
  set_merge(merge_temporary_value_set)
})

describe("worker_threads bridge (cell message passing)", () => {
  test("worker result updates a cell and triggers downstream propagation", async () => {
    const input = construct_cell("input")
    const squared = construct_cell("squared")
    const plus1 = construct_cell("plus1")

    const workerUrl = new URL("./worker_square.ts", import.meta.url)
    const worker = new Worker(workerUrl, { type: "module" })

    let inflight: string | null = null

    const nextY = (): Promise<number> =>
      new Promise((resolve, reject) => {
        const onMsg = (m: SquareResp) => {
          if (m.id !== inflight) return
          inflight = null
          worker.off("message", onMsg)
          resolve(m.y)
        }
        worker.on("message", onMsg)
        worker.once("error", reject)
      })

    // Remote (worker-backed) propagator: when input is usable, send to worker.
    construct_propagator(
      [input],
      [squared],
      () => {
        const x = cell_strongest_base_value(input)
        if (x === the_nothing || typeof x !== "number") return
        if (inflight) return
        inflight = crypto.randomUUID()
        worker.postMessage({ id: inflight, x })
      },
      "p_worker_square"
    )

    // Downstream local propagator to prove cross-thread update triggers more work.
    construct_propagator(
      [squared],
      [plus1],
      () => {
        const y = cell_strongest_base_value(squared)
        if (y === the_nothing || typeof y !== "number") return
        update_cell(plus1, y + 1)
      },
      "p_plus1"
    )

    update_cell(input, 7)
    execute_all_tasks_sequential(console.error) // schedules worker job

    const y = await nextY()
    update_cell(squared, y) // deliver worker result into network
    execute_all_tasks_sequential(console.error) // propagate to plus1

    expect(cell_strongest_base_value(squared)).toBe(49)
    expect(cell_strongest_base_value(plus1)).toBe(50)

    worker.terminate()
  })
})

