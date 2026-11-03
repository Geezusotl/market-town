import path from "node:path";
export function isWithin(root, candidate, impl = path) {
  const relative = impl.relative(root, candidate);
  return (
    relative === "" ||
    (!impl.isAbsolute(relative) &&
      relative !== ".." &&
      !relative.startsWith(".." + impl.sep))
  );
}
