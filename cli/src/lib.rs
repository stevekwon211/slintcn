//! slintcn — cargo-native installer for the slintcn component registry.
//!
//! The registry is plain static JSON (`/registry.json` + `/r/<name>.json`) with
//! the Slint source embedded in each item. This CLI is a thin transport: fetch
//! an item, resolve its `registryDependencies` recursively, and write each
//! file into the consumer's `slintcn.json` layout. It installs the *same* files
//! as the npm CLI from the *same* hosted registry — pick whichever runtime you
//! already have.

use serde::Deserialize;
use std::collections::{HashMap, HashSet};
use std::path::{Path, PathBuf};

/// Default hosted registry (GitHub Pages). Overridable via `--registry` or the
/// `registry` field in slintcn.json.
pub const DEFAULT_REGISTRY: &str = "https://zero-sq.github.io/slintcn";

// ---------------------------------------------------------------------------
// Registry JSON shapes
// ---------------------------------------------------------------------------

/// A single registry item (`/r/<name>.json`) — metadata + inlined file content.
#[derive(Debug, Clone, Deserialize)]
pub struct RegistryItem {
    pub name: String,
    #[serde(rename = "type", default)]
    pub item_type: Option<String>,
    #[serde(default)]
    pub title: Option<String>,
    #[serde(default)]
    pub description: Option<String>,
    #[serde(default)]
    pub category: Option<String>,
    #[serde(rename = "registryDependencies", default)]
    pub registry_dependencies: Vec<String>,
    #[serde(default)]
    pub files: Vec<RegistryFile>,
}

/// One file inside a registry item. `variants` lets the theme palette carry
/// base-color alternates (zinc/slate/stone) so any client can pick one without
/// a second request.
#[derive(Debug, Clone, Deserialize)]
pub struct RegistryFile {
    pub path: String,
    #[serde(default)]
    pub content: String,
    #[serde(rename = "type", default)]
    pub file_type: Option<String>,
    #[serde(default)]
    pub variants: Option<HashMap<String, String>>,
}

/// The registry index (`/registry.json`) — every item's metadata, no content.
#[derive(Debug, Clone, Deserialize)]
pub struct RegistryIndex {
    #[serde(default)]
    pub name: Option<String>,
    #[serde(default)]
    pub version: Option<String>,
    #[serde(default)]
    pub items: Vec<RegistryItem>,
}

// ---------------------------------------------------------------------------
// Config (slintcn.json)
// ---------------------------------------------------------------------------

#[derive(Debug, Default, Deserialize)]
struct RawConfig {
    #[serde(rename = "outDir")]
    out_dir: Option<String>,
    #[serde(rename = "themeDir")]
    theme_dir: Option<String>,
    #[serde(rename = "componentsDir")]
    components_dir: Option<String>,
    #[serde(rename = "blocksDir")]
    blocks_dir: Option<String>,
    #[serde(rename = "baseColor")]
    base_color: Option<String>,
    #[serde(default)]
    registry: Option<String>,
}

/// Resolved install layout. Defaults mirror the npm CLI: everything under
/// `ui/slintcn/` with theme/components/blocks siblings — the layout in which
/// the registry's relative imports (`../theme/tokens.slint`) resolve verbatim,
/// so no import rewriting is needed.
#[derive(Debug, Clone)]
pub struct Config {
    pub out_dir: PathBuf,
    pub theme_dir: PathBuf,
    pub components_dir: PathBuf,
    pub blocks_dir: PathBuf,
    pub base_color: String,
    pub registry: String,
}

fn resolve_raw(raw: RawConfig, cwd: &Path, registry_override: Option<String>, base_color_override: Option<String>) -> Config {
    let out_dir = cwd.join(raw.out_dir.as_deref().unwrap_or("ui/slintcn"));
    let theme_dir = raw.theme_dir.map(|d| cwd.join(d)).unwrap_or_else(|| out_dir.join("theme"));
    let components_dir = raw.components_dir.map(|d| cwd.join(d)).unwrap_or_else(|| out_dir.join("components"));
    let blocks_dir = raw.blocks_dir.map(|d| cwd.join(d)).unwrap_or_else(|| out_dir.join("blocks"));
    let base_color = base_color_override.or(raw.base_color).unwrap_or_else(|| "neutral".into());
    let registry = registry_override
        .or(raw.registry)
        .unwrap_or_else(|| DEFAULT_REGISTRY.into());
    Config { out_dir, theme_dir, components_dir, blocks_dir, base_color, registry }
}

