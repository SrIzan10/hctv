use reqwest;
use serde::Deserialize;
use std::collections::HashMap;
use std::fs::File;
use std::io::Write;
use std::env;

#[derive(Debug, Deserialize)]
struct SlackEmojiItem {
  name: String,
  #[serde(rename = "imageUrl")]
  image_url: String,
}

#[derive(Debug, Deserialize)]
struct DefaultEmojiResponse {
  emoji: HashMap<String, String>,
}

#[derive(Debug, Deserialize)]
struct EmojiData {
  unified: String,
  has_img_twitter: bool,
  short_name: String,
}

#[tokio::main]
async fn main() {
  let args: Vec<String> = env::args().collect();
  if std::env::var("SLACK_TOKEN").is_err() {
    eprintln!("Error: SLACK_TOKEN environment variable is not set.");
    return;
  }

  let mut slack_emojis = slack_request()
    .await
    .expect("Failed to fetch slack_emojis from Slack API");
  println!("{:?} slack_emojis fetched", slack_emojis.len());

  if args.len() > 1 && args[1] == "default" {
    let default_emojis = default_request()
      .await
      .expect("Failed to fetch default_emojis from GitHub");
    println!("{:?} default_emojis fetched", default_emojis.emoji.len());
    slack_emojis.extend(default_emojis.emoji);
  }

  let mut file = File::create("emojis.json").expect("failed to create file for some reason");
  let json_data =
    serde_json::to_string(&slack_emojis).expect("failed to serialize emojis wtf");
  file
    .write_all(json_data.as_bytes())
    .expect("failed to write emojis to file");
  println!("saved :yay:");
}

async fn slack_request() -> Result<HashMap<String, String>, Box<dyn std::error::Error>> {
  let client = reqwest::Client::new();
  let res = client
    .get("https://cachet.dunkirk.sh/emojis")
    .send()
    .await;

  match res {
    Ok(response) => {
      let items: Vec<SlackEmojiItem> = response.json().await?;
      let map: HashMap<String, String> = items
        .into_iter()
        .map(|item| (item.name, item.image_url))
        .collect();
      Ok(map)
    }
    Err(err) => {
      eprintln!("Error: {:?}", err);
      Err(Box::new(err))
    }
  }
}

async fn default_request() -> Result<DefaultEmojiResponse, Box<dyn std::error::Error>> {
  const CDN_URL: &str =
    "https://cdn.jsdelivr.net/npm/emoji-datasource-twitter@15.1.2/img/twitter/64/";
  let client = reqwest::Client::new();
  let res = client
    .get("https://raw.githubusercontent.com/iamcal/emoji-data/refs/heads/master/emoji.json")
    .send()
    .await;

  match res {
    Ok(response) => {
      let emoji_data: Vec<EmojiData> = response.json().await?;
      let emoji_map: HashMap<String, String> = emoji_data
        .into_iter()
        .filter(|e| e.has_img_twitter)
        .map(|e| (e.short_name, format!("{}{}.png", CDN_URL, e.unified.to_lowercase())))
        .collect();
      Ok(DefaultEmojiResponse { emoji: emoji_map })
    }
    Err(err) => {
      eprintln!("Error: {:?}", err);
      Err(Box::new(err))
    }
  }
}
