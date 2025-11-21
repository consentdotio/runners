use std::path::PathBuf;
use swc_core::ecma::transforms::testing::FixtureTestConfig;

mod common;
use common::run_fixture_test;

#[testing::fixture("tests/errors/**/input.js")]
fn error_test(input: PathBuf) {
    let output = input.parent().unwrap().join("output.js");
    // Skip if output.js doesn't exist (some error tests may only have stderr)
    if !output.exists() {
        return;
    }

    run_fixture_test(
        &input,
        &output,
        FixtureTestConfig {
            allow_error: true,
            module: Some(true),
            ..Default::default()
        },
    );
}

