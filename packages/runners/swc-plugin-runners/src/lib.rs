#![allow(clippy::not_unsafe_ptr_arg_deref)]

use serde::Deserialize;
use std::path::Path;
use swc_core::{
    common::errors::HANDLER,
    ecma::{
        ast::*,
        visit::{VisitMut, VisitMutWith},
    },
    plugin::{plugin_transform, proxies::TransformPluginProgramMetadata},
};

#[derive(Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
#[allow(dead_code)]
struct WasmConfig {
    // No config needed for now, but keeping structure for future extensibility
}

#[derive(Debug, Clone)]
enum RunnerErrorKind {
    NonAsyncFunction {
        span: swc_core::common::Span,
    },
    MisplacedDirective {
        span: swc_core::common::Span,
        location: DirectiveLocation,
    },
    MisspelledDirective {
        span: swc_core::common::Span,
        directive: String,
    },
}

#[derive(Debug, Clone)]
enum DirectiveLocation {
    Module,
    FunctionBody,
}

fn emit_error(error: RunnerErrorKind) {
    let (span, msg) = match error {
        RunnerErrorKind::NonAsyncFunction { span } => (
            span,
            "Functions marked with \"use runner\" must be async functions".to_string(),
        ),
        RunnerErrorKind::MisplacedDirective { span, location } => (
            span,
            format!(
                "The \"use runner\" directive must be at the top of the {}",
                match location {
                    DirectiveLocation::Module => "file",
                    DirectiveLocation::FunctionBody => "function body",
                }
            ),
        ),
        RunnerErrorKind::MisspelledDirective { span, directive } => (
            span,
            format!(
                "\"{}\" looks like a typo. Did you mean \"use runner\"?",
                directive
            ),
        ),
    };

    HANDLER.with(|handler| handler.struct_span_err(span, &msg).emit());
}

// Helper function to detect similar strings (typos)
fn detect_similar_strings(a: &str, b: &str) -> bool {
    let a_chars: Vec<char> = a.chars().collect();
    let b_chars: Vec<char> = b.chars().collect();

    if (a_chars.len() as i32 - b_chars.len() as i32).abs() > 1 {
        return false;
    }

    let mut differences = 0;
    let mut i = 0;
    let mut j = 0;

    while i < a_chars.len() && j < b_chars.len() {
        if a_chars[i] != b_chars[j] {
            differences += 1;
            if differences > 1 {
                return false;
            }

            if a_chars.len() > b_chars.len() {
                i += 1;
            } else if b_chars.len() > a_chars.len() {
                j += 1;
            } else {
                i += 1;
                j += 1;
            }
        } else {
            i += 1;
            j += 1;
        }
    }

    differences + (a_chars.len() - i) + (b_chars.len() - j) == 1
}

pub struct RunnerTransform {
    // Track if we're in a module-level directive context
    has_module_directive: bool,
    // Track if we're currently processing a function with a directive
    in_function_with_directive: bool,
    // Filename for better error messages (stored for potential future use)
    #[allow(dead_code)]
    filename: String,
}

impl RunnerTransform {
    pub fn new(filename: String) -> Self {
        Self {
            has_module_directive: false,
            in_function_with_directive: false,
            filename,
        }
    }

    fn is_use_runner_directive(directive: &Str) -> bool {
        directive.value == "use runner"
    }

    fn check_directive_typo(directive: &Str) -> bool {
        detect_similar_strings(&directive.value, "use runner")
    }

    fn remove_directive_from_stmts(stmts: &mut Vec<Stmt>) {
        stmts.retain(|stmt| {
            if let Stmt::Expr(ExprStmt { expr, .. }) = stmt {
                if let Expr::Lit(Lit::Str(str_lit)) = expr.as_ref() {
                    // Remove valid "use runner" directives
                    if Self::is_use_runner_directive(str_lit) {
                        return false;
                    }
                    // Remove misspelled directives
                    if Self::check_directive_typo(str_lit) {
                        return false;
                    }
                }
            }
            true
        });
    }
}

