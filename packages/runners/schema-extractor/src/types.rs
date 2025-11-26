use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize)]
pub struct SchemaMetadata {
    pub file: String,
    pub runners: Vec<RunnerInfo>,
    pub schemas: Vec<SchemaInfo>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct RunnerInfo {
    pub name: String,
    pub line: usize,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct SchemaInfo {
    pub name: String,
    pub runner_name: Option<String>,
    pub line: usize,
}


