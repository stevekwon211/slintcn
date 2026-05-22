// slintcn-showcase — shared crate root for native, snapshot, and WASM
// entry points. Exposes Slint-generated types (AppWindow, ToastItem, …)
// plus a `toast_glue` module so each entry point wires the VecModel-backed
// Toast queue identically.

slint::include_modules!();

pub mod toast_glue;

#[cfg(target_arch = "wasm32")]
mod web {
    use crate::{toast_glue, AppWindow};
    use slint::ComponentHandle;
    use wasm_bindgen::prelude::*;

    // wasm-bindgen `start` runs at module init in the browser. `ui.run()`
    // both shows the window AND wires Slint's winit backend into the
    // browser's requestAnimationFrame loop. On WASM it returns immediately
    // after registering the handlers (the browser then owns the event loop);
    // on native it blocks, but the whole `web` module is gated on
    // `cfg(target_arch = "wasm32")` so native never reaches this code.
    #[wasm_bindgen(start)]
    pub fn start() {
        console_error_panic_hook::set_once();
        let ui = AppWindow::new().expect("AppWindow::new");
        toast_glue::setup(&ui);
        // /docs live-preview iframes load this bundle with ?preview=<name>;
        // that flips the window into chromeless single-component mode.
        if let Some(name) = preview_param() {
            ui.set_preview_name(name.into());
        }
        ui.run().expect("ui.run");
    }

    // Minimal query parser (preview names are simple [a-z-] tokens — no decode).
    fn preview_param() -> Option<String> {
        let search = web_sys::window()?.location().search().ok()?;
        let query = search.strip_prefix('?').unwrap_or(&search);
        for pair in query.split('&') {
            let mut kv = pair.splitn(2, '=');
            if kv.next() == Some("preview") {
                let value = kv.next().unwrap_or("");
                if !value.is_empty() {
                    return Some(value.to_string());
                }
            }
        }
        None
    }
}
