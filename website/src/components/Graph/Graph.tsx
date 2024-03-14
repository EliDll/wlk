import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Box } from '@mui/system';
import * as d3 from "d3";
import { debounce } from 'lodash';
import { Alert, Divider, Fade, List, Snackbar, SpeedDial, SpeedDialAction, Tooltip, Typography, useMediaQuery } from '@mui/material';
import { LibraryBooks } from '@mui/icons-material';
import { apiClient } from '../../App';
import { getCategoryColor } from '../../definitions/colors';
import { MIN_SCALE, MAX_SCALE, RADIUS_COLLISION_MULTIPLIER, RADIUS_ACTIVE_MULTIPLIER, Z_INDEX_GRAPH, SVG_CANVAS_ID, SVG_BACKGROUND_ID, Z_INDEX_UI, PAN_STEP, OVERVIEW_SCALE } from '../../definitions/constants';
import { circleStyleFunc, textStyleFunc, lineStyleFunc, SVGNodeStyle } from '../../definitions/graphStyles';
import { Article, EdgeWithArticlesInfo, Node } from '../../types/bindings';
import { D3LinkSelection, NodeMultiSelection, D3Node, D3Link, D3Simulation, D3ZoomSelection } from '../../types/D3Types';
import { GraphData, GraphMetadata, ViewTransform, ActiveNodeData, ActiveEdgeData, InteractionMode, AugmentedDTOEdge, Point2D } from '../../types/GraphTypes';
import { canvasSelector, SVGCircle, SVGText, SVGLine, showText, selectCircleById, selectTextById, selectLineById, lineId, SVGGroup, groupId, circleId, textId, getConnectedLinks, getNodeIndicesFromLinks, getNodeCircles, getNodeTexts, getNodeMulti, selectNodeMultiById } from '../../utils/d3Helpers';
import { augmentDTOEdge, getCentralPoint, clampPoint, getScrollBarSize, openLink } from '../../utils/genericHelpers';
import CanvasControls from './CanvasControls';
import { HoverCard } from '../StyledComponents';
import { renderEdgeArticleOverview, renderNodeArticleOverview } from '../ArticleOverviews';
import TouchRipple, { TouchRippleActions } from '@mui/material/ButtonBase/TouchRipple';
const zoom = d3.zoom().scaleExtent([MIN_SCALE, MAX_SCALE]).translateExtent([[0, 0], [window.innerWidth, window.innerHeight]]);

type GraphProps = {
  data: GraphData,
  metadata: GraphMetadata,
  highlightedNode?: Node,
  highlightedArticle?: Article
}

/**
 * D3 Graph component
 * @param data Data displayed
 * @param metadata Values used to manipulate the graph
 * 
 * @returns component : {JSX.Element}
 */