/// Load `slintcn.json` from `cwd` if present, applying CLI overrides on top.
pub fn load_config(cwd: &Path, registry_override: Option<String>, base_color_override: Option<String>) -> Result<Config, String> {
    let path = cwd.join("slintcn.json");
    let raw = match std::fs::read_to_string(&path) {
        Ok(s) => serde_json::from_str::<RawConfig>(&s)
            .map_err(|e| format!("parse {}: {e}", path.display()))?,
        Err(_) => RawConfig::default(),
    };
    Ok(resolve_raw(raw, cwd, registry_override, base_color_override))
}

/// The slintcn.json a fresh `init` writes — self-contained (no template file to
/// ship in the crate).
pub fn default_config_json(base_color: &str) -> String {
    format!(
        r#"{{
  "$schema": "https://slintcn.dev/schema/slintcn.json",
  "style": "default",
  "baseColor": "{base_color}",
  "outDir": "ui/slintcn",
  "themeDir": "ui/slintcn/theme",
  "componentsDir": "ui/slintcn/components",
  "blocksDir": "ui/slintcn/blocks",
  "registries": {{}}
}}
"#
    )
}

// ---------------------------------------------------------------------------
// Path routing
// ---------------------------------------------------------------------------

/// Map a registry-relative path (`components/button.slint`) to its destination
/// under the resolved layout.
pub fn route_dest(rel: &str, config: &Config) -> PathBuf {
    if let Some(r) = rel.strip_prefix("theme/") {
        config.theme_dir.join(r)
    } else if let Some(r) = rel.strip_prefix("components/") {
        config.components_dir.join(r)
    } else if let Some(r) = rel.strip_prefix("blocks/") {
        config.blocks_dir.join(r)
    } else {
        config.out_dir.join(rel)
    }
}

/// URL for a single registry item.
pub fn item_url(registry: &str, name: &str) -> String {
    format!("{}/r/{}.json", registry.trim_end_matches('/'), name)
}

/// URL for the registry index.
pub fn index_url(registry: &str) -> String {
    format!("{}/registry.json", registry.trim_end_matches('/'))
}

// ---------------------------------------------------------------------------
// Fetching (injectable for tests)
// ---------------------------------------------------------------------------

/// Abstracts the network so the install pipeline is testable without HTTP.
pub trait Fetcher {
    fn get(&self, url: &str) -> Result<String, String>;
}

/// Real HTTP fetcher (blocking, rustls via ureq — no Node, no openssl).
pub struct HttpFetcher;

impl Fetcher for HttpFetcher {
    fn get(&self, url: &str) -> Result<String, String> {
        let resp = ureq::get(url)
            .call()
            .map_err(|e| format!("failed to fetch {url}: {e}"))?;
        resp.into_string()
            .map_err(|e| format!("failed to read {url}: {e}"))
    }
}

// ---------------------------------------------------------------------------
// Install pipeline
// ---------------------------------------------------------------------------

/// A file resolved and ready to write — produced without touching disk so the
/// pipeline is unit-testable and supports a future `--dry-run`.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct PlannedWrite {
    pub rel: String,
    pub dest: PathBuf,
    pub content: String,
}

/// Pick the right file content, swapping in a base-color palette variant when
/// the theme palette ships alternates and the user chose a non-neutral color.
fn select_content(file: &RegistryFile, config: &Config) -> String {
    if file.path == "theme/palette.slint" && config.base_color != "neutral" {
        if let Some(v) = file.variants.as_ref().and_then(|m| m.get(&config.base_color)) {
            return v.clone();
        }
    }
    file.content.clone()
}

