#![allow(clippy::not_unsafe_ptr_arg_deref)]

use serde::Deserialize;
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

fn emit_error(span: swc_core::common::Span, msg: &str) {
    HANDLER.with(|handler| handler.struct_span_err(span, msg).emit());
}

struct RunnerTransform {
    // Track if we're in a module-level directive context
    has_module_directive: bool,
    // Track if we're currently processing a function with a directive
    in_function_with_directive: bool,
}

impl RunnerTransform {
    fn new() -> Self {
        Self {
            has_module_directive: false,
            in_function_with_directive: false,
        }
    }

    fn is_use_runner_directive(directive: &Str) -> bool {
        directive.value == "use runner"
    }

    fn remove_directive_from_stmts(stmts: &mut Vec<Stmt>) {
        stmts.retain(|stmt| {
            if let Stmt::Expr(ExprStmt { expr, .. }) = stmt {
                if let Expr::Lit(Lit::Str(str_lit)) = expr.as_ref() {
                    return !Self::is_use_runner_directive(str_lit);
                }
            }
            true
        });
    }
}

impl VisitMut for RunnerTransform {
    fn visit_mut_module(&mut self, module: &mut Module) {
        // Check for module-level directive
        for item in module.body.iter() {
            if let ModuleItem::Stmt(Stmt::Expr(ExprStmt { expr, .. })) = item {
                if let Expr::Lit(Lit::Str(str_lit)) = expr.as_ref() {
                    if Self::is_use_runner_directive(str_lit) {
                        self.has_module_directive = true;
                        break;
                    }
                }
            }
        }

        module.visit_mut_children_with(self);

        // Remove module-level directive
        module.body.retain(|item| {
            if let ModuleItem::Stmt(Stmt::Expr(ExprStmt { expr, .. })) = item {
                if let Expr::Lit(Lit::Str(str_lit)) = expr.as_ref() {
                    return !Self::is_use_runner_directive(str_lit);
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
                                emit_error(
                                    *span,
                                    "Functions marked with \"use runner\" must be async functions",
                                );
                            }

                            // Remove the directive
                            Self::remove_directive_from_stmts(&mut body.stmts);
                        }
                    }
                }
            }
        }

        func.visit_mut_children_with(self);

        self.in_function_with_directive = had_directive;
    }

    fn visit_mut_arrow_expr(&mut self, arrow: &mut ArrowExpr) {
        // For arrow functions, check if body starts with directive
        // Arrow functions with directive should be converted to regular functions
        // For now, we'll just remove the directive if present in block body
        if let BlockStmtOrExpr::BlockStmt(block) = arrow.body.as_mut() {
            Self::remove_directive_from_stmts(&mut block.stmts);
        }

        arrow.visit_mut_children_with(self);
    }
}

#[plugin_transform]
pub fn process_transform(
    mut program: Program,
    _metadata: TransformPluginProgramMetadata,
) -> Program {
    let mut visitor = RunnerTransform::new();
    program.visit_mut_with(&mut visitor);
    program
}

