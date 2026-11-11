//! Import en masse de produits depuis un fichier CSV vers Supabase.
//!
//!   export SUPABASE_URL=https://xxxx.supabase.co
//!   export SUPABASE_SERVICE_KEY=...      (clé service_role, secrète)
//!   cargo run --release -- produits.csv
//!
//! Colonnes : name,cat,price,old_price,stock,emoji,descr
use serde::{Deserialize, Serialize};
use std::{env, error::Error, process};

const CATS: [&str; 6] = ["Téléphones", "Pochettes", "Antichocs", "Troc", "Lampes", "Numérique"];

#[derive(Debug, Deserialize, Serialize)]
struct Produit {
    name: String,
    cat: String,
    price: i64,
    #[serde(default)]
    old_price: i64,
    stock: i64,
    #[serde(default)]
    emoji: String,
    #[serde(default)]
    descr: String,
}

fn valider(p: &Produit) -> Result<(), String> {
    if p.name.trim().len() < 2 || p.name.len() > 120 {
        return Err("nom invalide (2 à 120 caractères)".into());
    }
    if !CATS.contains(&p.cat.as_str()) {
        return Err(format!("catégorie inconnue : {}", p.cat));
    }
    if p.price < 0 || p.old_price < 0 || p.stock < 0 {
        return Err("prix et stock doivent être positifs".into());
    }
    if p.old_price != 0 && p.old_price <= p.price {
        return Err("l'ancien prix doit être supérieur au prix".into());
    }
    Ok(())
}

fn run() -> Result<(), Box<dyn Error>> {
    let fichier = env::args().nth(1).ok_or("usage : import-produits <fichier.csv>")?;
    let url = env::var("SUPABASE_URL")?.trim_end_matches('/').to_string();
    let cle = env::var("SUPABASE_SERVICE_KEY")?;

    let mut lecteur = csv::Reader::from_path(&fichier)?;
    let mut valides: Vec<Produit> = Vec::new();
    let mut erreurs = 0;
    for (i, ligne) in lecteur.deserialize::<Produit>().enumerate() {
        let n = i + 2; // ligne 1 = en-têtes
        match ligne {
            Ok(mut p) => match valider(&p) {
                Ok(()) => {
                    if p.emoji.is_empty() {
                        p.emoji = "📦".into();
                    }
                    valides.push(p)
                }
                Err(e) => {
                    eprintln!("ligne {n} ignorée : {e}");
                    erreurs += 1
                }
            },
            Err(e) => {
                eprintln!("ligne {n} illisible : {e}");
                erreurs += 1
            }
        }
    }
    if valides.is_empty() {
        return Err("aucun produit valide à importer".into());
    }

    let client = reqwest::blocking::Client::new();
    let rep = client
        .post(format!("{url}/rest/v1/products"))
        .header("apikey", &cle)
        .header("Authorization", format!("Bearer {cle}"))
        .header("Prefer", "return=minimal")
        .json(&valides)
        .send()?;
    if !rep.status().is_success() {
        return Err(format!("Supabase a refusé l'import ({}) : {}", rep.status(), rep.text()?).into());
    }
    println!("{} produit(s) importé(s), {} ligne(s) ignorée(s).", valides.len(), erreurs);
    Ok(())
}

fn main() {
    if let Err(e) = run() {
        eprintln!("Erreur : {e}");
        process::exit(1);
    }
}
