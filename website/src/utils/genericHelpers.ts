import { EdgeWithArticlesInfo } from "../types/bindings";
import { Point2D, AugmentedDTOEdge } from "../types/GraphTypes";

const clamp = (num: number, min: number, max: number) => Math.min(Math.max(num, min), max);

//Roughly clamp at filter sidepanel on the left, search sidepanel on the right
const clampHorizontal = (n: number) => clamp(n, window.innerWidth * 0.20, window.innerWidth - window.innerWidth * 0.35);
const clampVertical = (n: number) => clamp(n, window.innerHeight * 0.05, window.innerHeight - window.innerHeight * 0.05);

export const clampPoint = (p: Point2D) => {
  p.x = clampHorizontal(p.x);
  p.y = clampVertical(p.y);
}

export const getScrollBarSize = () => {
  return window.visualViewport && window.visualViewport.width < window.innerWidth ? window.innerWidth - window.visualViewport.width : 0;
}

export const openLink = (url: string) => { window.open(url, '_blank')?.focus(); }

export const augmentDTOEdge = (dtoEdges: EdgeWithArticlesInfo[]) => dtoEdges.map(dtoEdge => ({ ...dtoEdge, source: dtoEdge.source_id, target: dtoEdge.target_id } as AugmentedDTOEdge));

export const getCentralPoint = (source: Point2D, target: Point2D) => {
  const vec: Point2D = { x: target.x - source.x, y: target.y - source.y }
  const centerPoint: Point2D = { x: source.x + 0.5 * vec.x, y: source.y + 0.5 * vec.y }
  return centerPoint;
}

export const categoryKeyFromDisplayString = (str: string) => {
  return str === "Ohne Kategorie" ? "" : str
}

export const categoryKeyToDisplayString = (str: string) => {
  return str === "" ? "Ohne Kategorie" : str
}

export const disciplineKeyFromDisplayString = (str: string) => {
  return str === "Ohne Disziplin" ? "" : str
}

export const disciplineKeyToDisplayString = (str: string) => {
  return str === "" ? "Ohne Disziplin" : str
}