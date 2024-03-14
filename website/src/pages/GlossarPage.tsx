import { Autocomplete, Box, Button, Card, CardActionArea, Checkbox, CircularProgress, Dialog, Divider, Fade, FormControlLabel, IconButton, InputBase, List, Skeleton, Stack, Tab, Tabs, TextField, Tooltip, Typography } from '@mui/material';
import React, { useEffect, useState } from 'react';
import { Circle, Clear, DarkMode, DoubleArrow, FormatClear, FormatItalic, HelpOutline, LightMode, ScatterPlot, Search, Timeline } from '@mui/icons-material';
import { CategoryWithCount, DisciplineWithCount, GraphData, GraphMetadata } from '../types/GraphTypes';
import { HoverCard } from '../components/StyledComponents';
import { getCategoryColor } from '../definitions/colors';
import { EdgeWithArticlesInfo, SearchResult, Node, Article } from '../types/bindings';
import { apiClient } from '../App';
import { categoryKeyFromDisplayString, categoryKeyToDisplayString, disciplineKeyFromDisplayString, disciplineKeyToDisplayString } from '../utils/genericHelpers';
import Graph from '../components/Graph/Graph';
import tutorialImgFirst from '.././assets/images/tutorial_1.png';
import tutorialImgSecond from '.././assets/images/tutorial_2.png';
import tutorialImgThird from '.././assets/images/tutorial_3.png';
import { renderNodeArticleOverview, renderEdgeArticleOverview } from '../components/ArticleOverviews';

const SHOW_TUTORIAL_KEY = "showTutorial"

/**
 * Main page
 * @param data Data displayed
 * @param metadata Values used to manipulate the graph
 *
 * @returns component : {JSX.Element}
 */
