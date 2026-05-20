//! Toast Rust glue, factored so native, snapshot, and WASM entries share it.
//!
//! slintcn's Toast primitive expects a `VecModel<ToastItem>` bound into the
//! ToastQueue global. Without this wiring `show()` would be a no-op (the
//! Slint-side callback has no body). The two-phase dismiss (set
//! `dismissed: true` → wait 220 ms → remove from model) gives ToastView its
//! fade-out window.

use crate::{AppWindow, ToastItem, ToastQueue, ToastVariant};
use slint::{ComponentHandle, Model, ModelRc, SharedString, Timer, TimerMode, VecModel};
use std::cell::RefCell;
use std::collections::HashMap;
use std::rc::Rc;
use std::time::Duration;

pub fn setup(ui: &AppWindow) {
    let items: Rc<VecModel<ToastItem>> = Rc::new(VecModel::default());
    let next_id = Rc::new(RefCell::new(1i32));
    let timers: Rc<RefCell<HashMap<i32, Timer>>> = Rc::default();
    let removal_timers: Rc<RefCell<HashMap<i32, Timer>>> = Rc::default();

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
            items.push(ToastItem {
                id,
                text,
                variant,
                dismissed: false,
            });

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
        let items_outer = items.clone();
        let timers = timers.clone();
        let removal_outer = removal_timers.clone();
        queue.on_dismiss(move |id: i32| {
            let mut found = false;
            for i in 0..items_outer.row_count() {
                if let Some(mut item) = items_outer.row_data(i) {
                    if item.id == id && !item.dismissed {
                        item.dismissed = true;
                        items_outer.set_row_data(i, item);
                        found = true;
                        break;
                    }
                }
            }
            timers.borrow_mut().remove(&id);
            if !found {
                return;
            }

            let items = items_outer.clone();
            let removal_map = removal_outer.clone();
            let removal = Timer::default();
            removal.start(
                TimerMode::SingleShot,
                Duration::from_millis(220),
                move || {
                    for j in (0..items.row_count()).rev() {
                        if items.row_data(j).map(|t| t.id == id).unwrap_or(false) {
                            items.remove(j);
                            break;
                        }
                    }
                    removal_map.borrow_mut().remove(&id);
                },
            );
            removal_outer.borrow_mut().insert(id, removal);
        });
    }
}
