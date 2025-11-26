use crate::types::{RunnerInfo, SchemaInfo};
use tree_sitter::{Language, Parser as TSParser, Node};

/// Get the TypeScript language from tree-sitter-typescript
fn get_typescript_language() -> Language {
    tree_sitter_typescript::language_typescript()
}

/// Extract line number from a tree-sitter node
fn get_line_number(node: &Node, source: &str) -> usize {
    let start_byte = node.start_byte();
    source[..start_byte].matches('\n').count() + 1
}

/// Check if a node is exported (has export modifier)
fn is_exported(node: &Node) -> bool {
    // Check if the node itself is an export statement
    if node.kind() == "export_statement" {
        return true;
    }
    
    // Check parent nodes for export_statement
    let mut current = node.parent();
    while let Some(n) = current {
        if n.kind() == "export_statement" {
            return true;
        }
        current = n.parent();
    }
    
    // Check for export modifier as a sibling or in the declaration
    // For function_declaration, check if first child is "export"
    if let Some(first_child) = node.child(0) {
        if first_child.kind() == "export" {
            return true;
        }
    }
    
    // Check parent's first child for export (common pattern)
    if let Some(parent) = node.parent() {
        if let Some(first_child) = parent.child(0) {
            if first_child.kind() == "export" {
                return true;
            }
        }
    }
    
    false
}

/// Extract function name from a function declaration or arrow function
fn extract_function_name(node: &Node, source: &str) -> Option<String> {
    // Look for identifier child
    for i in 0..node.child_count() {
        if let Some(child) = node.child(i) {
            match child.kind() {
                "identifier" | "property_identifier" => {
                    let name = &source[child.start_byte()..child.end_byte()];
                    return Some(name.to_string());
                }
                _ => {}
            }
        }
    }
    None
}

/// Check if a function is async
fn is_async_function(node: &Node) -> bool {
    // Check for async modifier
    for i in 0..node.child_count() {
        if let Some(child) = node.child(i) {
            if child.kind() == "async" {
                return true;
            }
        }
    }
    // Also check parent for async in arrow functions
    if let Some(parent) = node.parent() {
        for i in 0..parent.child_count() {
            if let Some(child) = parent.child(i) {
                if child.kind() == "async" {
                    return true;
                }
            }
        }
    }
    false
}

/// Finds exported async runner functions in TypeScript code using tree-sitter AST parsing.
pub fn find_exported_runners(content: &str) -> Vec<RunnerInfo> {
    let mut runners = Vec::new();
    
    let language = get_typescript_language();
    let mut parser = TSParser::new();
    parser.set_language(&language).expect("Failed to set TypeScript language");
    
    let tree = match parser.parse(content, None) {
        Some(tree) => tree,
        None => return runners,
    };
    
    let root_node = tree.root_node();
    
    // Recursively walk the AST to find exported async functions
    fn walk_node<'a>(node: Node<'a>, content: &str, runners: &mut Vec<RunnerInfo>) {
        match node.kind() {
            "function_declaration" => {
                if is_exported(&node) && is_async_function(&node) {
                    if let Some(name) = extract_function_name(&node, content) {
                        let line = get_line_number(&node, content);
                        runners.push(RunnerInfo { name, line });
                    }
                }
            }
            "lexical_declaration" | "variable_declaration" => {
                if is_exported(&node) {
                    // Check if this is a const/let declaration with async arrow function
                    for i in 0..node.child_count() {
                        if let Some(child) = node.child(i) {
                            if child.kind() == "variable_declarator" {
                                // Check if the value is an async arrow function
                                for j in 0..child.child_count() {
                                    if let Some(value_node) = child.child(j) {
                                        if value_node.kind() == "arrow_function" && is_async_function(&value_node) {
                                            // Extract name from the variable_declarator
                                            if let Some(name_node) = child.child(0) {
                                                if name_node.kind() == "identifier" || name_node.kind() == "property_identifier" {
                                                    let name = &content[name_node.start_byte()..name_node.end_byte()];
                                                    let line = get_line_number(&node, content);
                                                    runners.push(RunnerInfo { 
                                                        name: name.to_string(), 
                                                        line 
                                                    });
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
            _ => {}
        }
        
        // Recursively visit children
        let mut cursor = node.walk();
        if cursor.goto_first_child() {
            loop {
                walk_node(cursor.node(), content, runners);
                if !cursor.goto_next_sibling() {
                    break;
                }
            }
        }
    }
    
    walk_node(root_node, content, &mut runners);
    
    runners
}

/// Finds exported schema variables in TypeScript code using tree-sitter AST parsing.
pub fn find_exported_schemas(content: &str, runner_names: &[String]) -> Vec<SchemaInfo> {
    let mut schemas = Vec::new();
    
    let language = get_typescript_language();
    let mut parser = TSParser::new();
    parser.set_language(&language).expect("Failed to set TypeScript language");
    
    let tree = match parser.parse(content, None) {
        Some(tree) => tree,
        None => return schemas,
    };
    
    let root_node = tree.root_node();
    
    // Recursively walk the AST to find exported schema variables
    fn walk_node<'a>(node: Node<'a>, content: &str, schemas: &mut Vec<SchemaInfo>, runner_names: &[String]) {
        match node.kind() {
            "lexical_declaration" | "variable_declaration" => {
                if is_exported(&node) {
                    // Check for variable declarators
                    for i in 0..node.child_count() {
                        if let Some(child) = node.child(i) {
                            if child.kind() == "variable_declarator" {
                                // Extract variable name
                                if let Some(name_node) = child.child(0) {
                                    if name_node.kind() == "identifier" || name_node.kind() == "property_identifier" {
                                        let name = &content[name_node.start_byte()..name_node.end_byte()];
                                        
                                        // Check if name contains "Schema" (case-insensitive)
                                        if name.to_lowercase().contains("schema") {
                                            let name = name.to_string();
                                            
                                            // Try to match with runner names
                                            let runner_name = runner_names.iter().find(|runner| {
                                                name.contains(runner.as_str())
                                            });
                                            
                                            let line = get_line_number(&node, content);
                                            schemas.push(SchemaInfo {
                                                name,
                                                runner_name: runner_name.cloned(),
                                                line,
                                            });
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
            _ => {}
        }
        
        // Recursively visit children
        let mut cursor = node.walk();
        if cursor.goto_first_child() {
            loop {
                walk_node(cursor.node(), content, schemas, runner_names);
                if !cursor.goto_next_sibling() {
                    break;
                }
            }
        }
    }
    
    walk_node(root_node, content, &mut schemas, runner_names);
    
    schemas
}

