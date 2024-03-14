use std::{sync::Arc};

use axum::{
    http::{Method, StatusCode, HeaderMap},
    response::{IntoResponse, Response},
    routing::get,
    Router,
};
use prisma_client_rust::{
    and, or,
    prisma_errors::{query_engine::{RecordNotFound, UniqueKeyViolation}},
    QueryError, Direction,
};

use rspc::{Config, Type};
use serde::{Deserialize, Serialize};
use tokio::sync::Mutex;
use strum_macros::Display;

use crate::{db::{self, article, category, edge, node, Role, users, queries, discipline}, auth::{gen_salt, gen_salt_hash, cmp_salt_hash, gen_jwt, check_admin}};

// Define all your requests schemas here

#[derive(Deserialize, Type)]
struct NodesRequest {
    categories: Option<Vec<String>>,
}

#[derive(Deserialize, Type)]
struct EdgesRequest {
    categories: Option<Vec<String>>,
}

#[derive(Deserialize, Type)]
struct ArticlesRequest {
    edge_source_id: String,
    edge_target_id: String,
}

#[derive(Deserialize, Type)]
struct ArticleRequest {
    id: String,
}

edge::include!(edge_articles_info {
    articles: select {
       name
       discipline_id
    }
});

#[derive(Type, Serialize)]
struct EdgeWithArticlesInfo(
    edge_articles_info::Data
);

#[derive(Type, Display, Debug, Deserialize)]
enum SearchQueryType {
    #[strum(serialize = "|")]
    Or,
    #[strum(serialize = "&")]
    And,
    #[strum(serialize = "<->")]
    AndOrdered,
}

#[derive(Deserialize, Type)]
struct SearchRequest {
    query: String,
    mode: SearchQueryType
}

#[derive(Deserialize, Type)]
struct QueriesRequest{
    prefix: String,
}

#[derive(Type, Serialize)]
struct SearchResult {
    articles: Vec<article::Data>,
    nodes: Vec<node::Data>
}

#[derive(Deserialize, Type)]
struct ViewNodeRequest{
    name: String,
    is_hover: bool
}

#[derive(Deserialize, Type)]
struct ViewArticleRequest{
    name: String,
    is_hover: bool
}

#[derive(Deserialize, Type)]
struct RegisterRequest {
    email: String,
    password: String,
}

#[derive(Deserialize, Type)]
struct LoginRequest {
    email: String,
    password: String,
}

#[derive(Type, Serialize)]
struct LoginResponse {
    token: Option<String>,
}

#[derive(Type, Display, Debug, Deserialize)]
enum ModType {
    #[strum(serialize = "Delete")]
    Delete,
    #[strum(serialize = "Update")]
    Update,
    #[strum(serialize = "Create")]
    Create,
    #[strum(serialize = "Upsert")]
    Upsert,
}

#[derive(Deserialize, Type)]
struct DeleteAllDataRequest {
    token: String
}

#[derive(Deserialize, Type)]
struct ModNodeRequest {
    token: String,
    op: ModType,
    data: node::Data
}

#[derive(Deserialize, Type)]
struct ModCategoryRequest {
    token: String,
    op: ModType,
    data: category::Data
}

#[derive(Deserialize, Type)]
struct ModDisciplineRequest {
    token: String,
    op: ModType,
    data: discipline::Data
}

#[derive(Deserialize, Type)]
struct ModEdgeRequest {
    token: String,
    op: ModType,
    data: edge::Data
}

#[derive(Deserialize, Type)]
struct ModArticleRequest {
    token: String,
    op: ModType,
    data: article::Data
}

