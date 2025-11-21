//! Common test utilities for swc-plugin-runners tests

use std::path::Path;
use swc_core::ecma::{
    transforms::testing::{FixtureTestConfig, test_fixture},
    visit::visit_mut_pass,
};
use swc_plugin_runners::RunnerTransform;

/// Runs a fixture test with the given configuration.
///
/// This helper function extracts the common logic for running fixture tests,
/// reducing code duplication between error tests and regular fixture tests.
pub fn run_fixture_test(
    input: &Path,
    output: &Path,
    config: FixtureTestConfig,
) {
    let filename = input
        .file_name()
        .expect("input file should have a filename")
        .to_string_lossy()
        .to_string();

    test_fixture(
        Default::default(),
        &|_| visit_mut_pass(RunnerTransform::new(filename.clone())),
        input,
        output,
        config,
    );
}

