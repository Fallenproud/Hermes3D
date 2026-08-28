/**
 * Canonical task state public surface.
 *
 * Kept separate from the transport barrel so consumers can opt into state
 * semantics without coupling runtime event normalization to persistence.
 */

export * from "./taskState";
