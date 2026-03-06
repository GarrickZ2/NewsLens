use crate::error::{AppError, Result};
use crate::scheduler::job::execute_fetch_job;
use chrono::Utc;
use croner::Cron;
use std::collections::HashMap;
use tauri::AppHandle;
use tokio_cron_scheduler::{Job, JobScheduler};
use tokio_rusqlite::Connection;

pub struct SchedulerEngine {
    pub scheduler: JobScheduler,
    /// topic_id -> (job_uuid, cron_expression)
    pub jobs: HashMap<String, (uuid::Uuid, String)>,
}

impl SchedulerEngine {
    pub async fn new() -> Result<Self> {
        let scheduler = JobScheduler::new()
            .await
            .map_err(|e| AppError::Scheduler(e.to_string()))?;

        Ok(Self {
            scheduler,
            jobs: HashMap::new(),
        })
    }

    pub async fn start(&self) -> Result<()> {
        self.scheduler
            .start()
            .await
            .map_err(|e| AppError::Scheduler(e.to_string()))?;
        Ok(())
    }

    pub async fn add_topic_job(
        &mut self,
        topic_id: String,
        cron_schedule: &str,
        app: AppHandle,
        db: Connection,
    ) -> Result<()> {
        self.remove_topic_job(&topic_id).await?;

        let cron_expr = schedule_to_cron(cron_schedule);
        let topic_id_clone = topic_id.clone();

        // tokio-cron-scheduler needs 6-field cron (sec min hour dom month dow)
        // but schedule_to_cron() returns standard 5-field; prepend "0" for seconds
        let six_field = format!("0 {}", cron_expr);
        let job = Job::new_async(six_field.as_str(), move |_uuid, _scheduler| {
            let app = app.clone();
            let db = db.clone();
            let tid = topic_id_clone.clone();
            Box::pin(async move {
                execute_fetch_job(app, db, tid).await;
            })
        })
        .map_err(|e| AppError::Scheduler(e.to_string()))?;

        let job_id = self
            .scheduler
            .add(job)
            .await
            .map_err(|e| AppError::Scheduler(e.to_string()))?;

        self.jobs.insert(topic_id, (job_id, cron_expr));
        Ok(())
    }

    pub async fn remove_topic_job(&mut self, topic_id: &str) -> Result<()> {
        if let Some((job_id, _)) = self.jobs.remove(topic_id) {
            let _ = self.scheduler.remove(&job_id).await;
        }
        Ok(())
    }

    /// Compute next run times from stored cron expressions (no scheduler query needed)
    pub fn get_next_run_times(&self) -> HashMap<String, Option<String>> {
        let now = Utc::now();
        self.jobs
            .iter()
            .map(|(topic_id, (_, cron_expr))| {
                let next = Cron::new(cron_expr)
                    .parse()
                    .ok()
                    .and_then(|cron| cron.find_next_occurrence(&now, false).ok())
                    .map(|dt| dt.to_rfc3339());
                (topic_id.clone(), next)
            })
            .collect()
    }
}

pub fn schedule_to_cron(schedule: &str) -> String {
    match schedule {
        "every_1h" => "0 * * * *".to_string(),
        "every_3h" => "0 */3 * * *".to_string(),
        "every_8h" => "0 */8 * * *".to_string(),
        "daily_9am" => "0 9 * * *".to_string(),
        "every_1min" => "* * * * *".to_string(),
        other => other.to_string(),
    }
}
