pub mod db; // This import will fail if you have not yet generated your local db.rs file with the prisma-cli-client $(cargo prisma generate)
pub mod routes;
pub mod auth;

#[cfg(test)]
mod tests {
    use jsonwebtoken::TokenData;

    use crate::{auth::{gen_salt, gen_salt_hash, cmp_salt_hash, gen_jwt, decode_jwt}, db::Role};

    #[test]
    fn test_gen_salt_hash_and_cmp () {
        let pw = "test123";
        let fake_pw = "fakepw123";
        let salt = gen_salt();
        let wrong_salt = gen_salt();
        // gen_salt returns differnt salts with each call (could be equal by chance, but very unlikely)
        //println!("salt: {}, wrong_salt: {}", salt, wrong_salt);
        assert_ne!(salt, wrong_salt); 
        let salt_hash = gen_salt_hash(&salt, &pw);
        // different pw leads to different hash
        assert!(!cmp_salt_hash(fake_pw, &salt_hash));
        // same salt and pw leads to same hash
        assert!(cmp_salt_hash(&pw, &salt_hash));
    }
    #[test]
    fn test_jwt() {
        let fake_email = "test@test.com";
        let fake_role = Role::Admin;
        let jwt = gen_jwt(&fake_email, &fake_role).unwrap();
        if let Ok(TokenData { header: _, claims }) = decode_jwt(&jwt) {
            //check that we can encode and decode without loss of information
            assert_eq!(claims.role, fake_role);
            assert_eq!(claims.email, fake_email);
        }
        //TODO: add timestamp tests
    }
}