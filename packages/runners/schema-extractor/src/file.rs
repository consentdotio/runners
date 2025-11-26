use crate::ast::{find_exported_runners, find_exported_schemas};
use crate::types::SchemaMetadata;
use std::fs;
use std::path::PathBuf;

/// Check if content has "use runner" directive
pub fn has_use_runner_directive(content: &str) -> bool {
    // Check for module-level or function-level "use runner" directive
    content.contains("\"use runner\"") || content.contains("'use runner'")
}

/// Process a single file and extract metadata
pub fn process_file(file_path: &PathBuf) -> Option<SchemaMetadata> {
    let content = match fs::read_to_string(file_path) {
        Ok(c) => c,
        Err(e) => {
            eprintln!("Warning: Could not read file {:?}: {}", file_path, e);
            return None;
        }
    };

    // Only process files with "use runner" directive
    if !has_use_runner_directive(&content) {
        return None;
    }

    let runners = find_exported_runners(&content);
    let runner_names: Vec<String> = runners.iter().map(|r| r.name.clone()).collect();
    let schemas = find_exported_schemas(&content, &runner_names);

    // Normalize path separators
    let file_str = file_path.to_string_lossy().replace('\\', "/");

    Some(SchemaMetadata {
        file: file_str,
        runners,
        schemas,
    })
}

