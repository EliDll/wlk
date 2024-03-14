import { Box, Button, Chip, Container, Grid, IconButton, Paper, Table, TableBody, TableCell, TableHead, TableRow, Toolbar, Typography, Tab, Tabs, TablePagination, Avatar, Divider, Tooltip, Dialog, DialogContent, Stack, CircularProgress } from "@mui/material";
import React, { useEffect, useState } from "react";
import { apiClient } from "../../App";
import { Article, Category, Discipline, EdgeWithArticlesInfo, Node, Queries, Edge } from "../../types/bindings";
// import jwt_decode from "jwt-decode";
import { Delete, Edit, ErrorOutline, LibraryBooks, OpenInFull, ScatterPlot, Timeline, WarningAmber, Download, FileUpload } from "@mui/icons-material";

import { getCategoryColor } from "../../definitions/colors";
import { categoryKeyToDisplayString, disciplineKeyToDisplayString } from "../../utils/genericHelpers";
import { Footer } from "../Footer";
import { NodeForm } from "./NodeForm";
import { EdgeArticleForm } from "./EdgeArticleForm";
import { EdgeDeletionForm } from "./EdgeDeletionForm";
import { EdgeCreationForm } from "./EdgeCreationForm";
import { CategoryForm } from "./CategoryForm";
import { DisciplineForm } from "./DisciplineForm";

import { saveAs } from 'file-saver';

type AdminPanelProps = {
  apiToken: string
}

