use std::path::PathBuf;
use swc_core::ecma::transforms::testing::FixtureTestConfig;

mod common;
use common::run_fixture_test;

#[testing::fixture("tests/fixture/**/input.js")]
fn fixture_test(input: PathBuf) {
    let output = input
        .parent()
        .expect("input file should have a parent directory")
        .join("output.js");

    run_fixture_test(
        &input,
        &output,
        FixtureTestConfig {
            module: Some(true),
            ..Default::default()
        },
    );
}

