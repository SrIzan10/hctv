export interface RtmpStat {
  nginxt_version: string;
  compiler: string;
  built: string;
  pid: number;
  uptime: number;
  naccepted: number;
  bw_in: number;
  bw_out: number;
  clients: number;
  applications: Application[];
}

interface Application {
  name: string;
  live: LiveStream[];
  hls: HlsStream[];
  dash: DashStream[];
}

interface LiveStream {
  name: string;
  time: number;
  bw_in: number;
  bytes_in: number;
  bw_out: number;
  bytes_out: number;
  bw_audio: number;
  bw_video: number;
  clients: Client[];
}

interface HlsStream {
  name: string;
  bw_in: number;
  bytes_in: number;
  bw_out: number;
  bytes_out: number;
}

interface DashStream {
  name: string;
  bw_in: number;
  bytes_in: number;
  bw_out: number;
  bytes_out: number;
}

interface Client {
  id: string;
  address: string;
  time: number;
  flashver: string;
  dropped: number;
  avsync: number;
  timestamp: number;
  publishing: boolean;
  active: boolean;
  audio: AudioStream;
  video: VideoStream;
}

interface AudioStream {
  codec: string;
  profile: string;
  level: string;
  bw: number;
  channels: number;
  sample_rate: number;
}

interface VideoStream {
  codec: string;
  profile: string;
  level: string;
  bw: number;
  width: number;
  height: number;
  frame_rate: number;
}