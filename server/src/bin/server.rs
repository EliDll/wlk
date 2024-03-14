use axum::{Router};
use bidt_glossar_server::{db, routes};
use std::sync::Arc;
use tokio::sync::Mutex;
use tower_http::cors::{Any, CorsLayer};

#[tokio::main]
async fn main() {
    // database connector
    let prisma_client = Arc::new(Mutex::new(db::new_client().await.unwrap()));

    #[cfg(debug)]
    prisma_client._db_push(false).await.unwrap();

    // TODO: specify for production
    let cors = CorsLayer::new()
        .allow_methods(Any)
        .allow_headers(Any)
        .allow_origin(Any);

    let app = Router::new()
        .nest("/api", routes::create_route(prisma_client).await)
        .layer(cors);
    //.layer(Extension(prisma_client));

    println!("Example Prisma x Axum running on http://localhost:5000/api");

    axum::Server::bind(&"0.0.0.0:5000".parse().unwrap())
        .serve(app.into_make_service())
        .await
        .unwrap();
}
