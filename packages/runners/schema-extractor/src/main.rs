mod ast;
mod cli;
mod file;
mod types;

use clap::Parser;
use cli::Args;
use file::process_file;
use glob::glob;
use std::fs;
use std::path::PathBuf;
use types::SchemaMetadata;

fn main() {
    let args = Args::parse();

    let patterns: Vec<&str> = args.patterns.split(',').map(|s| s.trim()).collect();
    let mut all_metadata: Vec<SchemaMetadata> = Vec::new();

    for pattern in patterns {
        let full_pattern = if args.cwd != "." {
            format!("{}/{}", args.cwd, pattern)
        } else {
            pattern.to_string()
        };

        match glob(&full_pattern) {
            Ok(paths) => {
                for entry in paths {
                    match entry {
                        Ok(path) => {
                            // Skip node_modules, dist, .nitro
                            let path_str = path.to_string_lossy().replace('\\', "/");
                            if path_str.contains("node_modules")
                                || path_str.contains("/dist/")
                                || path_str.contains("/.nitro/")
                            {
                                continue;
                            }

                            if let Some(metadata) = process_file(&path) {
                                all_metadata.push(metadata);
                            }
                        }
                        Err(e) => eprintln!("Error reading path: {}", e),
                    }
                }
            }
            Err(e) => eprintln!("Invalid glob pattern {}: {}", pattern, e),
        }
    }

    // Write output JSON
    let output_path = PathBuf::from(&args.output);
    if let Some(parent) = output_path.parent() {
        if let Err(e) = fs::create_dir_all(parent) {
            eprintln!("Failed to create output directory: {}", e);
            std::process::exit(1);
        }
    }

    match serde_json::to_string_pretty(&all_metadata) {
        Ok(json) => {
            if let Err(e) = fs::write(&output_path, json) {
                eprintln!("Failed to write output file: {}", e);
                std::process::exit(1);
            }
            println!("Extracted metadata from {} files", all_metadata.len());
            println!("Output written to: {}", output_path.display());
        }
        Err(e) => {
            eprintln!("Failed to serialize metadata: {}", e);
            std::process::exit(1);
        }
    }
}