/// Resolve an item URL and its transitive `registryDependencies` into the set of
/// files to write. Dedupes via `visited`; deps resolve against the item URL's
/// own directory (mirrors the npm CLI's remote-install path exactly).
pub fn plan_remote(
    url: &str,
    config: &Config,
    fetcher: &dyn Fetcher,
    visited: &mut HashSet<String>,
    out: &mut Vec<PlannedWrite>,
) -> Result<(), String> {
    if !visited.insert(url.to_string()) {
        return Ok(());
    }
    let body = fetcher.get(url)?;
    let item: RegistryItem =
        serde_json::from_str(&body).map_err(|e| format!("parse {url}: {e}"))?;

    let base = &url[..=url.rfind('/').unwrap_or(0)];
    for dep in &item.registry_dependencies {
        let dep_url = format!("{base}{dep}.json");
        plan_remote(&dep_url, config, fetcher, visited, out)?;
    }
    for file in &item.files {
        let dest = route_dest(&file.path, config);
        // Don't re-queue a file already planned (theme reached via two deps).
        if out.iter().any(|w| w.dest == dest) {
            continue;
        }
        out.push(PlannedWrite {
            rel: file.path.clone(),
            dest,
            content: select_content(file, config),
        });
    }
    Ok(())
}

/// Classify an `add` token into a fetchable URL. Bare names resolve against the
/// configured registry; full URLs pass through.
pub fn token_to_url(token: &str, config: &Config) -> String {
    if token.starts_with("http://") || token.starts_with("https://") {
        token.to_string()
    } else {
        item_url(&config.registry, token)
    }
}

/// Deps-first install order for `view`, walked over the index metadata.
pub fn resolve_order(names: &[String], index: &RegistryIndex) -> Result<Vec<String>, String> {
    let map: HashMap<&str, &RegistryItem> =
        index.items.iter().map(|i| (i.name.as_str(), i)).collect();
    let mut order = Vec::new();
    let mut seen = HashSet::new();
    for n in names {
        visit_order(n, &map, &mut order, &mut seen)?;
    }
    Ok(order)
}

fn visit_order(
    name: &str,
    map: &HashMap<&str, &RegistryItem>,
    order: &mut Vec<String>,
    seen: &mut HashSet<String>,
) -> Result<(), String> {
    if !seen.insert(name.to_string()) {
        return Ok(());
    }
    let item = map
        .get(name)
        .ok_or_else(|| format!("Unknown item: {name}"))?;
    for dep in &item.registry_dependencies {
        visit_order(dep, map, order, seen)?;
    }
    order.push(name.to_string());
    Ok(())
}

// ---------------------------------------------------------------------------
// CLI entry point
// ---------------------------------------------------------------------------

const HELP: &str = "\
slintcn — copy-paste Slint UI components (cargo-native, no Node required)

Usage:
  slintcn <command> [options]

Commands:
  init                  Create slintcn.json + install theme tokens
  add <name...>         Install components/blocks (resolves dependencies)
  list                  List every component in the registry, by category
  view <name>           Show an item's metadata + install order
  help                  Show this help

Options:
  -b, --base-color <c>  Palette base color: neutral | zinc | slate | stone
      --registry <url>  Registry base URL (default: the hosted slintcn registry)
  -v, --version         Print version

Examples:
  slintcn init --base-color zinc
  slintcn add button card input dialog
  cargo slintcn add data-table        # same, via the cargo subcommand form
";

/// Parsed CLI flags shared across commands.
struct Flags {
    registry: Option<String>,
    base_color: Option<String>,
    positionals: Vec<String>,
}

fn parse_flags(args: &[String]) -> Result<Flags, String> {
    let mut registry = None;
    let mut base_color = None;
    let mut positionals = Vec::new();
    let mut i = 0;
    while i < args.len() {
        match args[i].as_str() {
            "--registry" => {
                i += 1;
                registry = Some(args.get(i).ok_or("--registry needs a URL")?.clone());
            }
            "-b" | "--base-color" => {
                i += 1;
                base_color = Some(args.get(i).ok_or("--base-color needs a value")?.clone());
            }
            other => positionals.push(other.to_string()),
        }
        i += 1;
    }
    Ok(Flags { registry, base_color, positionals })
}