export const GlossarPage: React.FC = () => {

    // Local state, fetched from backend
    const [nodes, setNodes] = useState<Node[] | undefined>();
    const [edges, setEdges] = useState<EdgeWithArticlesInfo[] | undefined>();
    const [nodeCategories, setNodeCategories] = useState<CategoryWithCount[] | undefined>();
    const [edgeDisciplines, setEdgeDisciplines] = useState<DisciplineWithCount[] | undefined>();

    const [categoryFilter, setCategoryFilter] = useState<CategoryWithCount[]>([]);
    const [disciplineFilter, setDisciplineFilter] = useState<DisciplineWithCount[]>([]);

    // Data that is actually forwarded to the graph component
    const [graphData, setGraphData] = useState<GraphData | undefined>();
    const [graphMetadata, setGraphMetadata] = useState<GraphMetadata>(JSON.parse(localStorage.getItem("metadata") || JSON.stringify({ nightmode: false, showText: true })));
    const handleMetadataChange = React.useCallback(((newMetadata: GraphMetadata) => {
        localStorage.setItem("metadata", JSON.stringify(newMetadata));
        setGraphMetadata(newMetadata);
    }), []);

    const [highlightedNodeArticle, setHighlightedNodeArticle] = useState<Node | undefined>();
    const [highlightedEdgeArticle, setHighlightedEdgeArticle] = useState<Article | undefined>();
    const [showOrphanedNodes, setShowOrphanedNodes] = useState(true);

    const [showTutorialDialog, setShowTutorialDialog] = useState(JSON.parse(localStorage.getItem(SHOW_TUTORIAL_KEY) || "true") === true);

    const [searchQuery, setSearchQuery] = useState<string>("");
    const [searchResult, setSearchResult] = useState<SearchResult | null>(null);

    const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setSearchQuery(e.target.value)
        e.target.value != "" ? apiClient.query(["search", { query: e.target.value, mode: "Or" }])
            .then(e => {
                setSearchResult(e)
            })
            .catch(e => console.log(e))
            : setSearchResult(null)
    }

    // Fetch server data on mount
    useEffect(() => {
        localStorage.setItem(SHOW_TUTORIAL_KEY, JSON.stringify(false));
        async function fetchData() {
            const newNodes = await apiClient.query(["nodes", { categories: null }]);
            setNodes(newNodes);
            apiClient.query(["categories"]).then(result => {
                setNodeCategories(
                    result.map(cat =>
                        ({ name: categoryKeyToDisplayString(cat.name), count: newNodes.filter(node => node.category_id === cat.name).length }))
                );
            });
            const newEdges = await apiClient.query(["edges", { categories: null }]);
            setEdges(newEdges);
            apiClient.query(["disciplines"]).then(result => {
                const allArticlesInfo: { name: string, discipline_id: string }[] = []
                newEdges.map(edge => edge.articles.map(articleInfo => allArticlesInfo.push(articleInfo)));
                setEdgeDisciplines(
                    result.map(disc =>
                        ({ name: disciplineKeyToDisplayString(disc.name), count: allArticlesInfo.filter(article => article.discipline_id === disc.name).length }))
                );
            });
        }
        fetchData();
    }, []);

    useEffect(() => {
        // Convert back from display none to API none
        const effectiveDisciplineFilter = disciplineFilter.map(disc => disciplineKeyFromDisplayString(disc.name));
        const effectiveCategoryFilter = categoryFilter.map(cat => categoryKeyFromDisplayString(cat.name));

        // Check if all data is valid (not undefined)
        if (nodes && edges && nodeCategories && edgeDisciplines) {
            const filteredNodes = effectiveCategoryFilter.length > 0 ?
                nodes.filter(node => effectiveCategoryFilter.includes(node.category_id))
                :
                nodes; //no filtering by node category

            let possibleEdges = edges;
            if (effectiveCategoryFilter.length > 0) {
                const node_ids = filteredNodes.map(node => node.name);
                possibleEdges = edges.filter(edge => node_ids.includes(edge.source_id) && node_ids.includes(edge.target_id))
            }

            const edgesWithFilteredArticles = effectiveDisciplineFilter.length > 0 ?
                possibleEdges.map(edge =>
                    ({ ...edge, articles: edge.articles.filter(article => effectiveDisciplineFilter.includes(article.discipline_id)) })
                )
                :
                possibleEdges; //no filtering by article discipline

            //Zero length check makes sense even without discipline filter active
            const relevantEdges = edgesWithFilteredArticles.filter(edge => edge.articles.length > 0);

            let relevantNodes = filteredNodes;
            if (!showOrphanedNodes) {
                const node_ids_width_edges: string[] = [];
                relevantEdges.forEach(edge => {
                    if (!node_ids_width_edges.includes(edge.source_id)) node_ids_width_edges.push(edge.source_id);
                    if (!node_ids_width_edges.includes(edge.target_id)) node_ids_width_edges.push(edge.target_id);
                });
                relevantNodes = filteredNodes.filter(node => node_ids_width_edges.includes(node.name));
            }

            setGraphData({
                nodes: relevantNodes,
                edges: relevantEdges,
                categories: effectiveCategoryFilter,
                disciplines: effectiveDisciplineFilter
            })
        }
    }, [categoryFilter, disciplineFilter, edgeDisciplines, edges, nodeCategories, nodes, showOrphanedNodes]);

    const [selectedTabValue, setSelectedTabValue] = React.useState('tab1');
    const [searchResultsVisible, setSearchResultsVisible] = React.useState(false);

    const handleChecked = () => {
        setSearchResultsVisible(true);
    };

    const handleCheckedBlur = () => {
        setSearchResultsVisible(searchQuery.length !== 0);
    };

    const handleCategoryLegendClick = (cat: CategoryWithCount) => {
        setCategoryFilter(
            categoryFilter.some(c => c.name === cat.name)
                ? categoryFilter.filter(c => c.name !== cat.name)
                : [...categoryFilter, cat]
        );
    };

    const results = React.useMemo(() => {
        return [
            ...(searchResult?.nodes ?? []).map(({ name, url, category_id, author, teaser_text, views, read_time, wlk_hovers, wlk_clicks }, index) => ({ id: index, edge_id: index, name, url, category_id, discipline_id: category_id, author, teaser_text, views, read_time, wlk_hovers, wlk_clicks, date: "", type: 'node' })),
            ...(searchResult?.articles ?? []).map(({ name, edge_source_id, edge_target_id, url, discipline_id, author, teaser_text, views, read_time, wlk_hovers, wlk_clicks, date }) => ({ name, edge_source_id, edge_target_id, url, category_id: discipline_id, discipline_id, author, teaser_text, views, read_time, wlk_hovers, wlk_clicks, date, type: 'article' }))
        ].sort((a, b) => b.wlk_clicks - a.wlk_clicks)
    }, [searchResult?.articles, searchResult?.nodes]);

    return (
        <div>
            <div>
                {
                    graphData ?
                        <Graph
                            data={graphData}
                            metadata={graphMetadata}
                            highlightedNode={highlightedNodeArticle}
                            highlightedArticle={highlightedEdgeArticle}
                        />
                        :
                        <Box sx={{ display: 'flex', position: "fixed", top: "50vh", left: "50vw" }}>
                            <CircularProgress />
                        </Box>
                }
            </div>

            {/* FILTERS */}
            {/*Discipline Filter*/}
            <HoverCard sx={{ left: "1vw", top: "2vh", width: "15vw", display: "flex", flexDirection: "column", gap: "1vh", px: "1vw",  maxHeight: "30vh", overflowY: "auto" }}>
                <Box sx={{ display: "flex", alignItems: "center", gap: "10px" }}>

                    <Typography variant="h6">{"Kanten"}</Typography>
                    <Timeline />
                </Box>

                <Autocomplete
                    multiple
                    options={edgeDisciplines || []}
                    value={disciplineFilter}
                    getOptionLabel={(option) => option.name}
                    onChange={(e, newFilter) => {
                        // When changing from no filter to some filter, autohide all unconnected nodes
                        // When clearing all filters, autoshow unconnected nodes again so no nodes "have gone missing"
                        setShowOrphanedNodes(newFilter.length === 0);
                        setDisciplineFilter(newFilter);
                    }}
                    renderOption={(props, option) => <li {...props}>{`${option.name} (${option.count})`}</li>}
                    renderInput={(params) => (
                        <TextField
                            {...params}
                            variant="standard"
                            label="Artikel nach Disziplin filtern"
                            placeholder={disciplineFilter.length === 0 ? "Wähle Disziplin(en)" : (disciplineFilter.length === edgeDisciplines?.length ? "" : "Wähle weitere")}
                        />
                    )}
                />
                <Tooltip
                    title={"Auch Begriffe anzeigen, zu denen es noch keine Artikel in den ausgewählten Disziplinen gibt"}
                >
                    <FormControlLabel control={
                        <Checkbox
                            checked={showOrphanedNodes}
                            onChange={(e) => setShowOrphanedNodes(e.target.checked)}
                        />
                    }
                        label={<Typography variant="subtitle1">{"Zeige alleinstehende Begriffe"}</Typography>}
                    />
                </Tooltip>
            </HoverCard>

            {/*Category Filter*/}
            <HoverCard sx={{ left: "1vw", top: "4vh", width: "15vw", display: "flex", flexDirection: "column", gap: "1vh", px: "1vw", maxHeight: "61vh", overflowY: "auto" }}>
                <>
                    <Box sx={{ display: "flex", alignItems: "center", gap: "10px" }}>
                        <Typography variant="h6">{"Knoten"}</Typography>
                        <ScatterPlot />
                    </Box>
                    <Autocomplete
                        multiple
                        options={nodeCategories || []}
                        value={categoryFilter}
                        getOptionLabel={(option) => option.name}
                        onChange={(e, newFilter) => {
                            setCategoryFilter(newFilter);
                        }}
                        renderOption={(props, option) => <li {...props}>{`${option.name} (${option.count})`}</li>}
                        renderInput={(params) => (
                            <TextField
                                {...params}
                                variant="standard"
                                label="Begriffe nach Kategorie filtern"
                                placeholder={categoryFilter.length === 0 ? "Wähle Kategorie(n)" : (categoryFilter.length === nodeCategories?.length ? "" : "Wähle weitere")}
                            />
                        )}
                    />
                    <Stack>
                        {nodeCategories?.map((cat) => {
                            return (
                                <CardActionArea key={cat.name} sx={{ padding: "0.5vh 0.5vw", borderRadius: "10px" }}>
                                    <Box sx={{
                                        display: "flex",
                                        alignItems: "center",
                                        opacity: (categoryFilter.length === 0 || categoryFilter.some(filterCat => filterCat.name === cat.name)) ? 1 : 0.5
                                    }} onClick={() => handleCategoryLegendClick(cat)}>
                                        <Circle sx={{
                                            color: getCategoryColor(cat.name),
                                            fontSize: 50,
                                        }} />
                                        <Typography noWrap sx={{ marginLeft: "1vw" }}>
                                            {categoryKeyToDisplayString(cat.name)}
                                        </Typography>
                                        <Typography color="#9E9E9E" sx={{ marginLeft: "10px" }}>
                                            {`(${cat.count})`}
                                        </Typography>
                                    </Box>
                                </CardActionArea>

                            );
                        }
                        )}
                    </Stack>
                </>

            </HoverCard>

            {/* SEARCH */}
            <HoverCard sx={{ p: '2px 4px', display: 'flex', alignItems: 'center', right: "1vw", top: "2vh", maxHeight: "4vh", width: "30vw" }} style={{ position: "fixed" }} >
                <Search />
                <InputBase
                    id="searchField"
                    sx={{ ml: 1, flex: 1 }}
                    placeholder="Suche nach Artikeln"
                    inputProps={{ 'aria-label': 'search' }}
                    value={searchQuery}
                    onChange={handleSearchChange} onFocus={handleChecked} onBlur={handleCheckedBlur}
                />
                {searchQuery !== "" &&
                    <Tooltip title="Suche löschen">
                        <IconButton sx={{ p: '10px' }} aria-label="menu" onClick={() => { setSearchQuery(""); setSearchResult(null); setSearchResultsVisible(false) }}><Clear color="primary" /></IconButton>
                    </Tooltip>
                }
                <Divider sx={{ height: 28, m: 0.5 }} orientation="vertical" />
                <Tooltip title={graphMetadata.nightmode ? "Dunkle Ansicht" : "Helle Ansicht"}>
                    <IconButton sx={{ p: '10px' }} aria-label="menu" onClick={() => handleMetadataChange({ ...graphMetadata, nightmode: !(graphMetadata.nightmode) })}>
                        {graphMetadata.nightmode ? <LightMode /> : <DarkMode />}      </IconButton>

                </Tooltip> <Divider sx={{ height: 28, m: 0.5 }} orientation="vertical" />
                <Tooltip title={graphMetadata.showText ? "Text ausblenden" : "Text anzeigen"}>
                    <IconButton type="button" sx={{ p: '10px' }} aria-label="search" onClick={() => handleMetadataChange({ ...graphMetadata, showText: !(graphMetadata.showText) })}>
                        {graphMetadata.showText ? <FormatClear /> : <FormatItalic />}
                    </IconButton>
                </Tooltip><Divider sx={{ height: 28, m: 0.5 }} orientation="vertical" />
                <Tooltip title="Rahmeninformationen anzeigen">
                    <IconButton sx={{ p: '10px' }} aria-label="directions" onClick={() => setShowTutorialDialog(!showTutorialDialog)} >
                        <HelpOutline />
                    </IconButton>
                </Tooltip>
            </HoverCard>

            {searchResultsVisible && <Fade in={searchResultsVisible} unmountOnExit={true}>
                <HoverCard sx={{ right: "1vw", top: "10vh", width: "30vw", minHeight: "5vh" }} style={{ position: "absolute", alignSelf: "center" }} >
                    {
                    searchQuery === "" ? 
                    <>
                        <Skeleton height="10vh"></Skeleton> 
                        <Skeleton></Skeleton> 
                        <Skeleton></Skeleton> 
                        <Skeleton></Skeleton> 
                    </>
                    :
                    <Card style={{ position: "relative", zIndex: "1000" }}>
                        <Tabs value={selectedTabValue} onChange={(_e, val) => setSelectedTabValue(val)} indicatorColor="secondary" textColor="inherit" variant="fullWidth" >
                            <Tab
                                label={
                                    <>
                                        <Typography textTransform="none">Alle Artikel</Typography>
                                        <Typography style={{ fontSize: 12 }}>{results.length + ' Ergebnisse'}</Typography>
                                    </>
                                }
                                value="tab1"
                            />
                            <Tab
                                label={
                                    <>
                                        <Typography textTransform="none">Nur Knoten</Typography>
                                        <Typography style={{ fontSize: 12 }}>{(searchResult?.nodes.length || 0) + ' Ergebnisse'}</Typography>
                                    </>
                                }
                                value="tab2"
                            />
                            <Tab
                                label={
                                    <>
                                        <Typography textTransform="none">Nur Kanten</Typography>
                                        <Typography style={{ fontSize: 12 }}>{(searchResult?.articles.length || 0) + ' Ergebnisse'}</Typography>
                                    </>
                                }
                                value="tab3"
                            />
                        </Tabs>
                    </Card>
                    }
                    <div
                        style={{ alignItems: "center", justifyContent: "center", width: "inherit", display: "flex", flexGrow: "1", flexDirection: "column", position: "relative", overflow: "auto", minHeight: "10vh", maxHeight: "65vh" }}
                        onMouseLeave={() => { setHighlightedNodeArticle(undefined); setHighlightedEdgeArticle(undefined); }}
                    >
                        {selectedTabValue === 'tab1' && <><div style={{ overflow: 'auto' }}>
                            <List sx={{ width: '100%', bgcolor: 'background.paper' }}>
                                {(searchQuery.length > 0 && searchResult?.nodes.length === 0 && searchResult?.articles.length === 0) &&
                                    <Typography component="span" variant="body2" color="text.primary" >
                                        {"Keine passenden Artikel für \"" + searchQuery + "\""}
                                    </Typography>}
                                {results.map((result, index) =>
                                    <>
                                        {result.type === 'node' ?
                                            renderNodeArticleOverview(result as Node, () => setHighlightedNodeArticle(result as Node))
                                            :
                                            renderEdgeArticleOverview(result as Article, () => setHighlightedEdgeArticle(result as Article))
                                        }
                                        {index !== results.length - 1 && <Divider variant="middle" component="li" />}
                                    </>)}
                            </List>
                        </div>
                        </>}
                        {selectedTabValue === 'tab2' && <><div style={{ overflow: 'auto' }}>
                            <List sx={{ width: '100%', bgcolor: 'background.paper' }}>

                                {(searchQuery.length > 0 && searchResult?.nodes.length === 0) &&
                                    <Typography component="span" variant="body2" color="text.primary" >
                                        {"Keine passenden Knoten-Artikel für \"" + searchQuery + "\""}
                                    </Typography>}
                                {searchResult?.nodes.map((n, index) =>
                                    <>
                                        {renderNodeArticleOverview(n, () => setHighlightedNodeArticle(n))}
                                        {index !== searchResult.articles.length - 1 && <Divider variant="middle" component="li" />}
                                    </>
                                )}
                            </List></div></>
                        }

                        {selectedTabValue === 'tab3' && <><div style={{ overflow: 'auto' }}>
                            <List sx={{ width: 'inherit', bgcolor: 'background.paper' }}>

                                {(searchQuery.length > 0 && searchResult?.articles.length === 0) &&
                                    <Typography component="span" variant="body2" color="text.primary" >
                                        {"Keine passenden Kanten-Artikel für \"" + searchQuery + "\""}
                                    </Typography>}
                                {searchResult?.articles.map((a, index) =>
                                    <>
                                        {renderEdgeArticleOverview(a, () => setHighlightedEdgeArticle(a))}
                                        {index !== searchResult.articles.length - 1 && <Divider variant="middle" component="li" />}
                                    </>
                                )}
                            </List></div></>}
                    </div>
                </HoverCard>
            </Fade>
            }
            <Dialog onClose={() => setShowTutorialDialog(false)} open={showTutorialDialog} maxWidth='xl'>
                <Box sx={{ padding: "2vw" }} >
                    <Stack sx={{ placeItems: "center center", marginBottom: "2vh" }} >
                        <Typography variant="h4">{"Neu hier? So funktioniert's:"}</Typography>
                    </Stack>
                    <Stack direction="row" >
                        <Stack>
                            <img src={tutorialImgFirst} height="500" width="auto"></img>
                            <Typography variant="h5">{"1. Fahre über Knoten, um Zusammenhänge zu erkennen"}</Typography>
                        </Stack>
                        <Divider orientation="vertical" sx={{ margin: "1vw" }} variant="fullWidth"></Divider>
                        <Stack>
                            <img src={tutorialImgSecond} height="500" width="auto"></img>
                            <Typography variant="h5">{"2. Klicke auf Knoten, um Kanteninhalte aufzuklappen"}</Typography>
                        </Stack>
                        <Divider orientation="vertical" sx={{ margin: "1vw" }} variant="fullWidth"></Divider>
                        <Stack>
                            <img src={tutorialImgThird} height="500" width="auto"></img>
                            <Typography variant="h5">{"3. Erkunde verfügbare Artikel"}</Typography>
                        </Stack>
                    </Stack>
                    <Stack sx={{ placeItems: "end end", marginTop: "2vh" }} >
                        <Button startIcon={<DoubleArrow />} variant="outlined" onClick={() => setShowTutorialDialog(false)}>{"Los geht's"}</Button>
                    </Stack>
                </Box>
            </Dialog>
        </div >
    )
}

export default GlossarPage;
