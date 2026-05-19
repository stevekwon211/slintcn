use slint::{ComponentHandle, Model, ModelRc, SharedString, Timer, TimerMode, VecModel};
use std::cell::RefCell;
use std::collections::HashMap;
use std::rc::Rc;
use std::time::Duration;

slint::include_modules!();

fn main() -> Result<(), slint::PlatformError> {
    let ui = AppWindow::new()?;

    // ─── Toast queue Rust glue ────────────────────────────────────────────
    // slintcn's Toast primitive expects a Rust-side VecModel<ToastItem>
    // bound into the ToastQueue global. Without this wiring `show()` would
    // be a no-op (the Slint-side callback has no body).
    let items: Rc<VecModel<ToastItem>> = Rc::new(VecModel::default());
    let next_id = Rc::new(RefCell::new(1i32));
    let timers: Rc<RefCell<HashMap<i32, Timer>>> = Rc::default();

    let queue = ui.global::<ToastQueue>();
    queue.set_items(ModelRc::from(items.clone()));

    {
        let items = items.clone();
        let next_id = next_id.clone();
        let timers = timers.clone();
        let ui_weak = ui.as_weak();
        queue.on_show(move |text: SharedString, variant: ToastVariant| {
            let id = {
                let mut n = next_id.borrow_mut();
                let id = *n;
                *n += 1;
                id
            };
            items.push(ToastItem { id, text, variant });

            // Per-toast auto-dismiss after 3 s. Holding the Timer in a map
            // keyed by id so an explicit dismiss can also cancel it.
            let timer = Timer::default();
            let ui_weak = ui_weak.clone();
            timer.start(
                TimerMode::SingleShot,
                Duration::from_secs(3),
                move || {
                    if let Some(ui) = ui_weak.upgrade() {
                        ui.global::<ToastQueue>().invoke_dismiss(id);
                    }
                },
            );
            timers.borrow_mut().insert(id, timer);
        });
    }

    {
        let items = items.clone();
        let timers = timers.clone();
        queue.on_dismiss(move |id: i32| {
            for i in (0..items.row_count()).rev() {
                if items.row_data(i).map(|t| t.id == id).unwrap_or(false) {
                    items.remove(i);
                    break;
                }
            }
            timers.borrow_mut().remove(&id);
        });
    }

    ui.run()
}