/// Dispatch a parsed argument vector (the binaries inject argv).
pub fn run(args: &[String]) -> Result<(), String> {
    let fetcher = HttpFetcher;
    let cwd = std::env::current_dir().map_err(|e| e.to_string())?;
    run_with(args, &fetcher, &cwd)
}

/// Testable core: dispatch with an injected fetcher + working directory.
pub fn run_with(args: &[String], fetcher: &dyn Fetcher, cwd: &Path) -> Result<(), String> {
    let cmd = args.first().map(|s| s.as_str()).unwrap_or("help");
    let rest = &args[1..];
    match cmd {
        "init" => cmd_init(rest, fetcher, cwd),
        "add" => cmd_add(rest, fetcher, cwd),
        "list" | "ls" => cmd_list(rest, fetcher, cwd),
        "view" | "show" => cmd_view(rest, fetcher, cwd),
        "-v" | "--version" | "version" => {
            println!("slintcn {}", env!("CARGO_PKG_VERSION"));
            Ok(())
        }
        "help" | "--help" | "-h" => {
            print!("{HELP}");
            Ok(())
        }
        other => Err(format!("unknown command: {other}\n\n{HELP}")),
    }
}

fn write_planned(writes: &[PlannedWrite]) -> Result<(), String> {
    for w in writes {
        if let Some(parent) = w.dest.parent() {
            std::fs::create_dir_all(parent).map_err(|e| format!("mkdir {}: {e}", parent.display()))?;
        }
        std::fs::write(&w.dest, &w.content).map_err(|e| format!("write {}: {e}", w.dest.display()))?;
    }
    Ok(())
}

fn cmd_init(args: &[String], fetcher: &dyn Fetcher, cwd: &Path) -> Result<(), String> {
    let flags = parse_flags(args)?;
    let config_path = cwd.join("slintcn.json");
    if config_path.exists() {
        println!("slintcn.json already exists — skipping init");
    } else {
        let base_color = flags.base_color.clone().unwrap_or_else(|| "neutral".into());
        std::fs::write(&config_path, default_config_json(&base_color))
            .map_err(|e| format!("write slintcn.json: {e}"))?;
        println!("Created slintcn.json (baseColor: {base_color})");
    }
    // Install the theme so the project compiles immediately.
    let config = load_config(cwd, flags.registry, flags.base_color)?;
    let mut writes = Vec::new();
    let mut visited = HashSet::new();
    plan_remote(&item_url(&config.registry, "theme"), &config, fetcher, &mut visited, &mut writes)?;
    write_planned(&writes)?;
    for w in &writes {
        println!("  + {}", display_rel(&w.dest, cwd));
    }
    println!("\nInstalled theme. Next: slintcn add button card input");
    Ok(())
}

fn cmd_add(args: &[String], fetcher: &dyn Fetcher, cwd: &Path) -> Result<(), String> {
    let flags = parse_flags(args)?;
    let config = load_config(cwd, flags.registry, flags.base_color)?;
    let tokens = if flags.positionals.is_empty() {
        vec!["theme".to_string()]
    } else {
        flags.positionals.clone()
    };

    let mut writes = Vec::new();
    let mut visited = HashSet::new();
    for token in &tokens {
        let url = token_to_url(token, &config);
        plan_remote(&url, &config, fetcher, &mut visited, &mut writes)?;
    }
    write_planned(&writes)?;
    for w in &writes {
        println!("  + {}", display_rel(&w.dest, cwd));
    }
    println!(
        "\nInstalled {} file(s). Import e.g. from \"{}/button.slint\".",
        writes.len(),
        display_rel(&config.components_dir, cwd)
    );
    Ok(())
}

