import { pathToFileURL } from "node:url";

export async function resolve(specifier, context, nextResolve) {
  if (specifier.startsWith("@/")) {
    const resolved = pathToFileURL(
      `${process.cwd()}/src/${specifier.slice(2)}`
    ).href;

    try {
      return await nextResolve(`${resolved}.ts`, context);
    } catch {
      return nextResolve(resolved, context);
    }
  }

  if (specifier.startsWith(".") && !specifier.match(/\.[cm]?[tj]sx?$/)) {
    try {
      return await nextResolve(`${specifier}.ts`, context);
    } catch {
      return nextResolve(specifier, context);
    }
  }

  return nextResolve(specifier, context);
}