#[derive(Type, Serialize)]
struct ModResponse {
    error: Option<String>
}
type Ctx = (Arc<Mutex<db::PrismaClient>>, HeaderMap, Method);
/*
/api/user => GET, POST
*/
pub async fn create_route(db_param: Arc<Mutex<db::PrismaClient>>) -> Router {
    // Internal router
    let rspc_router = rspc::Router::<Ctx>::new()
        .config(Config::new().export_ts_bindings("../website/src/types/bindings.ts"))
        // logging
        .middleware(|mw| {
            mw.middleware(|mw| async move {
                let state = (mw.req.clone(), mw.ctx.clone(), mw.input.clone());
                Ok(mw.with_state(state))
            })
            .resp(|state, result| async move {
                println!(
                    "[LOG: {}] req='{:?}' ctx='{:?}'  input='{:?}'",
                    chrono::Utc::now(), state.0, state.1, state.2 // could print result as well
                );
                Ok(result)
            })
        })
        .query("nodes", |t| {
            t(|(db, _headers, _method), node_request: NodesRequest| async move {
                let db = db.lock().await;
                let cat_filter = if let Some(cat) = node_request.categories {
                    vec![node::category::is(vec![category::name::in_vec(cat)])]
                } else {
                    vec![] //No category returns all edges
                };
                db.node()
                    .find_many(cat_filter)
                    .exec()
                    .await
                    .map_err(Into::into)
            })
        })
        .query("edges", |t| {
            t(|(db, _, _), edge_request: EdgesRequest| async move {
                let db = db.lock().await;
                let cat_filter = if let Some(cat) = edge_request.categories {
                    //vec![edge::src::category::is(vec![category::name::in_vec(cat)])]
                    vec![and![
                        edge::source::is(vec![node::category_id::in_vec(cat.clone())]),
                        edge::target::is(vec![node::category_id::in_vec(cat)]),
                    ]]
                } else {
                    vec![] //No category returns all edges
                };
                Ok(db.edge()
                    .find_many(cat_filter)
                    .include(edge_articles_info::include())
                    .exec()
                    .await?
                    .into_iter()
                    .map(EdgeWithArticlesInfo)
                    .collect::<Vec<EdgeWithArticlesInfo>>())
            })
        })
        .query("articles", |t| {
            t(
                |(db, _, _), articles_request: ArticlesRequest| async move {
                    let db = db.lock().await;
                    let cat_filter = vec![and![article::edge_source_id::equals(articles_request.edge_source_id.clone()), article::edge_target_id::equals(articles_request.edge_target_id.clone())]];
                    db.article()
                        .find_many(cat_filter)
                        .exec()
                        .await
                        .map_err(Into::into)
                },
            )
        })
        .query("article", |t| {
            t(
                |(db, _, _), article_request: ArticleRequest| async move {
                    let db = db.lock().await;
                    let cat_filter = vec![article::name::equals(article_request.id)];
                    db.article()
                        .find_many(cat_filter)
                        .exec()
                        .await
                        .map_err(Into::into)
                },
            )
        })
        .query("categories", |t| {
            t(|(db, _, _), _: ()| async move {
                let db = db.lock().await;
                db.category()
                    .find_many(vec![])
                    .exec()
                    .await
                    .map_err(Into::into)
            })
        })
        .query("disciplines", |t| {
            t(|(db, _, _), _: ()| async move {
                let db = db.lock().await;
                db.discipline()
                    .find_many(vec![])
                    .exec()
                    .await
                    .map_err(Into::into)
            })
        })
        .query("search", |t| {
            t(|(db, _, _), search_request: SearchRequest| async move {
                let db = db.lock().await;
                let postgres_search_query = search_request.query
                    .split(' ')
                    .filter(|&c| !c.is_empty())
                    .map(String::from)
                    .reduce(|acc, word| {
                        format!("{}{}{}",acc,search_request.mode,word)
                    })
                    .unwrap();
                println!("{}", postgres_search_query);
                let articles = db.article()
                    .find_many(vec![
                        or![
                            article::name::search(postgres_search_query.clone()),
                            article::author::search(postgres_search_query.clone()),
                            article::discipline_id::search(postgres_search_query.clone()),
                            article::teaser_text::search(postgres_search_query.clone()),
                        ]
                    ])
                    .exec()
                    .await
                    .unwrap(); //TODO: this is temp, do error handling
                let nodes = db.node()
                    .find_many(vec![
                        or![
                            node::name::search(postgres_search_query.clone()),
                            node::author::search(postgres_search_query.clone()),
                            node::category_id::search(postgres_search_query.clone()),
                            node::teaser_text::search(postgres_search_query.clone()),
                        ]
                    ])
                    .exec()
                    .await
                    .unwrap(); //TODO: this is temp, do error handling
                //save query for later analysis
                //TODO: check for errors and log if necessary
                let _ = db
                    .queries()
                    .upsert(
                        queries::query::equals(search_request.query.clone()), // Throws error upon duplicates TODO: check if user exists fist to prevent ddos
                        queries::create(
                            search_request.query, 
                            vec![]
                        ),
                        vec![
                            queries::count::increment(1)
                        ]
                    )
                    .exec()
                    .await;
                SearchResult {articles, nodes}
            })
        })
        .query("queries", |t| {
            t(|(db, _, _), queries_request: QueriesRequest| async move {
                //TODO: add admin token validation
                let db = db.lock().await;
                db.queries()
                    .find_many(vec![queries::query::starts_with(queries_request.prefix)])
                    .order_by(queries::count::order(Direction::Desc))
                    .exec()
                    .await
                    .map_err(Into::into)
            })
        })
        .query("all_queries", |t| {
            t(|(db, _, _), _: ()| async move {
                //TODO: add admin token validation
                let db = db.lock().await;
                db.queries()
                    .find_many(vec![])
                    .order_by(queries::count::order(Direction::Desc))
                    .exec()
                    .await
                    .map_err(Into::into)
            })
        })
        .query("view_node", |t| {
            t(|(db, _, _), view_node_request: ViewNodeRequest| async move {
                let view_update = 
                    if view_node_request.is_hover {
                        node::wlk_hovers::increment(1)
                    } else {
                        node::wlk_clicks::increment(1)
                    };
                let db = db.lock().await;
                db
                    .node()
                    .update(
                        node::name::equals(view_node_request.name),
                        vec![view_update]
                    )
                    .exec()
                    .await
                    .map_err(Into::into)
            })
        })
        .query("view_article", |t| {
            t(|(db, _, _), view_article_request: ViewArticleRequest| async move {
                let view_update = 
                    if view_article_request.is_hover {
                        article::wlk_hovers::increment(1)
                    } else {
                        article::wlk_clicks::increment(1)
                    };
                let db = db.lock().await;
                db
                    .article()
                    .update(
                        article::name::equals(view_article_request.name),
                        vec![view_update]
                    )
                    .exec()
                    .await
                    .map_err(Into::into)
            })
        })
        .query("register", |t| {
            t(|(db, _, _), register_request: RegisterRequest| async move {
                let salt = gen_salt();
                let db_salt_hash = gen_salt_hash(&salt, &register_request.password);
                let db = db.lock().await;
                db
                    .users()
                    .create(
                        register_request.email, // Throws error upon duplicates TODO: check if user exists fist to prevent ddos
                        db_salt_hash,
                        Role::Admin, //TODO: this is for testing, remove in production
                        vec![]
                    )
                    .exec()
                    .await
                    .map_err(Into::into)
            })
        })
        .query("login", |t| {
            t(|(db, _, _), login_request: LoginRequest| async move {
                let db = db.lock().await;
                if let Some(user) = db.users()
                    .find_unique(users::email::equals(login_request.email))
                    .exec()
                    .await
                    .unwrap()
                {
                    // Compares hashes of salt+request_pw to salt+db_pw
                    if cmp_salt_hash(&login_request.password, &user.hash) {
                        // Valid pw, generate session token
                        let token = gen_jwt(&user.email, &user.role).unwrap(); //TODO error handling
                        return LoginResponse {token: Some(token)}
                    }
                } 
                LoginResponse {token: None}
            })
        })
        // authentication: later requests need admin permissions TODO: wont work right now because 
        /*.middleware(|mw| {
            mw.middleware(|mw| async move {
                let headers = mw.ctx.1.clone();
                match headers.get(COOKIE_SESSION_KEY) {
                    Some(ref session) => {
                        match decode_jwt(session.to_str().unwrap_or("wrong_token")) { //TODO: could be cleaner
                            Ok(_claims) => Ok(mw),
                            Err(err) => Err(rspc::Error::new(
                                ErrorCode::Unauthorized,
                                err.to_string()
                            ))
                        }
                        // We use `.with_ctx` to switch the context type.
                        //Ok(mw.with_ctx(AuthenticatedCtx { user }))
                    }
                    None => Err(rspc::Error::new(
                        ErrorCode::Unauthorized,
                        "Unauthorized".into(),
                    )),
                }
            })
        }) */
        .query("deleteAllData", |t| {
            t(|(db, _, _), delete_all_data_request: DeleteAllDataRequest| async move {
                if !check_admin(&delete_all_data_request.token) {
                    return ModResponse {error: Some("Invalid token".to_string())};
                }
                let empty_string = "".to_string(); //TODO: find cleaner way to select all
                let db = db.lock().await;

                //Delete all articles
                let _ = db //TODO: do proper error processing
                .article()
                .delete_many(vec![
                    article::edge_source_id::not(empty_string.clone())
                ])
                .exec()
                .await;
                
                //Delete all edges
                let _ = db
                .edge()
                .delete_many(vec![
                    edge::source_id::not(empty_string.clone())
                ])
                .exec()
                .await;

                //Delete all nodes
                let db_response = db
                .node()
                .delete_many(vec![
                    node::name::not(empty_string.clone())
                ])
                .exec()
                .await;

                //Delete all categories
                let _ = db
                .category()
                .delete_many(vec![
                    category::name::not(empty_string.clone())
                ])
                .exec()
                .await;

                //Delete all disciplines
                let _ = db
                .discipline()
                .delete_many(vec![
                    discipline::name::not(empty_string)
                ])
                .exec()
                .await;

                ModResponse {error: db_response.err().map_or(None, |e|Some(e.to_string()))}
            })
        })
        .query("modNode", |t| {
            t(|(db, _, _), mod_node_request: ModNodeRequest| async move {
                if !check_admin(&mod_node_request.token) {
                    return ModResponse {error: Some("Invalid token".to_string())};
                }
                let db = db.lock().await;
                let data = mod_node_request.data;
                let update_param = (
                    node::name::equals(data.name.clone()),
                    vec![
                        node::category_id::set(data.category_id.clone()),
                        node::author::set(data.author.clone()),
                        node::teaser_text::set(data.teaser_text.clone()),
                        node::views::set(data.views),
                        node::wlk_hovers::set(data.wlk_hovers),
                        node::wlk_clicks::set(data.wlk_clicks),
                        node::read_time::set(data.read_time.clone()),
                    ]
                );
                let create_param = (
                    data.name,
                    data.url,
                    category::name::equals(data.category_id), 
                    vec![
                        node::author::set(data.author),
                        node::teaser_text::set(data.teaser_text),
                        node::views::set(data.views),
                        node::wlk_hovers::set(data.wlk_hovers),
                        node::wlk_clicks::set(data.wlk_clicks),
                        node::read_time::set(data.read_time),
                    ]
                );
                let db_response = match mod_node_request.op {
                    ModType::Create => {
                        db
                        .node()
                        .create(create_param.0, 
                            create_param.1, 
                            create_param.2, 
                            create_param.3 
                        )
                        .exec()
                        .await
                    },
                    ModType::Update => {
                        db
                        .node()
                        .update( update_param.0,
                            update_param.1
                        )
                        .exec()
                        .await
                    },
                    ModType::Upsert => {
                        db
                        .node()
                        .upsert( update_param.0,
                            create_param,
                            update_param.1
                        )
                        .exec()
                        .await
                    },
                    ModType::Delete => {
                        db
                        .node()
                        .delete(update_param.0)
                        .exec()
                        .await
                    }
                };
                ModResponse {error: db_response.err().map_or(None, |e|Some(e.to_string()))}
            })
        })
        .query("modCategory", |t| {
            t(|(db, _, _), mod_category_request: ModCategoryRequest| async move {
                if !check_admin(&mod_category_request.token) {
                    return ModResponse {error: Some("Invalid token".to_string())};
                }
                let db = db.lock().await;
                let data = mod_category_request.data;
                let update_param = (
                    category::name::equals(data.name.clone()),
                    vec![]
                );
                let create_param = (
                    data.name,
                    vec![]
                );
                let db_response = match mod_category_request.op {
                    ModType::Create => {
                        db
                        .category()
                        .create(create_param.0, 
                            create_param.1 
                        )
                        .exec()
                        .await
                    },
                    ModType::Update => {
                        db
                        .category()
                        .update( update_param.0,
                            update_param.1
                        )
                        .exec()
                        .await
                    },
                    ModType::Upsert => {
                        db
                        .category()
                        .upsert( update_param.0,
                            create_param,
                            update_param.1
                        )
                        .exec()
                        .await
                    },
                    ModType::Delete => {
                        db
                        .category()
                        .delete(update_param.0)
                        .exec()
                        .await
                    }
                };
                ModResponse {error: db_response.err().map_or(None, |e|Some(e.to_string()))}
            })
        })
        .query("modDiscipline", |t| {
            t(|(db, _, _), mod_discipline_request: ModDisciplineRequest| async move {
                if !check_admin(&mod_discipline_request.token) {
                    return ModResponse {error: Some("Invalid token".to_string())};
                }
                let db = db.lock().await;
                let data = mod_discipline_request.data;
                let update_param = (
                    discipline::name::equals(data.name.clone()),
                    vec![]
                );
                let create_param = (
                    data.name,
                    vec![]
                );
                let db_response = match mod_discipline_request.op {
                    ModType::Create => {
                        db
                        .discipline()
                        .create(create_param.0, 
                            create_param.1 
                        )
                        .exec()
                        .await
                    },
                    ModType::Update => {
                        db
                        .discipline()
                        .update( update_param.0,
                            update_param.1
                        )
                        .exec()
                        .await
                    },
                    ModType::Upsert => {
                        db
                        .discipline()
                        .upsert( update_param.0,
                            create_param,
                            update_param.1
                        )
                        .exec()
                        .await
                    },
                    ModType::Delete => {
                        db
                        .discipline()
                        .delete(update_param.0)
                        .exec()
                        .await
                    }
                };
                ModResponse {error: db_response.err().map_or(None, |e|Some(e.to_string()))}
            })
        })
        .query("modEdge", |t| {
            t(|(db, _, _), mod_edge_request: ModEdgeRequest| async move {
                if !check_admin(&mod_edge_request.token) {
                    return ModResponse {error: Some("Invalid token".to_string())};
                }
                let db = db.lock().await;
                let data = mod_edge_request.data;
                let update_param = (
                    edge::source_id_target_id(data.source_id.clone(), data.target_id.clone()),
                    vec![]
                );
                let create_param = (
                    node::name::equals(data.source_id),
                    node::name::equals(data.target_id),
                    vec![]
                );
                let db_response = match mod_edge_request.op {
                    ModType::Create => {
                        db
                        .edge()
                        .create(create_param.0, 
                            create_param.1, 
                            create_param.2 
                        )
                        .exec()
                        .await
                    },
                    ModType::Update => {
                        db
                        .edge()
                        .update( update_param.0,
                            update_param.1
                        )
                        .exec()
                        .await
                    },
                    ModType::Upsert => {
                        db
                        .edge()
                        .upsert( update_param.0,
                            create_param,
                            update_param.1
                        )
                        .exec()
                        .await
                    },
                    ModType::Delete => {
                        db
                        .edge()
                        .delete(update_param.0)
                        .exec()
                        .await
                    }
                };
                ModResponse {error: db_response.err().map_or(None, |e|Some(e.to_string()))}
            })
        })
        .query("modArticle", |t| {
            t(|(db, _, _), mod_article_request: ModArticleRequest| async move {
                if !check_admin(&mod_article_request.token) {
                    return ModResponse {error: Some("Invalid token".to_string())};
                }
                let db = db.lock().await;
                let data = mod_article_request.data;
                let update_param = (
                    article::name::equals(data.name.clone()),
                    vec![
                        article::edge_source_id::set(data.edge_source_id.clone()),
                        article::edge_target_id::set(data.edge_target_id.clone()),
                        article::discipline_id::set(data.discipline_id.clone()),
                        article::author::set(data.author.clone()),
                        article::teaser_text::set(data.teaser_text.clone()),
                        article::date::set(data.date.clone()),
                        article::url::set(data.url.clone()),
                        article::views::set(data.views.clone()),
                        article::wlk_hovers::set(data.wlk_hovers),
                        article::wlk_clicks::set(data.wlk_clicks),
                        article::read_time::set(data.read_time.clone()),
                    ]
                );
                let create_param = (
                    data.name.clone(),
                    edge::source_id_target_id(data.edge_source_id.clone(), data.edge_target_id.clone()),
                    discipline::name::equals(data.discipline_id),
                    vec![
                        article::author::set(data.author.clone()),
                        article::teaser_text::set(data.teaser_text.clone()),
                        article::date::set(data.date.clone()),
                        article::url::set(data.url.clone()),
                        article::views::set(data.views.clone()),
                        article::wlk_hovers::set(data.wlk_hovers),
                        article::wlk_clicks::set(data.wlk_clicks),
                        article::read_time::set(data.read_time.clone()),
                    ]
                );
                let db_response = match mod_article_request.op {
                    ModType::Create => {
                        db
                        .article()
                        .create(create_param.0, 
                            create_param.1, 
                            create_param.2,
                            create_param.3 
                        )
                        .exec()
                        .await
                    },
                    ModType::Update => {
                        db
                        .article()
                        .update( update_param.0,
                            update_param.1
                        )
                        .exec()
                        .await
                    },
                    ModType::Upsert => {
                        db
                        .article()
                        .upsert( update_param.0,
                            create_param,
                            update_param.1
                        )
                        .exec()
                        .await
                    },
                    ModType::Delete => {
                        db
                        .article()
                        .delete(update_param.0)
                        .exec()
                        .await
                    }
                };
                ModResponse {error: db_response.err().map_or(None, |e|Some(e.to_string()))}
            })
        })
        .build()
        .arced();
    // Exposed router INFO: does not work with new version of axum
    Router::new()
        .route(
            "/",
            get(|| async {
                println!("Default route called");
                "Hello!"
            }),
        )
        .route(
            "/rspc/:id",
            rspc_router
                .endpoint(|headers: HeaderMap, method: Method| {
                    //println!("Requested {} '{}'", method, path); // Logging
                    (db_param, headers, method)
                })
                .axum(),
        )
    //Router::new().route("/node", get(handle_node_get))
}

enum AppError {
    PrismaError(QueryError),
    NotFound,
}

impl From<QueryError> for AppError {
    fn from(error: QueryError) -> Self {
        match error {
            e if e.is_prisma_error::<RecordNotFound>() => AppError::NotFound,
            e => AppError::PrismaError(e),
        }
    }
}

// This centralizes all differents errors from our app in one place
impl IntoResponse for AppError {
    fn into_response(self) -> Response {
        let status = match self {
            AppError::PrismaError(error) if error.is_prisma_error::<UniqueKeyViolation>() => {
                StatusCode::CONFLICT
            }
            AppError::PrismaError(_) => StatusCode::BAD_REQUEST,
            AppError::NotFound => StatusCode::NOT_FOUND,
        };

        status.into_response()
    }
}