impl VisitMut for RunnerTransform {
    fn visit_mut_module(&mut self, module: &mut Module) {
        // Check for module-level directive - must be first
        let mut found_directive = false;
        let mut directive_span = None;
        let mut non_directive_before = false;

        for (index, item) in module.body.iter().enumerate() {
            if let ModuleItem::Stmt(Stmt::Expr(ExprStmt { expr, span })) = item {
                if let Expr::Lit(Lit::Str(str_lit)) = expr.as_ref() {
                    if Self::is_use_runner_directive(str_lit) {
                        found_directive = true;
                        directive_span = Some(*span);
                        // Check if it's not the first item
                        if index > 0 {
                            non_directive_before = true;
                        }
                        break;
                    } else if Self::check_directive_typo(str_lit) {
                        // Found a typo
                        emit_error(RunnerErrorKind::MisspelledDirective {
                            span: *span,
                            directive: str_lit.value.to_string(),
                        });
                        // Remove the misspelled directive (will be handled in module.body.retain below)
                    }
                } else {
                    // Found non-directive statement before checking for directive
                    if !found_directive {
                        non_directive_before = true;
                    }
                }
            } else if !found_directive {
                // Found non-directive item before directive
                non_directive_before = true;
            }
        }

        // Check for misplaced directive
        if found_directive && non_directive_before {
            if let Some(span) = directive_span {
                emit_error(RunnerErrorKind::MisplacedDirective {
                    span,
                    location: DirectiveLocation::Module,
                });
            }
        }

        if found_directive {
            self.has_module_directive = true;
        }

        module.visit_mut_children_with(self);

        // Remove module-level directive and misspelled directives
        module.body.retain(|item| {
            if let ModuleItem::Stmt(Stmt::Expr(ExprStmt { expr, .. })) = item {
                if let Expr::Lit(Lit::Str(str_lit)) = expr.as_ref() {
                    // Remove valid "use runner" directives
                    if Self::is_use_runner_directive(str_lit) {
                        return false;
                    }
                    // Remove misspelled directives
                    if Self::check_directive_typo(str_lit) {
                        return false;
                    }
                }
            }
            true
        });
    }

    fn visit_mut_function(&mut self, func: &mut Function) {
        let had_directive = self.in_function_with_directive;
        self.in_function_with_directive = false;

        // Check for directive at the start of function body
        if let Some(body) = &mut func.body {
            // Check if first statement is a directive
            if let Some(first_stmt) = body.stmts.first() {
                if let Stmt::Expr(ExprStmt { expr, span }) = first_stmt {
                    if let Expr::Lit(Lit::Str(str_lit)) = expr.as_ref() {
                        if Self::is_use_runner_directive(str_lit) {
                            self.in_function_with_directive = true;

                            // Validate that function is async
                            if !func.is_async {
                                emit_error(RunnerErrorKind::NonAsyncFunction { span: *span });
                            }

                            // Remove the directive
                            Self::remove_directive_from_stmts(&mut body.stmts);
                        } else if Self::check_directive_typo(str_lit) {
                            // Found a typo in function body
                            emit_error(RunnerErrorKind::MisspelledDirective {
                                span: *span,
                                directive: str_lit.value.to_string(),
                            });
                            // Remove the misspelled directive
                            Self::remove_directive_from_stmts(&mut body.stmts);
                        }
                    }
                }
            }

            // Check for misplaced directive (not first statement)
            let mut found_misplaced = false;
            for (index, stmt) in body.stmts.iter().enumerate() {
                if index > 0 {
                    if let Stmt::Expr(ExprStmt { expr, span }) = stmt {
                        if let Expr::Lit(Lit::Str(str_lit)) = expr.as_ref() {
                            if Self::is_use_runner_directive(str_lit) {
                                emit_error(RunnerErrorKind::MisplacedDirective {
                                    span: *span,
                                    location: DirectiveLocation::FunctionBody,
                                });
                                found_misplaced = true;
                            }
                        }
                    }
                }
            }
            // Remove misplaced directives if found
            if found_misplaced {
                Self::remove_directive_from_stmts(&mut body.stmts);
            }
        }

        func.visit_mut_children_with(self);

        self.in_function_with_directive = had_directive;
    }

