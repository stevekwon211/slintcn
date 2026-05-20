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

    // wasm-bindgen `start` runs at module init in the browser. Slint's
    // winit backend handles the requestAnimationFrame loop internally, so
    // `ui.show()` is enough; we don't drive an event loop manually.
    #[wasm_bindgen(start)]
    pub fn start() {
        console_error_panic_hook::set_once();
        let ui = AppWindow::new().expect("AppWindow::new");
        toast_glue::setup(&ui);
        ui.show().expect("ui.show");
    }
}
