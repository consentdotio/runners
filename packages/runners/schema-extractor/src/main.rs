use clap::Parser;
use glob::glob;
use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;

#[derive(Debug, Serialize, Deserialize)]
struct SchemaMetadata {
    file: String,
    runners: Vec<RunnerInfo>,
    schemas: Vec<SchemaInfo>,
}

#[derive(Debug, Serialize, Deserialize)]
struct RunnerInfo {
    name: String,
    line: usize,
}

#[derive(Debug, Serialize, Deserialize)]
struct SchemaInfo {
    name: String,
    runner_name: Option<String>,
    line: usize,
}

#[derive(Parser)]
#[command(name = "schema-extractor")]
#[command(about = "Extracts runner and schema metadata from TypeScript files")]
struct Args {
    /// Glob pattern(s) to match runner files
    #[arg(short, long, default_value = "src/**/*.ts,runners/**/*.ts")]
    patterns: String,

    /// Output file path for metadata JSON
    #[arg(short, long, default_value = "runner-schemas.json")]
    output: String,

    /// Working directory
    #[arg(short, long, default_value = ".")]
    cwd: String,
}

fn has_use_runner_directive(content: &str) -> bool {
    // Check for module-level or function-level "use runner" directive
    content.contains("\"use runner\"") || content.contains("'use runner'")
}

fn find_exported_runners(content: &str) -> Vec<RunnerInfo> {
    let mut runners = Vec::new();
    let lines: Vec<&str> = content.lines().collect();

    for (line_num, line) in lines.iter().enumerate() {
        // Look for exported async functions
        if line.contains("export") && line.contains("async") && line.contains("function") {
            // Try to extract function name
            if let Some(name_start) = line.find("function") {
                let after_function = &line[name_start + 8..];
                if let Some(name_end) = after_function.find(|c: char| c == '(' || c.is_whitespace()) {
                    let name = after_function[..name_end].trim().to_string();
                    if !name.is_empty() {
                        runners.push(RunnerInfo {
                            name,
                            line: line_num + 1,
                        });
                    }
                }
            }
        }
        // Also check for exported const/let with async arrow functions
        if line.contains("export") && (line.contains("const") || line.contains("let")) {
            if let Some(equals_pos) = line.find('=') {
                let before_equals = &line[..equals_pos];
                if let Some(const_pos) = before_equals.find("const") {
                    let after_const = &before_equals[const_pos + 5..];
                    let name = after_const.trim().to_string();
                    if !name.is_empty() && line.contains("async") {
                        runners.push(RunnerInfo {
                            name,
                            line: line_num + 1,
                        });
                    }
                }
            }
        }
    }

    runners
}

fn find_exported_schemas(content: &str, runner_names: &[String]) -> Vec<SchemaInfo> {
    let mut schemas = Vec::new();
    let lines: Vec<&str> = content.lines().collect();

    for (line_num, line) in lines.iter().enumerate() {
        // Look for exported schema variables following naming conventions
        if line.contains("export") && (line.contains("Schema") || line.contains("schema")) {
            // Check for patterns like: export const {RunnerName}InputSchema
            // or export const {RunnerName}Schema
            // or export const InputSchema
            if let Some(const_pos) = line.find("const") {
                let after_const = &line[const_pos + 5..];
                if let Some(equals_pos) = after_const.find('=') {
                    let name_part = &after_const[..equals_pos].trim();
                    if name_part.contains("Schema") {
                        let name = name_part.to_string();
                        
                        // Try to match with runner names
                        let runner_name = runner_names.iter().find(|runner| {
                            name.contains(runner.as_str()) || name == format!("{}InputSchema", runner)
                        });

                        schemas.push(SchemaInfo {
                            name,
                            runner_name: runner_name.cloned(),
                            line: line_num + 1,
                        });
                    }
                }
            }
        }
    }

    schemas
}

fn process_file(file_path: &PathBuf) -> Option<SchemaMetadata> {
    let content = match fs::read_to_string(file_path) {
        Ok(c) => c,
        Err(_) => return None,
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
                            let path_str = path.to_string_lossy();
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