    fn visit_mut_arrow_expr(&mut self, arrow: &mut ArrowExpr) {
        // For arrow functions, check if body starts with directive
        if let BlockStmtOrExpr::BlockStmt(block) = arrow.body.as_mut() {
            // Check first statement for directive
            if let Some(first_stmt) = block.stmts.first() {
                if let Stmt::Expr(ExprStmt { expr, span }) = first_stmt {
                    if let Expr::Lit(Lit::Str(str_lit)) = expr.as_ref() {
                        if Self::is_use_runner_directive(str_lit) {
                            // Check if arrow function is async
                            // Note: arrow functions don't have is_async flag, so we check the parent
                            // For now, we'll just validate and remove
                            // TODO: Could check parent context to see if it's async
                        } else if Self::check_directive_typo(str_lit) {
                            emit_error(RunnerErrorKind::MisspelledDirective {
                                span: *span,
                                directive: str_lit.value.to_string(),
                            });
                            // Remove the misspelled directive
                            Self::remove_directive_from_stmts(&mut block.stmts);
                        }
                    }
                }
            }

            // Check for misplaced directive
            let mut found_misplaced = false;
            for (index, stmt) in block.stmts.iter().enumerate() {
                if index > 0 {
                    if let Stmt::Expr(ExprStmt { expr, span }) = stmt {
                        if let Expr::Lit(Lit::Str(str_lit)) = expr.as_ref() {
                            if Self::is_use_runner_directive(str_lit) {
                                emit_error(RunnerErrorKind::MisplacedDirective {
                                    span: *span,
                                    location: DirectiveLocation::FunctionBody,
                                });
                                found_misplaced = true;
                            }
                        }
                    }
                }
            }
            // Remove misplaced directives if found
            if found_misplaced {
                Self::remove_directive_from_stmts(&mut block.stmts);
            }

            Self::remove_directive_from_stmts(&mut block.stmts);
        }

        arrow.visit_mut_children_with(self);
    }
}

#[plugin_transform]
pub fn process_transform(
    mut program: Program,
    metadata: TransformPluginProgramMetadata,
) -> Program {
    // Extract filename for better error messages
    let filename = metadata
        .get_context(&swc_core::plugin::metadata::TransformPluginMetadataContextKind::Filename)
        .unwrap_or_else(|| "unknown".to_string());

    // Try to get cwd and make the path relative
    let cwd = metadata.get_context(&swc_core::plugin::metadata::TransformPluginMetadataContextKind::Cwd);
    
    let relative_filename = if let Some(cwd) = cwd {
        let cwd_path = Path::new(&cwd);
        let file_path = Path::new(&filename);
        
        // Try to strip the cwd prefix to make it relative
        if let Ok(relative) = file_path.strip_prefix(cwd_path) {
            relative.to_string_lossy().to_string()
        } else {
            // Find common ancestor path
            let cwd_components: Vec<_> = cwd_path.components().collect();
            let file_components: Vec<_> = file_path.components().collect();
            
            // Find the longest common prefix
            let common_len = cwd_components.iter()
                .zip(file_components.iter())
                .take_while(|(a, b)| a == b)
                .count();
            
            if common_len > 0 {
                // Build relative path from the common ancestor
                let remaining_file: Vec<_> = file_components.into_iter().skip(common_len).collect();
                let relative_path = remaining_file.into_iter().collect::<std::path::PathBuf>();
                relative_path.to_string_lossy().to_string()
            } else {
                filename
            }
        }
    } else {
        filename
    };
    
    // Normalize path separators to forward slashes for consistency
    let normalized_filename = relative_filename.replace('\\', "/");

    let mut visitor = RunnerTransform::new(normalized_filename);
    program.visit_mut_with(&mut visitor);
    program
}
