use slint::ComponentHandle;
use slintcn_showcase::{toast_glue, AppWindow};

fn main() -> Result<(), slint::PlatformError> {
    let ui = AppWindow::new()?;
    toast_glue::setup(&ui);
    ui.run()
}
