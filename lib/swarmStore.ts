import { SwarmNode } from "./types";
const globalStore = globalThis as unknown as { __swarmNodes?: Map<string, SwarmNode> };
export const swarmNodes = globalStore.__swarmNodes ?? new Map<string, SwarmNode>();
globalStore.__swarmNodes = swarmNodes;
export function saveSwarmNode(node: SwarmNode) {
  swarmNodes.set(node.sessionId, node);
  // Bound completed history without removing running jobs.
  if (swarmNodes.size > 100) {
    for (const [id, old] of swarmNodes) {
      if (old.ended) swarmNodes.delete(id);
      if (swarmNodes.size <= 100) break;
    }
  }
}
