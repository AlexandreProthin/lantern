//! NW-3: the self-signed certificate, kept in `identity.json` and remade when a needed name is not on it.
use rustls::pki_types::{pem::PemObject, CertificateDer, PrivateKeyDer};
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use std::{path::Path, sync::Arc};

#[derive(Serialize, Deserialize)]
struct Stored { names: Vec<String>, cert: String, key: String }
pub struct Identity { pub config: Arc<rustls::ServerConfig>, pub fingerprint: String }

/// SHA-256 of the certificate, as browsers show it: `AB:CD:…`.
pub fn fingerprint(der: &[u8]) -> String { Sha256::digest(der).iter().map(|b| format!("{b:02X}")).collect::<Vec<_>>().join(":") }

/// A name a certificate can carry: an IP address, or a DNS label made of letters, digits, dots and dashes.
pub fn usable_name(name: &str) -> bool {
    name.parse::<std::net::IpAddr>().is_ok() || (!name.is_empty() && name.len() < 64 && name.bytes().all(|b| b.is_ascii_alphanumeric() || b == b'-' || b == b'.') && !name.starts_with('-'))
}

pub fn identity(folder: &Path, needed: &[String]) -> Result<Identity, String> {
    let path = folder.join("identity.json");
    let stored = std::fs::read(&path).ok().and_then(|b| serde_json::from_slice::<Stored>(&b).ok());
    let stored = match stored {
        Some(s) if needed.iter().all(|n| s.names.contains(n)) => s,
        previous => {
            // Names already covered stay, so a laptop moving between two networks does not get a new warning each time.
            let mut names: Vec<String> = needed.to_vec();
            for n in previous.map(|p| p.names).unwrap_or_default() { if !names.contains(&n) && names.len() < 16 { names.push(n); } }
            let s = make(names)?;
            crate::storage::write_json(&path, &serde_json::to_value(&s).map_err(|e| e.to_string())?)?; s
        }
    };
    let cert = CertificateDer::from_pem_slice(stored.cert.as_bytes()).map_err(|e| e.to_string())?;
    let key = PrivateKeyDer::from_pem_slice(stored.key.as_bytes()).map_err(|e| e.to_string())?;
    let fingerprint = fingerprint(&cert);
    let mut config = rustls::ServerConfig::builder_with_provider(Arc::new(rustls::crypto::ring::default_provider()))
        .with_safe_default_protocol_versions().map_err(|e| e.to_string())?
        .with_no_client_auth().with_single_cert(vec![cert], key).map_err(|e| e.to_string())?;
    config.alpn_protocols = vec![b"http/1.1".to_vec()];
    Ok(Identity { config: Arc::new(config), fingerprint })
}

fn make(names: Vec<String>) -> Result<Stored, String> {
    let mut params = rcgen::CertificateParams::new(names.clone()).map_err(|e| e.to_string())?;
    params.distinguished_name.push(rcgen::DnType::CommonName, "Lantern on this network");
    params.distinguished_name.push(rcgen::DnType::OrganizationName, "Lantern");
    // Browsers refuse certificates valid for more than 825 days.
    let now = std::time::SystemTime::now();
    params.not_before = (now - std::time::Duration::from_secs(86_400)).into();
    params.not_after = (now + std::time::Duration::from_secs(800 * 86_400)).into();
    let key = rcgen::KeyPair::generate_for(&rcgen::PKCS_ECDSA_P256_SHA256).map_err(|e| e.to_string())?;
    let cert = params.self_signed(&key).map_err(|e| e.to_string())?;
    Ok(Stored { names, cert: cert.pem(), key: key.serialize_pem() })
}
