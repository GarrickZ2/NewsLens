use crate::scheduler::engine::SchedulerEngine;
use tokio::sync::Mutex;
use tokio_rusqlite::Connection;

pub struct AppState {
    pub db: Connection,
    pub scheduler: Mutex<SchedulerEngine>,
}

impl AppState {
    pub fn new(db: Connection, scheduler: SchedulerEngine) -> Self {
        Self {
            db,
            scheduler: Mutex::new(scheduler),
        }
    }
}
