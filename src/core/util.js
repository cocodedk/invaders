// Two helpers every world module shares.

// Queue an event for main to drain: { type, tick, ...fields }. The core only ever pushes.
export function emit(world, type, fields) {
  world.events.push({ type, tick: world.tick, ...fields });
}

// Keep the items of `list` that pass `keep`, in order, in place (the array stays the same object).
export function prune(list, keep) {
  let n = 0;
  for (const item of list) if (keep(item)) list[n++] = item;
  list.length = n;
}