const Graph: React.FC<GraphProps> = (props) => {
  const widthLargerThan600 = useMediaQuery('(min-width:600px)')
  const widthLargerThan900 = useMediaQuery('(min-width:900px)')
  const widthLargerThan1200 = useMediaQuery('(min-width:1200px)')

  const articleRippleRef = React.useRef<TouchRippleActions>(null);
  const nodeRippleRef = React.useRef<TouchRippleActions>(null);

  const triggerArticleRipple = useCallback(((e: React.MouseEvent<HTMLDivElement, MouseEvent>) => {
    articleRippleRef.current?.start(e);
    setTimeout(() => articleRippleRef.current?.stop(e), 200);
  }), []);

  const triggerNodeRipple = useCallback(((e: unknown) => {
    const mouseEvent = e as React.MouseEvent<HTMLDivElement, MouseEvent>;
    nodeRippleRef.current?.start(mouseEvent);
    setTimeout(() => nodeRippleRef.current?.stop(mouseEvent), 200);
  }), []);

  const containerRef = useRef<SVGSVGElement>(null);
  const [_width, setWidth] = useState<number>(window.innerWidth);
  const [contrastColor, setContrastColor] = useState(props.metadata.nightmode ? "white" : "black");
  const [backgroundColor, setBackgroundColor] = useState(props.metadata.nightmode ? "black" : "white");
  const [currentTransform, setCurrentTransform] = useState<ViewTransform>({ zoom: 1, panX: 0, panY: 0 });

  const [snackbarOpen, setSnackbarOpen] = useState(false);

  const [activeNode, setActiveNode] = useState<ActiveNodeData | undefined>();
  const [activeEdges, setActiveEdges] = useState<ActiveEdgeData[]>([]);
  const [activeDialIndex, setActiveDialIndex] = useState<undefined | number>();
  const [showcasedDialIndex, setShowcasedDialIndex] = useState<undefined | number>();

  const [showcasedNode, setShowcasedNode] = useState<Node | undefined>();
  const [showcasedArticles, setShowcasedArticles] = useState<Article[] | undefined>();

  const [allLinksSelection, setAllLinksSelection] = useState<D3LinkSelection>();
  const [relevantLinkSelection, setRelevantLinkSelection] = useState<D3LinkSelection>();

  const [allNodesSelection, setAllNodesSelection] = useState<NodeMultiSelection>();
  const [relevantNodeSelection, setRelevantNodeSelection] = useState<NodeMultiSelection>();
  const [primaryNodeSelection, setPrimaryNodeSelection] = useState<NodeMultiSelection>();

  const [nodes, setNodes] = useState<D3Node[]>([]);
  const [links, setLinks] = useState<D3Link[]>([]);
  const [sim, setSim] = useState<D3Simulation>();

  const [interactionMode, setInteractionMode] = useState<InteractionMode>("focus");

  const radius = React.useMemo(() => {
    return widthLargerThan1200 ? 30 : (widthLargerThan900 ? 25 : (widthLargerThan600 ? 20 : 15));
  }, [widthLargerThan1200, widthLargerThan600, widthLargerThan900]);

  //Deepcopy incoming data to augment & load into d3
  const nodeDataCopy = React.useMemo<Node[]>(() => {
    const copy = JSON.parse(JSON.stringify(props.data.nodes)) as Node[];
    return copy;
  }, [props.data.nodes])
  const edgeDataCopy = React.useMemo<AugmentedDTOEdge[]>(() => {
    const copy = JSON.parse(JSON.stringify(props.data.edges)) as EdgeWithArticlesInfo[];
    const augmentedCopy = augmentDTOEdge(copy);
    return augmentedCopy;
  }, [props.data.edges])

  const applyCircleStyle = React.useCallback(circleStyleFunc(radius, contrastColor), [radius, contrastColor]);
  const applyTextStyle = React.useCallback(textStyleFunc(radius), [radius]);
  const applyLineStyle = React.useCallback(lineStyleFunc(contrastColor), [contrastColor]);

  const resetSVGStyles = React.useCallback((() => {
    if (allNodesSelection) {
      applyCircleStyle(allNodesSelection.circles, "default");
      applyTextStyle(allNodesSelection.texts, "default");
    }
    if (allLinksSelection) applyLineStyle(allLinksSelection, "default");
  }), [allLinksSelection, allNodesSelection, applyCircleStyle, applyLineStyle, applyTextStyle])

  const resetOverlays = React.useCallback((() => {
    setActiveNode(undefined);
    setActiveEdges([]);
  }), []);

  const resetShowcase = React.useCallback((() => {
    setShowcasedArticles(undefined);
    setShowcasedDialIndex(undefined);
    setShowcasedNode(undefined);
  }), []);

  const updateActiveEdgeArticles = React.useCallback((edgeSourceId: string, edgeTargetId: string, articles: Article[]) => {
    setActiveEdges(activeEdges.map((edgeData) => edgeData.edge.source_id === edgeSourceId && edgeData.edge.target_id === edgeTargetId ? { ...edgeData, articles: articles } : edgeData));
  }, [activeEdges]);

  const fetchEdgeArticles = React.useCallback(async (sourceId: string, targetId: string) => {
    const articles = await apiClient.query(["articles", { edge_source_id: sourceId, edge_target_id: targetId }]);
    const filteredArticles = props.data.disciplines.length === 0 ?
      articles
      :
      articles.filter(article => props.data.disciplines.includes(article.discipline_id));
    updateActiveEdgeArticles(sourceId, targetId, filteredArticles);
    return filteredArticles;
  }, [props.data.disciplines, updateActiveEdgeArticles]);

  const canvasToBottomRightOffset = React.useCallback((pos: Point2D) => {
    const centerX = window.innerWidth * 0.5;
    const centerY = window.innerHeight * 0.5;

    const correctedCenterX = centerX - currentTransform.panX;
    const correctedCenterY = centerY - currentTransform.panY;

    const centerOffsetX = (pos.x - centerX) * currentTransform.zoom;
    const centerOffsetY = (pos.y - centerY) * currentTransform.zoom;

    return { x: correctedCenterX - centerOffsetX, y: correctedCenterY - centerOffsetY };
  }, [currentTransform.panX, currentTransform.panY, currentTransform.zoom]);

  const handleTransform = useCallback(((e: any) => {
    // Currently, remove overlays on transform to avoid low framerate dragging of overlays.
    resetOverlays();
    setInteractionMode("exploration");

    canvasSelector().selectAll(SVGCircle).attr('transform', e.transform);
    canvasSelector().selectAll(SVGText).attr('transform', e.transform);
    canvasSelector().selectAll(SVGLine).attr('transform', e.transform);

    const zoom = e.transform.k;
    // x and y are defined as the offset from the topleft corner, not the canvas center!
    // Note that adding this correction factor shifts the x and y values to be (0,0) at the screen center
    const canvasShiftX = (zoom - 1) * window.innerWidth / 2;
    const canvasShiftY = (zoom - 1) * window.innerHeight / 2;
    // In order to correctly consider panning, we need the offset from the screen center
    const windowCenterOffsetX = (e.transform.x + canvasShiftX);
    const windowCenterOffsetY = (e.transform.y + canvasShiftY);

    setCurrentTransform({ zoom: zoom, panX: windowCenterOffsetX, panY: windowCenterOffsetY })
  }), [resetOverlays]);

  useEffect(() => {
    zoom.on('zoom', handleTransform);
  }, [handleTransform])

  // Debounce the rerendering of the SVG Canvas
  useEffect(() => {
    const handleResize = debounce(() => setWidth(containerRef.current?.clientWidth || window.innerWidth), 500);
    window.addEventListener('resize', handleResize);
    //Cleanup on unmount
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    sim?.restart().alpha(1); //restart with full force for nodes to rearrange properly
  }, [_width, sim])

  useEffect(() => {
    setContrastColor(props.metadata.nightmode ? "white" : "black")
    setBackgroundColor(props.metadata.nightmode ? "black" : "white")
  }, [props.metadata.nightmode])

  useLayoutEffect(() => {
    showText(props.metadata.showText);
  }, [props.metadata.showText, props.data]);

  useEffect(() => {
    if (props.highlightedNode) {
      zoom.scaleTo(canvasSelector() as D3ZoomSelection, OVERVIEW_SCALE)
      resetOverlays();
      setInteractionMode("exploration");
      const targetNode = nodes.find(node => (node as Node).name === props.highlightedNode?.name);
      if (targetNode) {
        if (allNodesSelection) {
          applyCircleStyle(allNodesSelection.circles, "background");
          applyTextStyle(allNodesSelection.texts, "background");
        }
        applyCircleStyle(selectCircleById(targetNode.index), "hover");
        applyTextStyle(selectTextById(targetNode.index), "hover");
        if (allLinksSelection) applyLineStyle(allLinksSelection, "default");
      } else {
        setSnackbarOpen(true);
      }
    }
  }, [applyCircleStyle, applyLineStyle, applyTextStyle, allLinksSelection, allNodesSelection, nodes, props.highlightedNode, resetOverlays]);

  useEffect(() => {
    if (props.highlightedArticle) {
      zoom.scaleTo(canvasSelector() as D3ZoomSelection, OVERVIEW_SCALE)
      setActiveNode(undefined);
      setInteractionMode("exploration");
      const targetLine = links.find(edge => (edge as AugmentedDTOEdge).source_id === props.highlightedArticle?.edge_source_id && (edge as AugmentedDTOEdge).target_id === props.highlightedArticle?.edge_target_id);
      const targetEdge = targetLine as AugmentedDTOEdge;
      if (targetLine && targetEdge) {
        const sourceNode = nodes.find(node => (node as Node).name === targetEdge.source_id);
        const targetNode = nodes.find(node => (node as Node).name === targetEdge.target_id);
        if (sourceNode && targetNode) {
          const edgeDatum: ActiveEdgeData = {
            edge: targetEdge,
            articles: [props.highlightedArticle],
            position: getCentralPoint(sourceNode as Point2D, targetNode as Point2D),
            sourceColor: getCategoryColor((sourceNode as Node).category_id),
            targetColor: getCategoryColor((targetNode as Node).category_id),
            sourceIndex: sourceNode.index,
            targetIndex: targetNode.index,
            lineIndex: targetLine.index
          }
          setActiveEdges([edgeDatum])
          if (allNodesSelection) {
            applyCircleStyle(allNodesSelection.circles, "background");
            applyTextStyle(allNodesSelection.texts, "background");
          }
          applyCircleStyle(selectCircleById(sourceNode.index), "active");
          applyCircleStyle(selectCircleById(targetNode.index), "active");
          applyTextStyle(selectTextById(sourceNode.index), "active");
          applyTextStyle(selectTextById(targetNode.index), "active");

          if (allLinksSelection) applyLineStyle(allLinksSelection, "default");
          applyLineStyle(selectLineById(targetLine.index), "active");
        }
      } else {
        setSnackbarOpen(true);
      }
    }
  }, [applyCircleStyle, applyLineStyle, applyTextStyle, allLinksSelection, links, allNodesSelection, nodes, props.highlightedArticle]);

  //Cleanup search result highlighting once 
  useEffect(() => {
    if (props.highlightedArticle === undefined && props.highlightedNode === undefined) {
      //Don't reset styles, keep as is but zoom back in
      resetShowcase();
      zoom.scaleTo(canvasSelector() as D3ZoomSelection, 1);
    }
  }, [props.highlightedArticle, props.highlightedNode, resetShowcase])

  //--------------------------------------------
  // D3 Setup
  //--------------------------------------------

  const defineSimulation = React.useCallback((nodes: D3Node[], links: D3Link[]) => {
    const linkForce = d3.forceLink()
      .id(node => (node as Node).name)
      .distance((e) => (e.source as Node).category_id === (e.target as Node).category_id ? window.innerHeight * 0.1 : window.innerHeight * 0.55)
      .strength((e) => (e.source as Node).category_id === (e.target as Node).category_id ? 2 : 1)

    //Create sim
    const sim = d3
      .forceSimulation().nodes(nodes)
      //Force of links between nodes
      .force('link', linkForce)
      .velocityDecay(0.95)
      // Initial expansion force pushing outwards
      .force('charge', d3.forceManyBody().strength(1))
      //Force pulling nodes back to the center, slightly offset to account for UI
      .force('center', d3.forceCenter((window.innerWidth * 0.4), (window.innerHeight * 0.5)))
      .force('collision', d3.forceCollide().radius(() => radius * RADIUS_COLLISION_MULTIPLIER))

    //Register data for link force
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    //@ts-ignore that the link force might be undefined (bc. no such force might be reistered in the sim)
    sim.force('link').links(links)

    return sim;
  }, [radius]);

  const populateCanvas = React.useCallback((nodes: D3Node[], links: D3Link[], sim: D3Simulation) => {
    canvasSelector().call(zoom as any).on("dblclick.zoom", null);

    const linkElements = canvasSelector()
      .selectAll(SVGLine)
      .data(links)
      .enter().append(SVGLine)
      .attr("id", link => lineId(link.index))
    applyLineStyle(linkElements, "default")

    const nodeGroups = canvasSelector()
      .selectAll(SVGGroup)
      .data(nodes)
      .enter().append(SVGGroup)
      .attr("id", node => groupId(node.index))

    const nodeCircleElements = nodeGroups.append(SVGCircle)
      .attr("id", node => circleId(node.index))
      .attr('r', radius)
      .attr('fill', node => getCategoryColor((node as Node).category_id))
    applyCircleStyle(nodeCircleElements, "default");

    const nodeTextElements = nodeGroups.append(SVGText)
      .text(node => (node as Node).name)
      .attr("id", node => textId(node.index))
      .attr('textLength', radius * 2)
      .attr('dy', 4)
      .attr('lengthAdjust', 'spacingAndGlyphs')
    applyTextStyle(nodeTextElements, "default");

    setAllLinksSelection(linkElements);
    setAllNodesSelection({ groups: nodeGroups, circles: nodeCircleElements, texts: nodeTextElements });

    //Define the simulation onTick behaviour
    const onTickEventHandler = () => {
      links.forEach(l => {
        clampPoint(l.source as Point2D);
        clampPoint(l.target as Point2D);
      });
      nodes.forEach(n => clampPoint(n as Point2D));

      nodeCircleElements
        .attr("cx", node => (node as Point2D).x)
        .attr("cy", node => (node as Point2D).y)
      nodeTextElements
        .attr("x", node => (node as Point2D).x - radius)
        .attr("y", node => (node as Point2D).y)
      linkElements
        .attr('x1', link => (link.source as Point2D).x)
        .attr('y1', link => (link.source as Point2D).y)
        .attr('x2', link => (link.target as Point2D).x)
        .attr('y2', link => (link.target as Point2D).y)
    }

    //Register handler
    sim.nodes(nodes).on('tick', onTickEventHandler);
    //Toggle text visibility
    showText(props.metadata.showText);

  }, [applyLineStyle, radius, applyCircleStyle, applyTextStyle, props.metadata.showText]);

  //Main simulation lifecycle
  useLayoutEffect(() => {
    resetOverlays();

    // Cast data into apropriate d3 types
    const nodes: D3Node[] = nodeDataCopy as D3Node[] || [];
    const links: D3Link[] = edgeDataCopy as D3Link[] || [];

    setNodes(nodes);
    setLinks(links);

    // Setup force simulation
    const sim = defineSimulation(nodes, links)
    // Register graphical Elements and link their position to sim
    populateCanvas(nodes, links, sim);

    setSim(sim);
    setInteractionMode("exploration"); // Change interaction mode back to explore once everything (sim etc.) is defined

    return () => {
      //Remove all current canvas elements so in the next simulation execution new SVG elements will be created,
      //instead of just overwriting the attributes of existing ones
      canvasSelector().selectAll(SVGGroup).remove();
      canvasSelector().selectAll(SVGLine).remove();
    }
    // Be careful with the dependency array here, as this determines when the sim rerenders!
  }, [defineSimulation, edgeDataCopy, nodeDataCopy, populateCanvas, resetOverlays]);

  //--------------------------------------------
  // Event Handling
  //--------------------------------------------

  const explorationEnter = React.useCallback((_e: unknown, currentNode: D3Node) => {
    //freeze simulation for node
    currentNode.fx = currentNode.x;
    currentNode.fy = currentNode.y;

    resetOverlays();

    const connectedLinks = getConnectedLinks(currentNode.index);
    const activeNodeIndices = getNodeIndicesFromLinks(connectedLinks);

    if (allNodesSelection) {
      applyCircleStyle(allNodesSelection.circles, "background");
      applyTextStyle(allNodesSelection.texts, "background");
    }

    applyCircleStyle(getNodeCircles(activeNodeIndices), "active");
    applyTextStyle(getNodeTexts(activeNodeIndices), "active");

    applyCircleStyle(selectCircleById(currentNode.index), "hover");
    applyTextStyle(selectTextById(currentNode.index), "hover");

    if (allLinksSelection) applyLineStyle(allLinksSelection, "default");
    applyLineStyle(connectedLinks, "active");

    setShowcasedNode(currentNode as Node);

    const normalCollRad = radius * RADIUS_COLLISION_MULTIPLIER
    const relevantNodeCollRad = normalCollRad * RADIUS_ACTIVE_MULTIPLIER
    const primaryNodeCollRad = relevantNodeCollRad * 2

    sim?.restart()
      .alpha(0.1)
      .force('collision', d3.forceCollide().radius((n) => {
        return n.index === currentNode.index ?
          primaryNodeCollRad : (activeNodeIndices.includes(n.index) ? relevantNodeCollRad : normalCollRad);
      }
      ))
  }, [resetOverlays, allNodesSelection, applyCircleStyle, applyTextStyle, allLinksSelection, applyLineStyle, radius, sim]);

  const explorationLeave = React.useCallback((_e: unknown, currentNode: D3Node) => {
    //unfreeze this node for next sim playback
    currentNode.fx = null;
    currentNode.fy = null;

    const connectedLinks = getConnectedLinks(currentNode.index);
    const activeNodeIndices = getNodeIndicesFromLinks(connectedLinks);

    applyCircleStyle(getNodeCircles(activeNodeIndices), "default")
    applyTextStyle(getNodeTexts(activeNodeIndices), "default")
    applyCircleStyle(selectCircleById(currentNode.index), "active");
    applyTextStyle(selectTextById(currentNode.index), "active");

    setShowcasedNode(undefined);
  }, [applyCircleStyle, applyTextStyle]);

  const explorationClick = React.useCallback((e: unknown, currentNode: D3Node) => {
    //evil user tracking
    apiClient.query(["view_node", { is_hover: true, name: (currentNode as Node).name }]);

    const connectedLinks = getConnectedLinks(currentNode.index);
    setRelevantLinkSelection(connectedLinks);
    setRelevantNodeSelection(getNodeMulti(getNodeIndicesFromLinks(connectedLinks)));
    setPrimaryNodeSelection(selectNodeMultiById(currentNode.index));
    setInteractionMode("focus");

    const edgeData: ActiveEdgeData[] = [];
    connectedLinks.each((l) => {
      const link = l as D3Link;
      const source = link.source as D3Node;
      const target = link.target as D3Node;
      const thisNode = source.index === currentNode.index ? source : target;
      const otherNode = source.index === currentNode.index ? target : source;

      edgeData.push({
        edge: l as AugmentedDTOEdge,
        articles: [], //will be fetched later
        position: getCentralPoint(thisNode as Point2D, otherNode as Point2D),
        sourceColor: getCategoryColor((thisNode as Node).category_id),
        targetColor: getCategoryColor((otherNode as Node).category_id),
        sourceIndex: thisNode.index,
        targetIndex: otherNode.index,
        lineIndex: link.index
      });
    })

    setActiveEdges(edgeData);
    setActiveNode({ node: currentNode as Node, position: currentNode as Point2D });
    setShowcasedNode(currentNode as Node);
    triggerNodeRipple(e);

    //freeze simulation
    sim?.alpha(0);
  }, [sim, triggerNodeRipple]);

  const styleNode = React.useCallback((variant: SVGNodeStyle) => ((_e: unknown, currentNode: D3Node) => {
    applyTextStyle(selectTextById(currentNode.index), variant);
    applyCircleStyle(selectCircleById(currentNode.index), variant);
  }), [applyTextStyle, applyCircleStyle]);

  const styleRelevantNodes = React.useCallback((variant: SVGNodeStyle) => (() => {
    if (relevantNodeSelection) {
      applyTextStyle(relevantNodeSelection.texts, variant);
      applyCircleStyle(relevantNodeSelection.circles, variant);
    }
  }), [relevantNodeSelection, applyTextStyle, applyCircleStyle]);

  const handleClickAway = React.useCallback((() => {
    resetSVGStyles();
    resetOverlays();
    resetShowcase();
    setInteractionMode("exploration");
  }), [resetOverlays, resetSVGStyles, resetShowcase]);

  //Update event handlers based on current interaction mode
  useEffect(() => {
    switch (interactionMode) {
      case "focus":
        allNodesSelection?.groups.on('mouseenter', styleNode("active"));
        primaryNodeSelection?.groups.on('mouseenter', styleRelevantNodes("active"))
        allNodesSelection?.groups.on('mouseleave', styleNode("background"));
        relevantNodeSelection?.groups.on('mouseleave', styleNode("default")); // keep them as they were before
        primaryNodeSelection?.groups.on('mouseleave', styleRelevantNodes("default"))
        // clickaway to switch back to exploration mode
        allNodesSelection?.groups.on('click', (_e: unknown, currentNode: D3Node) => {
          setShowcasedArticles(undefined);
          setShowcasedDialIndex(undefined);
          explorationEnter(_e, currentNode);
          setInteractionMode("exploration");
        })
        break;
      case "exploration":
        allNodesSelection?.groups.on('mouseenter', explorationEnter);
        allNodesSelection?.groups.on('mouseleave', explorationLeave);
        allNodesSelection?.groups.on('click', explorationClick);
        break;
    }

  }, [allNodesSelection, relevantNodeSelection, primaryNodeSelection, interactionMode, styleNode, styleRelevantNodes, explorationEnter, explorationLeave, explorationClick]);

  //--------------------------------------------
  // DOM
  //--------------------------------------------

  return (
    <>
      <Box sx={{ zIndex: Z_INDEX_GRAPH, position: "relative" }}>
        <svg
          id={SVG_CANVAS_ID}
          width="100%"
          height={window.innerHeight}
          ref={containerRef}
          style={{ position: "absolute", backgroundColor: backgroundColor }}
        >
          <rect id={SVG_BACKGROUND_ID}
            width="100%"
            height="100%"
            fillOpacity={(props.highlightedArticle || props.highlightedNode) ? (props.metadata.nightmode ? 0.15 : 0.05) : 1}
            fill={(props.highlightedArticle || props.highlightedNode) ? contrastColor : backgroundColor}
            onClick={handleClickAway}
          />
        </svg>
      </Box>

      {activeNode && [activeNode].map((nodeData, idx) => {
        const screenPos = canvasToBottomRightOffset({ x: nodeData.position.x + 2 * radius, y: nodeData.position.y - radius });
        const shiftX = getScrollBarSize();
        const shiftY = 0;
        return <SpeedDialAction
          key={idx}
          sx={{
            transform: `scale(${currentTransform.zoom}) translate(${shiftX}px, ${shiftY}px) `,
            transformOrigin: `center center`,
            position: 'fixed',
            bottom: screenPos.y,
            right: screenPos.x,
            zIndex: Z_INDEX_GRAPH + 2,
          }}
          open={true}
          onClick={() => {
            //evil user tracking
            apiClient.query(["view_node", { is_hover: false, name: nodeData.node.name }]);
            openLink(nodeData.node.url);
          }}
          icon={<Tooltip title={"Zum Artikel"}><LibraryBooks /></Tooltip>}
        />
      })}

      {activeEdges.map((edgeData, i) => {
        const screenPos = canvasToBottomRightOffset(edgeData.position);
        const shiftX = 28 + getScrollBarSize();
        const shiftY = 28;
        const articlesInfo = edgeData.edge.articles;
        return <SpeedDial
          key={`dial-${i}`}
          ariaLabel={"69420"}
          sx={{
            transform: `scale(${currentTransform.zoom}) translate(${shiftX}px, ${shiftY}px) `,
            transformOrigin: `right bottom`,
            position: 'fixed',
            bottom: screenPos.y,
            right: screenPos.x,
            visibility: (activeDialIndex === undefined || i === activeDialIndex) ? "visible" : "hidden",
            zIndex: i === activeDialIndex ? Z_INDEX_UI - 1 : Z_INDEX_GRAPH + 1, //for overlap with node article button
            '& .MuiFab-primary': {
              width: radius * 2,
              height: radius * 2,
              border: 1 + articlesInfo.length,
              borderColor: contrastColor,
              background: `linear-gradient(45deg, ${edgeData.sourceColor} 0%, ${edgeData.targetColor} 100%)`
            },
            '& .MuiSpeedDial-actions': {
              paddingBottom: "32px"
            }
          }}
          onMouseEnter={async () => {
            //evil user tracking
            edgeData.articles.map(article => apiClient.query(["view_article", { is_hover: true, name: article.name }]));

            if (relevantLinkSelection) applyLineStyle(relevantLinkSelection, "default");
            applyLineStyle(selectLineById(edgeData.lineIndex), "active");
            const thisVariant = "active";
            applyCircleStyle(selectCircleById(edgeData.targetIndex), thisVariant);
            applyTextStyle(selectTextById(edgeData.targetIndex), thisVariant);
            if (primaryNodeSelection) {
              applyCircleStyle(primaryNodeSelection.circles, thisVariant);
              applyTextStyle(primaryNodeSelection.texts, thisVariant);
            }
            setActiveDialIndex(i);

            if (edgeData.articles.length === 0) {
              const newArticles = await fetchEdgeArticles(edgeData.edge.source_id, edgeData.edge.target_id);
              // If no dials content is locked, already show this ones on enter
              if (showcasedDialIndex === undefined) setShowcasedArticles(newArticles);
            } else {
              if (showcasedDialIndex === undefined) setShowcasedArticles(edgeData.articles);
            }
          }}
          onMouseLeave={() => {
            if (relevantLinkSelection) applyLineStyle(relevantLinkSelection, "active");
            const thisVariant = "default";
            applyCircleStyle(selectCircleById(edgeData.targetIndex), thisVariant);
            applyTextStyle(selectTextById(edgeData.targetIndex), thisVariant);
            if (primaryNodeSelection) {
              applyCircleStyle(primaryNodeSelection.circles, thisVariant);
              applyTextStyle(primaryNodeSelection.texts, thisVariant);
            }
            setActiveDialIndex(undefined);
            // If this is not the locked dial, remove its contents on leave
            if (showcasedDialIndex === undefined) setShowcasedArticles(undefined);
          }}
          onClick={(e) => {
            //evil user tracking
            edgeData.articles.map(article => apiClient.query(["view_article", { is_hover: true, name: article.name }]));
            // Set this dial as the locked one and show its contents
            setShowcasedDialIndex(i);
            setShowcasedArticles(edgeData.articles);
            triggerArticleRipple(e);
          }}
          icon={
            <Typography
              noWrap={true}
              sx={{ 
                width: "inherit", 
                fontSize: articlesInfo.length === 1 ? 8 : 16, 
                textTransform: "none",
              }}
            >
              {props.metadata.showText ?
                (articlesInfo.length === 1 ? articlesInfo[0].discipline_id : "+" + articlesInfo.length)
                :
                ""}
            </Typography>
          }
        >
          {edgeData.articles.map((content, j) => (
            <SpeedDialAction
              sx={{
                height: 60,
                width: 60,
                '& .MuiSpeedDialAction-staticTooltipLabel': { boxShadow: `0px 0px 60px -20px ${contrastColor}` }
              }}
              key={j}
              tooltipOpen={true}
              tooltipPlacement={(window.innerWidth - edgeData.position.x) > window.innerWidth / 2 ? 'right' : 'left'}
              onClick={() => {
                //evil user tracking
                apiClient.query(["view_article", { is_hover: false, name: content.name }]);
                openLink(content.url);
              }}
              icon={<Tooltip title={"Zum Artikel"}><LibraryBooks /></Tooltip>}
              //tooltipOpen
              tooltipTitle={<Box>
                <Typography variant="button" noWrap={true}>{`${content.discipline_id}:`}</Typography>
                <Typography noWrap={true} sx={{ maxWidth: "20vw", minWidth: content.name.length }}>{content.name}</Typography>
              </Box>}
            />
          ))}
        </SpeedDial>
      })}

      {/* Canvas Controls are tightly coupled to Graph, so render them here as a child component */}
      <div style={{ zIndex: Z_INDEX_UI, position: "fixed", bottom: "1vh", right: "1vw" }}>
        <CanvasControls
          zoomLevel={currentTransform.zoom}
          onUp={() => zoom.translateBy(canvasSelector() as D3ZoomSelection, 0, PAN_STEP)}
          onDown={() => zoom.translateBy(canvasSelector() as D3ZoomSelection, 0, -PAN_STEP)}
          onLeft={() => zoom.translateBy(canvasSelector() as D3ZoomSelection, PAN_STEP, 0)}
          onRight={() => zoom.translateBy(canvasSelector() as D3ZoomSelection, -PAN_STEP, 0)}
          onCenter={() => zoom.translateTo(canvasSelector() as D3ZoomSelection, 0.5 * window.innerWidth, 0.5 * window.innerHeight)}
          onReset={() => zoom.scaleTo(canvasSelector() as D3ZoomSelection, 1)}
          onZoom={(n) => zoom.scaleTo(canvasSelector() as D3ZoomSelection, n)}
        />
      </div>
      <Snackbar open={snackbarOpen} autoHideDuration={2000} onClose={() => setSnackbarOpen(false)} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert onClose={() => setSnackbarOpen(false)} severity="info" sx={{ width: '100%' }}>
          Der ausgewählte Artikel ist aktuell ausgeblendet
        </Alert>
      </Snackbar>
      {(showcasedNode && showcasedArticles === undefined) && <Fade in={showcasedNode !== undefined} unmountOnExit={true}>
        <HoverCard sx={{ right: "1vw", top: "10vh", width: "30vw", minHeight: "5vh" }} style={{ position: "absolute", alignSelf: "center" }} >
          <TouchRipple ref={nodeRippleRef} center={false} />
          {renderNodeArticleOverview(showcasedNode, undefined, () => {
            apiClient.query(["view_node", { is_hover: false, name: showcasedNode.name }]); //evil user tracking
          })}
        </HoverCard>
      </Fade>
      }
      {showcasedArticles && <Fade in={showcasedArticles !== undefined} unmountOnExit={true}>
        <HoverCard sx={{ right: "1vw", top: "10vh", width: "30vw", maxHeight: "70vh", overflowY: "auto" }} style={{ position: "absolute", alignSelf: "center" }} >
          <TouchRipple ref={articleRippleRef} center={false} />
          <List sx={{ width: 'inherit' }}>
            {showcasedArticles?.map((a, index) => <>
              {renderEdgeArticleOverview(a, undefined, () => {
                apiClient.query(["view_article", { is_hover: false, name: a.name }]); //evil user tracking
              })}
              {index !== showcasedArticles.length - 1 && <Divider variant="middle" component="li" />}
            </>)}
          </List>
        </HoverCard>
      </Fade>
      }
    </>
  );
};

export default Graph;
