import { is_unusable_value } from "@/cell/CellValue";
import { update_cell, type Cell } from "@/cell/Cell";
import { construct_propagator, type Propagator } from "../../../Propagator/Propagator";
import type { DiffMessage, VersionedCollection } from "./messagesTrace";
import { is_diff_message, is_diff_trace, is_frontier_message, vc_records } from "./messagesTrace";

export interface TraceCursor {
  readonly offset: number;
}

export const initial_trace_cursor = (): TraceCursor => ({ offset: 0 });

export const read_messages_since = <T>(
  value: any,
  cursor: TraceCursor,
): { readonly messages: readonly DiffMessage<T>[]; readonly cursor: TraceCursor } => {
  if (is_diff_trace(value)) {
    return { messages: value.messages.slice(cursor.offset), cursor: { offset: value.messages.length } };
  }
  if (is_diff_message(value) && cursor.offset === 0) {
    return { messages: [value], cursor: { offset: 1 } };
  }
  return { messages: [], cursor };
};

const non_empty_message = (message: DiffMessage<any>): boolean =>
  is_frontier_message(message) || vc_records(message as VersionedCollection<any>).length > 0;

const emit_messages = (output: Cell<any>, messages: readonly DiffMessage<any>[]): void => {
  for (const m of messages) if (non_empty_message(m)) update_cell(output, m);
};

export const make_diff_operator = <S, A, B>(
  name: string,
  init: () => S,
  step: (state: S, message: VersionedCollection<A>) => readonly DiffMessage<B>[],
) => (input: Cell<any>, output: Cell<any>): Propagator => {
  let cursor = initial_trace_cursor();
  const state = init();
  return construct_propagator([input], [output], () => {
    const read = read_messages_since<A>(input.getContent(), cursor);
    cursor = read.cursor;
    for (const message of read.messages) {
      if (is_unusable_value(message)) continue;
      if (is_frontier_message(message)) {
        update_cell(output, message);
        continue;
      }
      emit_messages(output, step(state, message as VersionedCollection<A>));
    }
  }, name);
};

export const make_diff_binary_operator = <S, L, R, O>(
  name: string,
  init: () => S,
  step: (state: S, message: DiffMessage<L | R>, side: "left" | "right") => readonly DiffMessage<O>[],
) => (left: Cell<any>, right: Cell<any>, output: Cell<any>): Propagator => {
  let leftCursor = initial_trace_cursor();
  let rightCursor = initial_trace_cursor();
  const state = init();

  const drain = (input: Cell<any>, side: "left" | "right") => {
    const cur = side === "left" ? leftCursor : rightCursor;
    const read = read_messages_since(input.getContent(), cur);
    if (side === "left") leftCursor = read.cursor;
    else rightCursor = read.cursor;
    for (const message of read.messages) {
      if (is_unusable_value(message)) continue;
      if (is_frontier_message(message)) {
        update_cell(output, message);
        continue;
      }
      emit_messages(output, step(state, message as DiffMessage<L | R>, side));
    }
  };

  return construct_propagator(
    [left, right],
    [output],
    () => {
      drain(left, "left");
      drain(right, "right");
    },
    name,
  );
};

