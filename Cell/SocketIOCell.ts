import { Socket } from "net";
import { make_relation } from "../DataTypes/Relation";
import { get_global_parent } from "../Shared/PublicState";
import { scheduled_reactive_state } from "../Shared/Reactivity/Scheduler";
import { the_nothing } from "./CellValue";
import { pipe } from "fp-ts/lib/function";

