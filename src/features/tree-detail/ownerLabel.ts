import type { Messages } from '../../i18n/messages.ts';
import type { Tree } from '../../types/tree.ts';

/** "you" for your own trees, otherwise the adder's public display name. */
export function ownerLabel(
  t: Messages,
  tree: Pick<Tree, 'ownerId' | 'ownerName'>,
  userId?: string,
) {
  if (userId && tree.ownerId === userId) return t.detail.you;
  return tree.ownerName || t.detail.someone;
}
