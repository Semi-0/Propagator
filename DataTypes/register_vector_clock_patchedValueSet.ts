import { register_vector_clock_patched_set } from "../AdvanceReactivity/vector_clock";
import { scan_for_patches, patch_join, patch_remove } from "./PatchedValueSet";

register_vector_clock_patched_set(scan_for_patches, patch_join, patch_remove);

