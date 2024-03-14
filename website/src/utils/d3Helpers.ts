import * as d3 from "d3";
import { SVG_CANVAS_ID } from "../definitions/constants";
import { D3CircleSelection, D3Index, D3Link, D3LinkSelection, D3Node, D3GroupSelection, D3TextSelection, NodeMultiSelection } from "../types/D3Types";

export const canvasSelector = () => d3.select(`#${SVG_CANVAS_ID}`);

export const SVGGroup = 'g';
export const SVGCircle = 'circle';
export const SVGLine = 'line';
export const SVGText = 'text';

const makeId = (prefix: string, id: D3Index) => `${prefix}-${id}`;
export const groupId = (id: D3Index) => makeId(SVGGroup, id);
export const circleId = (id: D3Index) => makeId(SVGCircle, id);
export const lineId = (id: D3Index) => makeId(SVGLine, id);
export const textId = (id: D3Index) => makeId(SVGText, id);

const idString = (prefix: string, id: D3Index) => (`#${prefix}-${id}`);
export const selectGroupById = (id: D3Index) => canvasSelector().select(idString(SVGGroup, id)) as D3GroupSelection;
export const selectCircleById = (id: D3Index) => canvasSelector().select(idString(SVGCircle, id)) as D3CircleSelection;
export const selectLineById = (id: D3Index) => canvasSelector().select(idString(SVGLine, id)) as D3LinkSelection;
export const selectTextById = (id: D3Index) => canvasSelector().select(idString(SVGText, id)) as D3TextSelection;

export const selectNodeMultiById = (id: D3Index) => {
    const result: NodeMultiSelection = {
        groups: selectGroupById(id),
        circles: selectCircleById(id),
        texts: selectTextById(id),
    }
    return result;
}

export const getConnectedLinks = (nodeIndex: D3Index) => {
    const links = canvasSelector().selectAll(SVGLine) as D3LinkSelection;
    return links.filter((l =>
        ((l as D3Link).source as D3Node).index === nodeIndex ||
        ((l as D3Link).target as D3Node).index === nodeIndex));
}

export const getNodeIndicesFromLinks = (links: D3LinkSelection) => {
    const targetNodeIndices: D3Index[] = []
    links.each(l => {
        const target = (l as D3Link).target as D3Node
        const source = (l as D3Link).source as D3Node
        if (!targetNodeIndices.includes(target.index)) targetNodeIndices.push(target.index);
        if (!targetNodeIndices.includes(source.index)) targetNodeIndices.push(source.index);
    })
    return targetNodeIndices;
}

export const getNodeGroups = (nodeIndices: D3Index[]) => {
    const groups = canvasSelector().selectAll(SVGGroup) as D3GroupSelection;
    return groups.filter(group => nodeIndices.includes((group as D3Node).index));
}

export const getNodeCircles = (nodeIndices: D3Index[]) => {
    const circes = canvasSelector().selectAll(SVGCircle) as D3CircleSelection;
    return circes.filter(circle => nodeIndices.includes((circle as D3Node).index));
}

export const getNodeTexts = (nodeIndices: D3Index[]) => {
    const texts = canvasSelector().selectAll(SVGText) as D3TextSelection;
    return texts.filter(text => nodeIndices.includes((text as D3Node).index));
}

export const getNodeMulti = (nodeIndices: D3Index[]) => {
    const result: NodeMultiSelection = {
        groups: getNodeGroups(nodeIndices),
        circles: getNodeCircles(nodeIndices),
        texts: getNodeTexts(nodeIndices),
    }
    return result;
}

export const showText = (visible: boolean) => canvasSelector().selectAll(SVGText).attr('visibility', visible ? 'visible' : 'hidden');

