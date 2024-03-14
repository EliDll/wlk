use serde::Deserialize;
use bidt_glossar_server::db::{self, article, category, discipline, edge, node};

//IMPORTANT: this is a relative path from where you run "cargo loadcsv" from, default is from /server/
const NODE_PATH: &str = "./data/nodes.csv";
const EDGE_PATH: &str = "./data/edges.csv";

#[derive(Debug, Deserialize)]
struct NodeCSVRecord {
    name: String,
    gruppe: String,
    url: String,
    Autorendisziplin: String,
    Autor: String,
    TeaserText: String,
    RelatedWebContent: String,
    Erstellungsdatum: String,
    AnzahlAbrufe: String,
    ErwLesedauer: String
}

#[derive(Debug, Deserialize)]
struct EdgeCSVRecord {
    Knoten1: String, 
    Knoten2: String,
    Kantentitel: String,
    Autorendisziplin: String,
    Autor: String,
    TeaserText: String,
    Digitalspezifität: String,
    VerglAnalogePhänomene: String,
    GesellschaftlRelevanz: String,
    Enabler: String,
    RelatedWebContent: String,
    Erstellungsdatum: String,
    AnzahlAbrufe: String, // TODO: change to int, by changing entries in csv to int
    URL: String,
    ErwLesedauer: String
}

#[tokio::main]
async fn main() {
    let prisma_client = db::new_client().await.unwrap();

    // Read node related data
    let mut node_rdr = csv::ReaderBuilder::new().delimiter(b';').from_path(NODE_PATH)
        .expect(format!("Node path {} could not be found", NODE_PATH).as_str());
    for result in node_rdr.deserialize() {
        let record: NodeCSVRecord = result.unwrap();
        println!("{:?}", record);

        //upsert category
        prisma_client
            .category()
            .upsert(
                category::name::equals(record.gruppe.clone()),
                category::create(record.gruppe.clone(), vec![]),
                vec![],
            )
            .exec()
            .await
            .expect(format!("Upsert failed on {}", record.gruppe.clone()).as_str());

        //upsert node entries
        prisma_client
            .node()
            .upsert(
                node::name::equals(record.name.clone()),
                node::create(
                    record.name.clone(),
                    record.url.clone(),
                    category::name::equals(record.gruppe.clone()),
                    vec![
                        node::teaser_text::set(record.TeaserText),
                        node::views::set(record.AnzahlAbrufe.parse::<i32>().unwrap_or_default()),
                        node::read_time::set(record.ErwLesedauer),
                        node::author::set(record.Autor)
                    ],
                ),
                vec![],
            )
            .exec()
            .await
            .expect(format!("Update failed on {}", record.gruppe.clone()).as_str());
    }

    // Read edge related data
    let mut edge_rdr =  csv::ReaderBuilder::new().delimiter(b';').from_path(EDGE_PATH)
        .expect(format!("Edges path {} could not be found", EDGE_PATH).as_str());
    for (index, result) in edge_rdr.deserialize().enumerate() {
        let record: EdgeCSVRecord = result.unwrap();
        println!("{:?}", record);

        //upsert edge
        prisma_client
            .edge()
            .upsert(
                edge::source_id_target_id(record.Knoten1.clone(), record.Knoten2.clone()),
                edge::create(
                    node::name::equals(record.Knoten1.clone()),
                    node::name::equals(record.Knoten2.clone()),
                    vec![
                        // TODO: Set all the "needed" fields in here
                    ],
                ),
                vec![], //TODO: maybe delete edges if the other way around exists?
            )
            .exec()
            .await
            .expect(
                format!(
                    "Upsert failed on {} {}",
                    record.Knoten1.clone(),
                    record.Knoten2.clone()
                )
                .as_str(),
            );

        //upsert discipline
        prisma_client
        .discipline()
        .upsert(
            discipline::name::equals(record.Autorendisziplin.clone()),
            discipline::create(record.Autorendisziplin.clone(), vec![]),
            vec![],
        )
        .exec()
        .await
        .expect(format!("Upsert failed on {}", record.Autorendisziplin.clone()).as_str());
        
        //upsert article for edge 
        prisma_client
            .article()
            .upsert(
                //article::id::equals(i32::try_from(index).unwrap()), //TODO: this is very hacky, might cause issues if CVD entry order changes
                article::name::equals(record.Kantentitel.clone()),
                article::create(
                    record.Kantentitel.clone(),
                    edge::source_id_target_id(record.Knoten1.clone(), record.Knoten2.clone()),
                    discipline::name::equals(record.Autorendisziplin.clone()),
                    vec![
                        article::author::set(record.Autor),
                        article::teaser_text::set(record.TeaserText),
                        article::date::set(record.Erstellungsdatum),
                        article::url::set(record.URL),
                        article::views::set(record.AnzahlAbrufe.parse::<i32>().unwrap_or_default()),
                        article::read_time::set(record.ErwLesedauer)
                    ],
                    /*
                    author     String @default("Unknown")
                    teaserText String @default("Unknown")
                    date       String @default("1/1/2022") //TODO make this a real date if the data allow it
                    url        String @default("https://www.bidt.digital/glossar/nudging/")
                    views      Int    @default(0)
                     */
                ),
                vec![],
            )
            .exec()
            .await
            .expect(format!("Update failed on {}", record.Kantentitel.clone()).as_str());
    }
}
