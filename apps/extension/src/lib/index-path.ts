/**
 * Compute the index path from a root element to a descendant.
 *
 * The path is an array of child indices — each entry is the index of the
 * next child along the route from root to target. This path can be resolved
 * on a clone of the source tree to locate the corresponding element.
 *
 * @param root   - The ancestor element (start of the path).
 * @param target - The descendant element (end of the path).
 * @returns An array of child indices from root to target, or null if target
 *          is not a descendant of root.
 *
 * @public
 */
export function computeIndexPath(
  root: Element,
  target: Element
): number[] | null {
  if (root === target) {
    return [];
  }

  const path: number[] = [];
  let current: Element | null = target;

  while (current && current !== root) {
    const parent: Element | null = current.parentElement;
    if (!parent) {
      return null;
    }
    const children = Array.from(parent.children);
    const index = children.indexOf(current);
    path.unshift(index);
    current = parent;
  }

  return current === root ? path : null;
}

/**
 * Resolve an index path on a cloned element tree.
 *
 * Traverses the clone using the indices from {@link computeIndexPath} and
 * returns the element at the end of the path, or null if any step is
 * invalid.
 *
 * @param root - The root element of the cloned tree.
 * @param path - The index path produced by `computeIndexPath`.
 * @returns The resolved element, or null when the path is invalid.
 *
 * @public
 */
export function resolveIndexPath(
  root: Element,
  path: number[]
): Element | null {
  let current: Element = root;
  for (const index of path) {
    if (index < 0 || index >= current.children.length) {
      return null;
    }
    const child = current.children[index];
    if (!child) {
      return null;
    }
    current = child;
  }
  return current;
}
