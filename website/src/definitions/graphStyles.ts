import { D3CircleSelection, D3TextSelection, D3LinkSelection } from "../types/D3Types";
import { AugmentedDTOEdge } from "../types/GraphTypes";
import { RADIUS_ACTIVE_MULTIPLIER, RADIUS_HOVER_MULTIPLIER } from "./constants";

export type SVGNodeStyle = "default" | "active" | "background" | "hover";
export type SVGLinkStyle = "active" | "default";

export const circleStyleFunc = (radius: number, contrastColor: string) => {
    return function (selection: D3CircleSelection, style: SVGNodeStyle) {
        switch (style) {
            case "hover":
                selection
                    .attr('r', radius * RADIUS_HOVER_MULTIPLIER)
                    .attr('opacity', 1)
                    .style("stroke", contrastColor)
                    .style("stroke-width", 2)
                    .style("cursor", "hand")
                break;
            case "active":
                selection
                    .attr('r', radius * RADIUS_ACTIVE_MULTIPLIER)
                    .attr('opacity', 1)
                    .style("stroke", contrastColor)
                    .style("stroke-width", 2)
                    .style("cursor", "hand")
                break;
            case "default":
                selection
                    .attr('r', radius)
                    .attr('opacity', 1)
                    .style("stroke", "transparent")
                break;
            case "background":
                selection
                    .attr('r', radius)
                    .attr('opacity', 0.5)
                    .style("stroke", "transparent")
                break;
        }
    }
}

export const textStyleFunc = (radius: number) => {
    return function (selection: D3TextSelection, style: SVGNodeStyle) {
        const circleDiameter = radius * 2;
        switch (style) {
            case "hover":
                selection
                    .attr('textLength', circleDiameter * 0.9 * RADIUS_HOVER_MULTIPLIER)
                    .attr('dx', -circleDiameter * 0.125 * RADIUS_HOVER_MULTIPLIER)
                    .attr('opacity', 1)
                    .style("cursor", "hand");
                break;
            case "active":
                selection
                    .attr('textLength', circleDiameter * 0.9 * RADIUS_ACTIVE_MULTIPLIER)
                    .attr('dx', -circleDiameter * 0.05 * RADIUS_ACTIVE_MULTIPLIER)
                    .attr('opacity', 1)
                    .style("cursor", "hand")
                break;
            case "default":
                selection
                    .attr('textLength', circleDiameter)
                    .attr('opacity', 1)
                    .attr('dx', 0)
                break;
            case "background":
                selection
                    .attr('textLength', circleDiameter)
                    .attr('opacity', 0.3)
                    .attr('dx', 0)
                break;
        }
    }
}

export const lineStyleFunc = (contrastColor: string) => {
    return function (selection: D3LinkSelection, style: SVGLinkStyle) {
        switch (style) {
            case "active":
                selection
                    .attr('stroke', contrastColor)
                    .attr("opacity", 1)
                    .attr("stroke-width", link => (link as AugmentedDTOEdge).articles.length + 1)
                break;
            case "default":
                selection
                    .attr('stroke', contrastColor)
                    .attr("opacity", contrastColor === "white" ? 0.1 : 0.05)
                    .attr("stroke-width", link => (link as AugmentedDTOEdge).articles.length + 2)
                break;
        }
    }
}