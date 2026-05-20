// slintcn — visual-regression snapshot tool.
//
// Renders each showcase section to PNG via Slint's SoftwareRenderer +
// a custom Platform impl that uses MinimalSoftwareWindow. No display
// server required; runs in CI / containers / headless macs.
//
// Build with:   cargo build --features snapshot --bin snapshot
// Run with:     cargo run   --features snapshot --bin snapshot           (all sections)
//               cargo run   --features snapshot --bin snapshot -- 4      (just section 4)
//
// Output: docs/img/snapshots/section-<n>-<name>.png

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

const SECTION_NAMES: [&str; 8] = [
    "buttons",
    "form",
    "overlays",
    "tabs",
    "signin",
    "settings",
    "dashboard",
    "selection",
];

fn main() {
    // Optional section filter — when omitted, snapshot every section.
    let args: Vec<String> = std::env::args().skip(1).collect();
    let sections: Vec<usize> = if args.is_empty() {
        (0..SECTION_NAMES.len()).collect()
    } else {
        args.iter()
            .filter_map(|s| s.parse::<usize>().ok())
            .filter(|i| *i < SECTION_NAMES.len())
            .collect()
    };

    let window = MinimalSoftwareWindow::new(RepaintBufferType::ReusedBuffer);
    window.set_size(slint::PhysicalSize::new(WIDTH, HEIGHT));

    slint::platform::set_platform(Box::new(SnapshotPlatform {
        window: window.clone(),
        start: std::time::Instant::now(),
    }))
    .expect("set_platform failed (already called?)");

    let ui = AppWindow::new().expect("AppWindow::new failed");
    ui.show().expect("show failed");

    let out = std::path::Path::new("../../docs/img/snapshots");
    std::fs::create_dir_all(out).expect("create snapshots dir");

    let mut buffer: Vec<slint::platform::software_renderer::Rgb565Pixel> =
        vec![Default::default(); (WIDTH * HEIGHT) as usize];

    for section in sections {
        ui.set_active_section(section as i32);

        // The next draw is the first one for this section state, so we
        // need a fresh full-frame render. Setting a property on the UI
        // dirties the window; draw_if_needed will paint everything.
        window.request_redraw();
        window.draw_if_needed(|renderer| {
            renderer.render(&mut buffer, WIDTH as usize);
        });

        // Rgb565 → RGBA8 conversion.
        let mut rgba = Vec::with_capacity((WIDTH * HEIGHT * 4) as usize);
        for px in &buffer {
            let raw: u16 = unsafe { std::mem::transmute_copy(px) };
            let r = (((raw >> 11) & 0x1f) as u32 * 255 / 31) as u8;
            let g = (((raw >> 5) & 0x3f) as u32 * 255 / 63) as u8;
            let b = ((raw & 0x1f) as u32 * 255 / 31) as u8;
            rgba.extend_from_slice(&[r, g, b, 255]);
        }

        let name = SECTION_NAMES[section];
        let path = out.join(format!("section-{section}-{name}.png"));
        let file = std::fs::File::create(&path).expect("create PNG file");
        let w = std::io::BufWriter::new(file);
        let mut encoder = png::Encoder::new(w, WIDTH, HEIGHT);
        encoder.set_color(png::ColorType::Rgba);
        encoder.set_depth(png::BitDepth::Eight);
        let mut writer = encoder.write_header().expect("png header");
        writer.write_image_data(&rgba).expect("png data");
        println!("snapshot → {}", path.display());
    }
}
