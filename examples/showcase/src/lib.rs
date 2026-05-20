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
        web_sys::console::log_1(&"slintcn: WASM module starting".into());
        let ui = AppWindow::new().expect("AppWindow::new");
        toast_glue::setup(&ui);
        web_sys::console::log_1(&"slintcn: calling ui.run()".into());
        ui.run().expect("ui.run");
        web_sys::console::log_1(&"slintcn: ui.run() returned".into());
    }
}
