/**
 * Migration API: re-exports load_vector_clock_serializer_deserializer from sando-layer.
 * Prefer importing from "sando-layer/Specified/VectorClockLayer" directly (browser-safe).
 * This re-export exists for backward compatibility with code that imports from ppropogator.
 */
export { load_vector_clock_serializer_deserializer } from "sando-layer/Specified/VectorClockLayer"