fn cmd_list(args: &[String], fetcher: &dyn Fetcher, cwd: &Path) -> Result<(), String> {
    let flags = parse_flags(args)?;
    let config = load_config(cwd, flags.registry, None)?;
    let body = fetcher.get(&index_url(&config.registry))?;
    let index: RegistryIndex =
        serde_json::from_str(&body).map_err(|e| format!("parse registry.json: {e}"))?;

    let items: Vec<&RegistryItem> = index.items.iter().filter(|i| i.name != "theme").collect();
    let mut by_cat: HashMap<&str, Vec<&RegistryItem>> = HashMap::new();
    for item in &items {
        by_cat.entry(item.category.as_deref().unwrap_or("misc")).or_default().push(item);
    }
    println!("slintcn/{} — {} components\n", index.name.as_deref().unwrap_or("default"), items.len());
    let mut cats: Vec<&&str> = by_cat.keys().collect();
    cats.sort();
    for cat in cats {
        println!("  {cat}");
        for item in &by_cat[*cat] {
            println!("    {:<16} {}", item.name, item.description.as_deref().unwrap_or(""));
        }
        println!();
    }
    println!("Install: slintcn add <name…>   ·   Details: slintcn view <name>");
    Ok(())
}

fn cmd_view(args: &[String], fetcher: &dyn Fetcher, cwd: &Path) -> Result<(), String> {
    let flags = parse_flags(args)?;
    let name = flags.positionals.first().ok_or("view needs an item name")?;
    let config = load_config(cwd, flags.registry, None)?;

    let item: RegistryItem = serde_json::from_str(&fetcher.get(&item_url(&config.registry, name))?)
        .map_err(|e| format!("parse {name}.json: {e}"))?;
    let index: RegistryIndex = serde_json::from_str(&fetcher.get(&index_url(&config.registry))?)
        .map_err(|e| format!("parse registry.json: {e}"))?;
    let order = resolve_order(std::slice::from_ref(name), &index)?;

    println!("{}  ({})", item.title.as_deref().unwrap_or(name), item.item_type.as_deref().unwrap_or("registry:ui"));
    if let Some(d) = &item.description {
        println!("{d}");
    }
    println!("\ncategory:  {}", item.category.as_deref().unwrap_or("—"));
    println!("installs:  {}", order.join(", "));
    println!("files:");
    for f in &item.files {
        println!("  {}", f.path);
    }
    Ok(())
}

fn display_rel(p: &Path, cwd: &Path) -> String {
    p.strip_prefix(cwd).unwrap_or(p).display().to_string()
}

#[cfg(test)]
mod tests {
    use super::*;

    fn cfg() -> Config {
        let cwd = PathBuf::from("/proj");
        resolve_raw(RawConfig::default(), &cwd, None, None)
    }

    #[test]
    fn route_dest_maps_each_registry_dir() {
        let c = cfg();
        assert_eq!(route_dest("theme/tokens.slint", &c), PathBuf::from("/proj/ui/slintcn/theme/tokens.slint"));
        assert_eq!(route_dest("components/button.slint", &c), PathBuf::from("/proj/ui/slintcn/components/button.slint"));
        assert_eq!(route_dest("blocks/login.slint", &c), PathBuf::from("/proj/ui/slintcn/blocks/login.slint"));
    }

    #[test]
    fn item_url_trims_trailing_slash() {
        assert_eq!(item_url("https://x.dev/", "button"), "https://x.dev/r/button.json");
        assert_eq!(item_url("https://x.dev", "button"), "https://x.dev/r/button.json");
    }

    #[test]
    fn default_config_is_valid_json_with_base_color() {
        let j: serde_json::Value = serde_json::from_str(&default_config_json("zinc")).unwrap();
        assert_eq!(j["baseColor"], "zinc");
        assert_eq!(j["outDir"], "ui/slintcn");
    }

    #[test]
    fn token_to_url_passes_full_urls_through() {
        let c = cfg();
        assert_eq!(token_to_url("https://reg/r/x.json", &c), "https://reg/r/x.json");
        assert_eq!(token_to_url("button", &c), item_url(&c.registry, "button"));
    }
}
