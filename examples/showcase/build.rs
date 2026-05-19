use std::fs;
use std::process::Command;

fn main() {
    // Regenerate components from the source-of-truth registry on every build.
    // Deleting first guarantees changes in registry/default/ propagate without
    // stale-cache surprises (the CLI's normal behavior skips theme files when
    // they already exist, which is correct for end-user projects but wrong here).
    let _ = fs::remove_dir_all("ui/slintcn");

    let status = Command::new("node")
        .arg("../../bin/slintcn.mjs")
        .args(["add", "button", "card", "input", "badge", "separator", "label"])
        .status()
        .expect("failed to invoke `node` for the slintcn CLI (need Node 20+ on PATH)");
    assert!(status.success(), "slintcn add failed");

    println!("cargo:rerun-if-changed=../../registry/default");
    println!("cargo:rerun-if-changed=../../bin/slintcn.mjs");
    println!("cargo:rerun-if-changed=slintcn.json");

    slint_build::compile("ui/app_window.slint").expect("Slint UI compile failed");
}
