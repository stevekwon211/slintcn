// slintcn — visual-regression snapshot tool. Two modes:
//
//   1. SECTIONS (default)   — render each showcase sidebar section at 1100×760.
//      Output: docs/img/snapshots/section-<n>-<name>.png  (17 files).
//   2. PREVIEWS (--previews) — render every registry component / block via
//      PreviewHost at 900×600 (the same chromeless mode the WASM embed
//      iframe uses).
//      Output: docs/img/snapshots/preview-<name>.png      (64+ files).
//
// Both modes use Slint's SoftwareRenderer + a custom Platform impl on top of
// MinimalSoftwareWindow — no display server required; runs headless / in CI.
//
// Build:  cargo build --features snapshot --bin snapshot
// Run:    cargo run --features snapshot --bin snapshot                 (all sections)
//         cargo run --features snapshot --bin snapshot -- 4            (section 4)
//         cargo run --features snapshot --bin snapshot -- --previews   (every component)

use slint::platform::software_renderer::{
    MinimalSoftwareWindow, RepaintBufferType,
};
use slint::ComponentHandle;
use slintcn_showcase::AppWindow;
use std::rc::Rc;

struct SnapshotPlatform {
    window: Rc<MinimalSoftwareWindow>,
    start: std::time::Instant,
}

impl slint::platform::Platform for SnapshotPlatform {
    fn create_window_adapter(
        &self,
    ) -> Result<Rc<dyn slint::platform::WindowAdapter>, slint::PlatformError> {
        Ok(self.window.clone())
    }

    fn duration_since_start(&self) -> std::time::Duration {
        self.start.elapsed()
    }
}

const WIDTH: u32 = 1100;
const HEIGHT: u32 = 760;

// Preview canvas — fits DataTable / Calendar comfortably and gives the
// Command modal the room its backdrop needs without pushing the file size
// past what's reasonable for the repo.
const PREVIEW_WIDTH: u32 = 900;
const PREVIEW_HEIGHT: u32 = 600;

const SECTION_NAMES: [&str; 17] = [
    "buttons",
    "form",
    "overlays",
    "tabs",
    "signin",
    "settings",
    "dashboard",
    "selection",
    "feedback",
    "display",
    "navigation",
    "data",
    "typography",
    "hud",
    "interaction",
    "blocks",
    "colors",
];

fn main() {
    let args: Vec<String> = std::env::args().skip(1).collect();
    let previews_mode = args.iter().any(|a| a == "--previews");

    let window = MinimalSoftwareWindow::new(RepaintBufferType::ReusedBuffer);
    let (w0, h0) = if previews_mode {
        (PREVIEW_WIDTH, PREVIEW_HEIGHT)
    } else {
        (WIDTH, HEIGHT)
    };
    window.set_size(slint::PhysicalSize::new(w0, h0));

    slint::platform::set_platform(Box::new(SnapshotPlatform {
        window: window.clone(),
        start: std::time::Instant::now(),
    }))
    .expect("set_platform failed (already called?)");

    let ui = AppWindow::new().expect("AppWindow::new failed");
    ui.show().expect("show failed");

    let out = std::path::Path::new("../../docs/img/snapshots");
    std::fs::create_dir_all(out).expect("create snapshots dir");

    if previews_mode {
        run_previews(&window, &ui, out);
    } else {
        // Numeric filter args narrow which sections to render.
        let sections: Vec<usize> = if args.iter().any(|a| a.parse::<usize>().is_ok()) {
            args.iter()
                .filter_map(|s| s.parse::<usize>().ok())
                .filter(|i| *i < SECTION_NAMES.len())
                .collect()
        } else {
            (0..SECTION_NAMES.len()).collect()
        };
        run_sections(&window, &ui, out, &sections);
    }
}

fn run_sections(
    window: &MinimalSoftwareWindow,
    ui: &AppWindow,
    out: &std::path::Path,
    sections: &[usize],
) {
    let mut buffer: Vec<slint::platform::software_renderer::Rgb565Pixel> =
        vec![Default::default(); (WIDTH * HEIGHT) as usize];

    for &section in sections {
        ui.set_active_section(section as i32);
        // Setting a property dirties the window; the next draw paints fresh.
        window.request_redraw();
        window.draw_if_needed(|renderer| {
            renderer.render(&mut buffer, WIDTH as usize);
        });

        let path = out.join(format!("section-{section}-{}.png", SECTION_NAMES[section]));
        save_rgb565(&buffer, WIDTH, HEIGHT, &path);
        println!("snapshot → {}", path.display());
    }
}

fn run_previews(window: &MinimalSoftwareWindow, ui: &AppWindow, out: &std::path::Path) {
    // Discover every registry item from the source-of-truth catalog.
    let raw = std::fs::read_to_string("../../registry/default/registry.json")
        .expect("read registry.json (run from examples/showcase)");
    let v: serde_json::Value = serde_json::from_str(&raw).expect("parse registry.json");
    let components = v
        .get("components")
        .and_then(|c| c.as_object())
        .expect("registry.components object");

    // Park the section UI somewhere harmless; PreviewHost activates on a
    // non-empty `preview-name`, so the sidebar / section content stays out
    // of frame regardless of `active-section` value.
    ui.set_active_section(-1);

    let mut buffer: Vec<slint::platform::software_renderer::Rgb565Pixel> =
        vec![Default::default(); (PREVIEW_WIDTH * PREVIEW_HEIGHT) as usize];

    let mut count = 0usize;
    for (name, item) in components {
        let kind = item.get("type").and_then(|t| t.as_str()).unwrap_or("");
        if kind != "registry:ui" && kind != "registry:block" {
            continue;
        }
        ui.set_preview_name(name.into());
        window.request_redraw();
        window.draw_if_needed(|renderer| {
            renderer.render(&mut buffer, PREVIEW_WIDTH as usize);
        });

        let path = out.join(format!("preview-{name}.png"));
        save_rgb565(&buffer, PREVIEW_WIDTH, PREVIEW_HEIGHT, &path);
        println!("preview → {}", path.display());
        count += 1;
    }
    println!("{count} component / block previews written");
}

fn save_rgb565(
    buffer: &[slint::platform::software_renderer::Rgb565Pixel],
    w: u32,
    h: u32,
    path: &std::path::Path,
) {
    let mut rgba = Vec::with_capacity((w * h * 4) as usize);
    for px in buffer {
        let raw: u16 = unsafe { std::mem::transmute_copy(px) };
        let r = (((raw >> 11) & 0x1f) as u32 * 255 / 31) as u8;
        let g = (((raw >> 5) & 0x3f) as u32 * 255 / 63) as u8;
        let b = ((raw & 0x1f) as u32 * 255 / 31) as u8;
        rgba.extend_from_slice(&[r, g, b, 255]);
    }
    let file = std::fs::File::create(path).expect("create PNG file");
    let bw = std::io::BufWriter::new(file);
    let mut encoder = png::Encoder::new(bw, w, h);
    encoder.set_color(png::ColorType::Rgba);
    encoder.set_depth(png::BitDepth::Eight);
    let mut writer = encoder.write_header().expect("png header");
    writer.write_image_data(&rgba).expect("png data");
}
