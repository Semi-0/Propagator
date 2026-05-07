import type { Cell } from "@/cell/Cell";
import { make_ce_arithmetical } from "../../../Propagator/Sugar";
import {
  p_diff_concat,
  p_diff_distinct,
  p_diff_filter,
  p_diff_map,
  p_diff_negate,
} from "./operators";

export const ce_diff_map = <A, B>(f: (record: A) => B) =>
  make_ce_arithmetical(p_diff_map(f), "ce_diff_map") as (input: Cell<any>) => Cell<any>;

export const ce_diff_filter = <T>(predicate: (record: T) => boolean) =>
  make_ce_arithmetical(p_diff_filter(predicate), "ce_diff_filter") as (input: Cell<any>) => Cell<any>;

export const ce_diff_negate = make_ce_arithmetical(p_diff_negate, "ce_diff_negate") as (
  input: Cell<any>,
) => Cell<any>;

export const ce_diff_distinct = make_ce_arithmetical(p_diff_distinct, "ce_diff_distinct") as (
  input: Cell<any>,
) => Cell<any>;

export const ce_diff_concat = make_ce_arithmetical(p_diff_concat, "ce_diff_concat") as (
  left: Cell<any>,
  right: Cell<any>,
) => Cell<any>;

