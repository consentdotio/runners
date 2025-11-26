use clap::Parser;

#[derive(Parser)]
#[command(name = "schema-extractor")]
#[command(about = "Extracts runner and schema metadata from TypeScript files")]
pub struct Args {
    /// Glob pattern(s) to match runner files
    #[arg(short, long, default_value = "src/**/*.ts,runners/**/*.ts")]
    pub patterns: String,

    /// Output file path for metadata JSON
    #[arg(short, long, default_value = "runner-schemas.json")]
    pub output: String,

    /// Working directory
    #[arg(short, long, default_value = ".")]
    pub cwd: String,
}


