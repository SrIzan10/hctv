/**
 * Types for nginx-http-flv module statistics
 */

// Client information
interface Client {
  id: number;
  address: string;
  time: number;
  flashver: string;
  swfurl?: string;
  dropped: number;
  avsync: number;
  timestamp: number;
  publishing: boolean;
  active: boolean;
}

// Video metadata
interface VideoMeta {
  width: number;
  height: number;
  frame_rate: number;
  codec: string;
  profile: string;
  compat: number;
  level: number;
}

// Audio metadata
interface AudioMeta {
  codec: string;
  profile: string;
  channels: number;
  sample_rate: number;
}

// Stream metadata
interface StreamMeta {
  video: VideoMeta;
  audio: AudioMeta;
}

// Stream information
interface Stream {
  name: string;
  time: number;
  bw_in: number;
  bytes_in: number;
  bw_out: number;
  bytes_out: number;
  bw_audio: number;
  bw_video: number;
  clients: Client[];
  records: any[]; // Empty array in the provided example
  meta: StreamMeta;
  nclients: number;
  publishing: boolean;
  active: boolean;
}

// Live application section
interface Live {
  streams: Stream[];
  nclients: number;
}

// Recorder configuration
interface Recorder {
  id: string;
  flags: string[];
  unique: boolean;
  append: boolean;
  lock_file: boolean;
  notify: boolean;
  path: string;
  max_size: number;
  max_frames: number;
  interval: number;
  suffix: string;
}

// Recorders section
interface Recorders {
  count: number;
  lists: Recorder[];
}

// Application information
interface Application {
  name: string;
  live: Live;
  recorders: Recorders;
}

// Server information
interface Server {
  port: number;
  server_index: number;
  applications: Application[];
}

// Root HTTP-FLV structure
export interface HttpFlv {
  nginx_version: string;
  nginx_http_flv_version: string;
  compiler: string;
  built: string;
  pid: number;
  uptime: number;
  naccepted: number;
  bw_in: number;
  bytes_in: number;
  bw_out: number;
  bytes_out: number;
  servers: Server[];
}