export const AdminPanel: React.FC<AdminPanelProps> = (props) => {
  const [loading, setLoading] = useState(true);

  const [nodes, setNodes] = useState<Node[]>([]);
  const [edges, setEdges] = useState<EdgeWithArticlesInfo[]>([]);

  const [nodeCategories, setNodeCategories] = useState<Category[]>([]);
  const [edgeDisciplines, setEdgeDisciplines] = useState<Discipline[]>([]);

  const [queries, setQueries] = useState<Queries[]>([]);

  const [articles, setArticles] = useState<Article[]>([]);

  const [targetNode, setTargetNode] = useState<Node | undefined>();
  const [nodeEditorDialog, setNodeEditorDialog] = useState(false);
  const [nodeDeletionDialog, setNodeDeletionDialog] = useState(false);

  const [targetArticle, setTargetArticle] = useState<Article | undefined>();
  const [articleEditorDialog, setArticleEditorDialog] = useState(false);
  const [articleDeletionDialog, setArticleDeletionDialog] = useState(false);

  const [edgeDeletionDialog, setEdgeDeletionDialog] = useState(false);
  const [edgeAdditionDialog, setEdgeAdditionDialog] = useState(false);

  const [categoryAdditionDialog, setCategoryAdditionDialog] = useState(false);
  const [disciplineAdditionDialog, setDisciplineAdditionDialog] = useState(false);

  const [edgeConflicts, setEdgeConflicts] = useState<EdgeWithArticlesInfo[]>([]);
  const [emptyEdges, setEmptyEdges] = useState<EdgeWithArticlesInfo[]>([]);
  const [orphanedNodes, setOrphanedNodes] = useState<Node[]>([]);

  const fetchNodes = () => {
    setLoading(true);
    apiClient.query(["nodes", { categories: null }]).then((result) => { setNodes(result); setLoading(false); });
  }

  const fetchEdges = () => {
    setLoading(true); //wait for all edge articles request to complete before setting to false again
    setEmptyEdges([]);
    apiClient.query(["edges", { categories: null }]).then((result) => { setEdges(result); });
  }

  const fetchCategories = () => {
    apiClient.query(["categories"]).then(result => { setNodeCategories(result); });
  }

  const fetchDisciplines = () => {
    apiClient.query(["disciplines"]).then(result => { setEdgeDisciplines(result); });
  }

  const fetchQueries = () => {
    apiClient.query(["all_queries"]).then(result => {
      setQueries(result.filter(res => (res.query.length > 2)));
    });
  }


  useEffect(() => {
    fetchNodes();
    fetchEdges();
    fetchCategories();
    fetchDisciplines();
    fetchQueries();

  }, []);

  const fetchAllEdgeArticles = React.useCallback((async () => {
    const nestedArticles = await Promise.all(edges.map(edge => apiClient.query(["articles", { edge_source_id: edge.source_id, edge_target_id: edge.target_id }])));
    setLoading(false);
    const typedEmptyArray: Article[] = [];
    const flattenedArticles = typedEmptyArray.concat(...nestedArticles);
    setArticles(flattenedArticles);
  }), [edges]);

  useEffect(() => {
    fetchAllEdgeArticles();
  }, [edges, fetchAllEdgeArticles])

  useEffect(() => {
    setOrphanedNodes(nodes.filter(node => edges.find(edge => edge.source_id === node.name || edge.target_id === node.name) === undefined));
  }, [nodes, edges])

  useEffect(() => {
    setEmptyEdges(edges.filter(edge => articles.find(article => article.edge_source_id === edge.source_id && article.edge_target_id === edge.target_id) === undefined));
  }, [articles, edges])

  const handleRemoveNode = (node: Node) => (() => {
    setTargetNode(node);
    setEdgeConflicts(edges.filter(edge => edge.source_id === node.name || edge.target_id === node.name))
    setNodeDeletionDialog(true);
  });
  const handleRemoveNodeConfirm = () => {
    if (targetNode) {
      apiClient.query(["modNode", { data: targetNode, op: "Delete", token: props.apiToken }])
        .then(() => { fetchNodes(); setNodeDeletionDialog(false); setTargetNode(undefined); })
    }
  };

  const handleRemoveArticle = (article: Article) => (() => {
    setTargetArticle(article);
    setArticleDeletionDialog(true);
  });
  const handleRemoveArticleConfirm = () => {
    if (targetArticle) {
      apiClient.query(["modArticle", { data: targetArticle, op: "Delete", token: props.apiToken }])
        .then(() => { fetchEdges(); setArticleDeletionDialog(false); setTargetArticle(undefined); })
    }
  };

  const [tabValue, setTabValue] = useState(0);
  const [page, setPage] = React.useState(0);
  const [rowsPerPage, setRowsPerPage] = React.useState(25);

  const filteredNodes = nodes?.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);
  const filteredArticles = articles?.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);
  const filteredQueries = queries?.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);

  const handleChangePage = (
    event: React.MouseEvent<HTMLButtonElement> | null,
    newPage: number,
  ) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (
    event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const downloadEdges = () => {
    saveAs(new Blob([
      JSON.stringify(
        {
          edges: edges.map((augmentedEdge: EdgeWithArticlesInfo) => {
            //Remap to basic edge type
            const edge: Edge = { source_id: augmentedEdge.source_id, target_id: augmentedEdge.target_id };
            return edge;
          }),
          articles: articles,
          disciplines: edgeDisciplines
        },
        null,
        2
      )
    ],
      {
        type: 'application/json'
      }),
      "edges")
  };

  const downloadNodes = () => {
    saveAs(new Blob([
      JSON.stringify(
        {
          nodes: nodes,
          categories: nodeCategories,
        },
        null,
        2
      )
    ],
      {
        type: 'application/json'
      }),
      "nodes")
  };

  const processNodesUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0]
      file.text().then(async (t: string) => {
        const nodeData = JSON.parse(t);
        // Upload categories
        await Promise.all(nodeData.categories.map((category: Category) => {
          return apiClient.query(["modCategory", { data: category, op: "Upsert", token: props.apiToken }]).catch(e => console.log(e))
        }));
        // Upload nodes
        await Promise.all(nodeData.nodes.map((node: Node) => {
          return apiClient.query(["modNode", { data: node, op: "Upsert", token: props.apiToken }]).catch(e => console.log(e))
        }));
        fetchNodes();
        fetchCategories();
      })
    }
  };

  const processEdgesUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0]
      file.text().then(async (t: string) => {
        const edgeData = JSON.parse(t);
        console.log("printing things")
        // Upload disciplines
        await Promise.all(edgeData.disciplines.map((discipline: Discipline) => {
          return apiClient.query(["modDiscipline", { data: discipline, op: "Upsert", token: props.apiToken }]).catch(e => console.log(e))
        }));
        // Upload edges
        await Promise.all(edgeData.edges.map((edge: Edge) => {
          return apiClient.query(["modEdge", { data: edge, op: "Upsert", token: props.apiToken }]).catch(e => console.log(e))
        }));
        // Upload articles
        await Promise.all(edgeData.articles.map((article: Article) => {
          return apiClient.query(["modArticle", { data: article, op: "Upsert", token: props.apiToken }]).catch(e => console.log(e))
        }));
        fetchEdges();
        fetchDisciplines();
      })
    }
  };

  function NodePagination() {
    return <TablePagination
      component="div"
      count={nodes?.length}
      page={page}
      onPageChange={handleChangePage}
      rowsPerPage={rowsPerPage}
      onRowsPerPageChange={handleChangeRowsPerPage}
      labelRowsPerPage={"Anzahl pro Seite"}
    />
  }

  function ArticlePagination() {
    return <TablePagination
      component="div"
      count={articles?.length}
      page={page}
      onPageChange={handleChangePage}
      rowsPerPage={rowsPerPage}
      onRowsPerPageChange={handleChangeRowsPerPage}
      labelRowsPerPage={"Anzahl pro Seite"}
    />
  }

  function QueriesPagination() {
    return <TablePagination
      component="div"
      count={queries?.length}
      page={page}
      onPageChange={handleChangePage}
      rowsPerPage={rowsPerPage}
      onRowsPerPageChange={handleChangeRowsPerPage}
      labelRowsPerPage={"Anzahl pro Seite"}
    />
  }

  function DataTable() {
    return (
      <>
        <Tabs value={tabValue} onChange={(e, newValue) => { setTabValue(newValue), setPage(0) }} sx={{ alignSelf: "center", p: 1 }} >
          <Tab label={<Typography component="h2" variant="h6" color="primary" gutterBottom >
            Knoten
          </Typography>} />
          <Tab label={<Typography component="h2" variant="h6" color="primary" gutterBottom >
            Kanten
          </Typography>} />
          <Tab label={<Typography component="h2" variant="h6" color="primary" gutterBottom >
            Suchanfragen
          </Typography>} />
        </Tabs>
        {/* Nodes */}
        {loading && <Box sx={{ position: "fixed", background: "rgba(255,255,255,0.75)", width: "100vw", height: "100vh", zIndex: theme => theme.zIndex.appBar - 1 }}>
          <Box sx={{ display: 'flex', position: "fixed", top: "50vh", left: "50vw" }}>
            <CircularProgress />
          </Box>
        </Box>
        }
        {tabValue === 0 ?
          <Stack sx={{ alignSelf: "center", gap: "1vw", margin: "1vw 1vh" }} direction="row">
            <Button variant="outlined" onClick={() => { setTargetNode(undefined); setNodeEditorDialog(true); }}>
              <ScatterPlot sx={{ marginRight: "1vw" }} />Knoten hinzufügen
            </Button>
            <Button variant="outlined" onClick={() => setCategoryAdditionDialog(true)}>
              <Avatar sx={{ height: 20, width: 20, marginRight: "1vw" }} ><ScatterPlot /></Avatar>Kategorie hinzufügen
            </Button>
            <Button variant="outlined" component="label">
              <FileUpload sx={{ marginRight: "1vw" }} /> Hochladen (JSON) <input type="file" hidden onChange={e => processNodesUpload(e)} />
            </Button>
            <Button variant="outlined" component="label" onClick={() => { downloadNodes() }}>
              <Download sx={{ marginRight: "1vw" }} /> Herunterladen (JSON)
            </Button>
          </Stack>
          : <></>

        }
        {tabValue === 1 ?
          <Stack sx={{ alignSelf: "center", gap: "1vw", margin: "1vw 1vh" }} direction="row">
            <Button variant="outlined" onClick={() => setEdgeAdditionDialog(true)}>
              <OpenInFull sx={{ marginRight: "1vw" }} /> Kante hinzufügen
            </Button>
            <Button variant="outlined" onClick={() => setEdgeDeletionDialog(true)}>
              <Delete sx={{ marginRight: "1vw" }} /> Kante entfernen
            </Button>
            <Button variant="outlined" onClick={() => { setTargetArticle(undefined); setArticleEditorDialog(true); }}>
              <LibraryBooks sx={{ marginRight: "1vw" }} />Kantenartikel hinzufügen
            </Button>
            <Button variant="outlined" onClick={() => setDisciplineAdditionDialog(true)}>
              <Avatar sx={{ height: 20, width: 20, marginRight: "1vw" }} ><Timeline /></Avatar>Disziplin hinzufügen
            </Button>
            <Button variant="outlined" component="label">
              <FileUpload sx={{ marginRight: "1vw" }} /> Hochladen (JSON) <input type="file" hidden onChange={e => processEdgesUpload(e)} />
            </Button>
            <Button variant="outlined" component="label" onClick={() => { downloadEdges() }}>
              <Download sx={{ marginRight: "1vw" }} /> Herunterladen (JSON)
            </Button>
          </Stack>
          : <></>
        }

        <Divider orientation="horizontal"></Divider>

        {orphanedNodes.map(orphanedNode =>
          <Stack key={orphanedNode.name} direction={"row"} sx={{ alignItems: "center", margin: "1vh 0.5vw" }} gap="1vw">
            <WarningAmber color="warning"></WarningAmber>
            <Typography color="#F57C00" variant="button">{`Alleinstehender Knoten: `}</Typography>
            <Typography color="#F57C00" variant="body2" noWrap={true}>{orphanedNode.name}</Typography>
          </Stack>
        )
        }


        {emptyEdges.map(emptyEdge =>
          <Stack key={emptyEdge.source_id + "|" + emptyEdge.target_id} direction={"row"} sx={{ alignItems: "center", margin: "1vh 0.5vw" }} gap="1vw">
            <WarningAmber color="warning"></WarningAmber>
            <Typography color="#F57C00" variant="button">{`Kante ohne Artikel: `}</Typography>
            <Typography color="#F57C00" variant="body2" noWrap={true}>{emptyEdge.source_id}</Typography>
            <OpenInFull sx={{ placeSelf: "center center" }} color="warning"></OpenInFull>
            <Typography color="#F57C00" variant="body2" noWrap={true}>{emptyEdge.target_id}</Typography>
          </Stack>
        )}

        <Divider orientation="horizontal"></Divider>
        {tabValue === 0 && (
          <>
            <NodePagination />
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Begriff</TableCell>
                  <TableCell>{"Autor(en)"}</TableCell>
                  <TableCell>Kategorie</TableCell>
                  <TableCell>URL</TableCell>
                  <TableCell align="center">Clicks</TableCell>
                  <TableCell align="center">Annäherungen</TableCell>
                  <TableCell align="center">Aktionen</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredNodes?.map((node) => (
                  <TableRow key={node.name}>
                    <TableCell>{node.name}</TableCell>
                    <TableCell>{node.author}</TableCell>
                    <TableCell>
                      <Chip label={categoryKeyToDisplayString(node.category_id)} size="small" style={{ maxWidth: "7vw" }}
                        avatar={
                          <Avatar sx={{ bgcolor: getCategoryColor(node.category_id) }}> </Avatar>
                        }
                      />
                    </TableCell>
                    <TableCell><a href={node.url}>{node.url}</a></TableCell>
                    <TableCell align="center">{node.wlk_clicks}</TableCell>
                    <TableCell align="center">{node.wlk_hovers}</TableCell>
                    <TableCell align="center">
                      <div style={{ display: "flex" }}>
                        <Tooltip title={"Bearbeiten"}>
                          <IconButton onClick={() => { setTargetNode(node); setNodeEditorDialog(true); }}>
                            <Edit />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title={"Entfernen"}>
                          <IconButton onClick={handleRemoveNode(node)}>
                            <Delete />
                          </IconButton>
                        </Tooltip>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <NodePagination />
          </>
        )}

        {/* EdgeArticles */}
        {tabValue === 1 && (
          <>
            <ArticlePagination />
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Titel</TableCell>
                  <TableCell>{"Autor(en)"}</TableCell>
                  <TableCell>Kante</TableCell>
                  <TableCell>Disziplin</TableCell>
                  <TableCell>URL</TableCell>
                  <TableCell align="center">Clicks</TableCell>
                  <TableCell align="center">Annäherungen</TableCell>
                  <TableCell align="center">Aktionen</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredArticles?.map((article) => {
                  const matchingEdge = edges.find(edge => edge.source_id === article.edge_source_id && edge.target_id === article.edge_target_id);
                  return matchingEdge ?
                    <TableRow key={article.name}>
                      <TableCell><Typography variant="body2" noWrap={true} sx={{ maxWidth: "25vw" }}>{article.name}</Typography></TableCell>
                      <TableCell>{article.author}</TableCell>
                      <TableCell>
                        <Stack direction={"row"} gap={"1vw"}>
                          <OpenInFull sx={{ placeSelf: "center center" }}></OpenInFull>
                          <Stack>
                            <Typography variant="body2" noWrap={true}>{matchingEdge.source_id}</Typography>
                            <Typography variant="body2" noWrap={true}>{matchingEdge.target_id}</Typography>
                          </Stack>
                        </Stack>
                      </TableCell>
                      <TableCell>
                        <Chip label={disciplineKeyToDisplayString(article.discipline_id)} size="small" style={{ maxWidth: "7vw" }}
                          avatar={
                            <Avatar><Timeline /> </Avatar>
                          }
                        />
                      </TableCell>
                      <TableCell><a href={article.url}>{article.url}</a></TableCell>
                      <TableCell align="center">{article.wlk_clicks}</TableCell>
                      <TableCell align="center">{article.wlk_hovers}</TableCell>
                      <TableCell align="center">
                        <div style={{ display: "flex" }}>
                          <Tooltip title={"Bearbeiten"}>
                            <IconButton onClick={() => { setTargetArticle(article); setArticleEditorDialog(true); }}>
                              <Edit />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title={"Entfernen"}>
                            <IconButton onClick={handleRemoveArticle(article)}>
                              <Delete />
                            </IconButton>
                          </Tooltip>
                        </div>
                      </TableCell>
                    </TableRow>
                    :
                    <></>
                })}
              </TableBody>
            </Table>
            <ArticlePagination />
          </>
        )}

        {/* Statistics */}
        {tabValue === 2 && (
          <>
            <QueriesPagination />
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Anfrage</TableCell>
                  <TableCell align="center">Anzahl</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredQueries?.map((sq) =>
                  <TableRow key={sq.query}>
                    <TableCell><Typography variant="body2" noWrap={true} sx={{ maxWidth: "25vw" }}>{sq.query}</Typography></TableCell>
                    <TableCell align="center">{sq.count}</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
            <QueriesPagination />
          </>
        )}
      </>
    );
  }

  return (<>
    <Box component="main" sx={{ backgroundColor: "#F3F6F9", flexGrow: 1, height: "100vh", overflow: "auto", }}>
      <Toolbar />
      <Container sx={{ mt: 4, mb: 4, minWidth: "90vw" }}>
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <Paper sx={{ p: 1, display: "flex", flexDirection: "column" }}>
              <DataTable />
            </Paper>
          </Grid>
        </Grid>
        <Footer />
      </Container>
    </Box>
    <Dialog open={nodeEditorDialog} onClose={() => setNodeEditorDialog(false)}>
      <DialogContent>
        <NodeForm
          onAbort={() => { setNodeEditorDialog(false); }}
          onSubmit={() => { fetchNodes(); setNodeEditorDialog(false); setTargetNode(undefined); }}
          target={targetNode}
          categories={nodeCategories}
          apiToken={props.apiToken}
        />
      </DialogContent>
    </Dialog>
    <Dialog open={articleEditorDialog} onClose={() => setArticleEditorDialog(false)}>
      <DialogContent>
        <EdgeArticleForm
          onAbort={() => { setArticleEditorDialog(false); }}
          onSubmit={() => { fetchEdges(); setArticleEditorDialog(false); setTargetArticle(undefined); }}
          target={targetArticle}
          disciplines={edgeDisciplines}
          edges={edges}
          apiToken={props.apiToken}
        />
      </DialogContent>
    </Dialog>
    <Dialog open={nodeDeletionDialog && targetNode !== undefined} onClose={() => setNodeDeletionDialog(false)}>
      {targetNode &&
        <DialogContent>
          <Typography variant="h5" style={{ marginBottom: "1rem" }}>{"Knoten entfernen"}</Typography>
          {edgeConflicts.length > 0 ?
            <>
              <Stack direction={"row"} sx={{ placeItems: "center center" }} gap="1vw">
                <ErrorOutline color="error"></ErrorOutline>
                <Typography color="error">{`Der Knoten "${targetNode.name}" kann nicht entfernt werden, da noch Kanten darauf verweisen:`}</Typography>
              </Stack>
              <Stack direction={"column"}>
                {edgeConflicts.map(edge =>
                  <Stack key={edge.source_id + "|" + edge.target_id} direction={"row"} gap={"1vw"}>
                    <OpenInFull sx={{ placeSelf: "center center" }}></OpenInFull>
                    <Stack>
                      <Typography noWrap={true}>{edge.source_id}</Typography>
                      <Typography noWrap={true}>{edge.target_id}</Typography>
                    </Stack>
                  </Stack>)}
              </Stack>
            </>
            :
            <Typography>{`Soll der Knoten "${targetNode.name}" wirklich entfernt werden?`}</Typography>
          }
          <div style={{ display: "flex", gap: "1vw", paddingTop: "1vh" }}>
            <Button onClick={() => setNodeDeletionDialog(false)} variant="outlined" color="error">Abbrechen</Button>
            <Button onClick={handleRemoveNodeConfirm} variant="outlined" disabled={edgeConflicts.length > 0}>Bestätigen</Button>
          </div>
        </DialogContent>
      }
    </Dialog>
    <Dialog open={articleDeletionDialog && targetArticle !== undefined} onClose={() => setArticleDeletionDialog(false)}>
      {targetArticle &&
        <DialogContent>
          <Typography variant="h5" style={{ marginBottom: "1rem" }}>{"Kantenartikel entfernen"}</Typography>
          <Typography>{`Soll der Kantenartikel "${targetArticle.name}" wirklich entfernt werden?`}</Typography>
          <div style={{ display: "flex", gap: "1vw", paddingTop: "1vh" }}>
            <Button onClick={() => setArticleDeletionDialog(false)} variant="outlined" color="error">Abbrechen</Button>
            <Button onClick={handleRemoveArticleConfirm} variant="outlined" >Bestätigen</Button>
          </div>
        </DialogContent>
      }
    </Dialog>
    <Dialog open={edgeDeletionDialog} onClose={() => setEdgeDeletionDialog(false)}>
      <DialogContent>
        <EdgeDeletionForm
          apiToken={props.apiToken}
          articles={articles}
          edges={edges}
          onAbort={() => setEdgeDeletionDialog(false)}
          onSubmit={() => { fetchEdges(); setEdgeDeletionDialog(false); }}
        />
      </DialogContent>
    </Dialog>
    <Dialog open={edgeAdditionDialog} onClose={() => setEdgeAdditionDialog(false)}>
      <DialogContent>
        <EdgeCreationForm
          apiToken={props.apiToken}
          edges={edges}
          nodes={nodes}
          onAbort={() => setEdgeAdditionDialog(false)}
          onSubmit={() => { fetchEdges(); setEdgeAdditionDialog(false); }}
        />
      </DialogContent>
    </Dialog>
    <Dialog open={categoryAdditionDialog} onClose={() => setCategoryAdditionDialog(false)}>
      <DialogContent>
        <CategoryForm
          apiToken={props.apiToken}
          categories={nodeCategories}
          onAbort={() => setCategoryAdditionDialog(false)}
          onSubmit={() => { fetchCategories(); setCategoryAdditionDialog(false); }}
        />
      </DialogContent>
    </Dialog>
    <Dialog open={disciplineAdditionDialog} onClose={() => setDisciplineAdditionDialog(false)}>
      <DialogContent>
        <DisciplineForm
          apiToken={props.apiToken}
          disciplines={edgeDisciplines}
          onAbort={() => setDisciplineAdditionDialog(false)}
          onSubmit={() => { fetchDisciplines(); setDisciplineAdditionDialog(false); }}
        />
      </DialogContent>
    </Dialog>
  </>
  );
};

export default AdminPanel;
