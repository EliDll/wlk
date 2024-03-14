import { Article, Category, Discipline, EdgeWithArticlesInfo, Node } from "./bindings"
import { D3Index } from "./D3Types"

export type GraphData = {
    nodes: Node[],
    edges: EdgeWithArticlesInfo[],
    categories: string[],
    disciplines: string[]
}

export type GraphMetadata = {
    nightmode: boolean
    showText: boolean
}

export type AugmentedDTOEdge = EdgeWithArticlesInfo & {
    source: string,
    target: string
}

export type DisciplineWithCount = Discipline & {
    count: number
}

export type CategoryWithCount = Category & {
    count: number
}

export type Point2D = {
    x: number,
    y: number
}

export type ViewTransform = {
    zoom: number,
    panX: number,
    panY: number
}

export type ActiveNodeData = {
    node: Node,
    position: Point2D
}

export type ActiveEdgeData = {
    edge: AugmentedDTOEdge,
    articles: Article[],
    position: Point2D,
    sourceColor: string,
    sourceIndex: D3Index,
    targetColor: string,
    targetIndex: D3Index,
    lineIndex: D3Index
}

export type InteractionMode = "focus" | "exploration";


