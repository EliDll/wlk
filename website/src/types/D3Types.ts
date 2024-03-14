/* eslint-disable @typescript-eslint/no-explicit-any */
// Disable "any" warnings here as we cannot circumvent this in the type definitions coming from d3
import * as d3 from "d3";

//Type aliases for more readable code
export type D3Index = (number | undefined);

export type D3Node = d3.SimulationNodeDatum
export type D3Link = d3.SimulationLinkDatum<d3.SimulationNodeDatum>
export type D3CircleSelection = d3.Selection<SVGCircleElement, d3.SimulationNodeDatum, d3.BaseType, unknown>
export type D3TextSelection = d3.Selection<SVGTextElement, d3.SimulationNodeDatum, d3.BaseType, unknown>
export type D3LinkSelection = d3.Selection<SVGLineElement, d3.SimulationLinkDatum<d3.SimulationNodeDatum>, d3.BaseType, unknown>
export type D3ZoomSelection = d3.Selection<Element, unknown, HTMLElement, any>
export type D3Simulation = d3.Simulation<d3.SimulationNodeDatum, undefined>

export type D3GroupSelection = d3.Selection<SVGGElement, d3.SimulationNodeDatum, d3.BaseType, unknown>

export type NodeMultiSelection = {
    groups: D3GroupSelection,
    circles: D3CircleSelection,
    texts: D3TextSelection
}
