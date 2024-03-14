use jsonwebtoken::{Header, EncodingKey, TokenData, DecodingKey};
use prisma_client_rust::chrono::Utc;
use ring::{rand::{self}, digest};
use serde::{Serialize, Deserialize};

use crate::db::Role;

const JWT_SECRET: &[u8; 25] = b"tempSecretThisHasToChange"; //TODO: change this for production
pub const COOKIE_SESSION_KEY: &str = "session";
const SALT_SEP: char = '$';

#[derive(Debug, Serialize, Deserialize)]
pub struct Claims {
    pub email: String,
    pub role: Role,
    pub exp: usize,          // Required (validate_exp defaults to true in validation). Expiration time (as UTC timestamp)
}

pub fn gen_salt() -> String {
    //TODO: bit unsafe
    rand::generate::<[u8; 8]>(&rand::SystemRandom::new())
        .unwrap()
        .expose()
        .into_iter()
        .map(char::from)
        .fold("".to_string(), |mut acc, c| {
            acc.push(c);
            acc
        })
}

/// Computes the base64 encoded digest of a salted password. Returns salt and hash
pub fn gen_salt_hash(salt: &str, password: &str) -> String {
    let salt_pw = format!["{}{}",salt, password];
    let hash = digest::digest(&digest::SHA256, salt_pw.as_bytes());
    format!["{}{}{}", salt, SALT_SEP, base64::encode(hash.as_ref())]
}

/// Compares a password to any salthash
pub fn cmp_salt_hash(password: &str, salt_hash: &str) -> bool {
    let salt_hash_arr: Vec<&str> = salt_hash.split(SALT_SEP).collect();
    let (db_salt, db_hash) = (salt_hash_arr.get(0).unwrap(), base64::decode(salt_hash_arr.get(1).unwrap()).unwrap()); //TODO: proper error handling
    let salt_pw = format!["{}{}", db_salt, password];
    let gen_hash = digest::digest(&digest::SHA256, salt_pw.as_bytes());
    gen_hash.as_ref().eq(&db_hash)
}

//src: https://blog.logrocket.com/jwt-authentication-in-rust/
pub fn gen_jwt(email: &str, role: &Role) -> Result<String, jsonwebtoken::errors::Error> {
    let expiration = Utc::now()
        .checked_add_signed(chrono::Duration::days(1))
        .expect("valid timestamp")
        .timestamp();

    let claims = Claims {
        email: email.to_string(),
        role: role.clone(),
        exp: expiration as usize,
    };
    let header = Header::new(jsonwebtoken::Algorithm::HS512);
    jsonwebtoken::encode(&header, &claims, &EncodingKey::from_secret(JWT_SECRET))
        //.map_err(|_| jsonwebtoken::errors::Error::JWTTokenCreationError)
}

pub fn decode_jwt(jwt: &str) -> Result<TokenData<Claims>, jsonwebtoken::errors::Error> {
    jsonwebtoken::decode::<Claims>(jwt, &DecodingKey::from_secret(JWT_SECRET), &jsonwebtoken::Validation::new(jsonwebtoken::Algorithm::HS512))
}

pub fn check_admin(jwt: &str) -> bool {
    if let Ok(decoded) = decode_jwt(jwt) {
        return decoded.claims.role == Role::Admin 
            && decoded.claims.exp > Utc::now().timestamp() as usize;
    }
    false
}
