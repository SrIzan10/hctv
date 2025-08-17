use reqwest;
use serde::Deserialize;
use std::collections::HashMap;
use std::fs::File;
use std::io::Write;

#[derive(Debug, Deserialize)]
struct SlackEmojiResponse {
    emoji: HashMap<String, String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    #[allow(dead_code)]
    error: Option<String>,
}

#[tokio::main]
async fn main() {
  if std::env::var("SLACK_TOKEN").is_err() {
    eprintln!("Error: SLACK_TOKEN environment variable is not set.");
    return;
  }

  let emojis = slack_request()
    .await
    .expect("Failed to fetch emojis from Slack API");

  println!("{:?} emojis fetched", emojis.emoji.len());
  let mut file = File::create("emojis.json").expect("failed to create file for some reason");
  let json_data = serde_json::to_string(&emojis.emoji).expect("failed to serialize emojis wtf");
  file.write_all(json_data.as_bytes())
    .expect("failed to write emojis to file");
  println!("saved :yay:");
}

async fn slack_request() -> Result<SlackEmojiResponse, Box<dyn std::error::Error>> {
  let client = reqwest::Client::new();
  let res = client
    .get("https://slack.com/api/emoji.list")
    .header(
      "Authorization",
      format!("Bearer {}", std::env::var("SLACK_TOKEN").expect("SLACK_TOKEN not set")),
    )
    .send()
    .await;

  match res {
    Ok(response) => Ok(response.json().await?),
    Err(err) => {
      eprintln!("Error: {:?}", err);
      Err(Box::new(err))
    }
  }
}
