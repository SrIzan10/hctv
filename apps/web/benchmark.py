# quick and dirty ai generated benchmark i created for hls streams

#!/usr/bin/env python3
import asyncio
import aiohttp
import argparse
import time
import random
from tqdm import tqdm

async def simulate_viewer(session, base_url, stream_name, viewer_id, duration):
    """Simulate a viewer watching an HLS stream"""
    hls_url = f"{base_url}/hls/{stream_name}.m3u8"
    
    # First request the playlist
    try:
        start_time = time.time()
        end_time = start_time + duration
        
        while time.time() < end_time:
            # Get the master playlist
            async with session.get(hls_url) as response:
                if response.status != 200:
                    print(f"Viewer {viewer_id}: Failed to get playlist: {response.status}")
                    return
                
                playlist = await response.text()
                
            # Parse the playlist to find segments
            segments = [line for line in playlist.splitlines() if line.endswith('.ts')]
            
            if segments:
                # Request a random segment to simulate viewing
                segment = random.choice(segments)
                segment_url = f"{base_url}/hls/{segment}"
                
                async with session.get(segment_url) as seg_response:
                    if seg_response.status != 200:
                        print(f"Viewer {viewer_id}: Failed to get segment: {seg_response.status}")
                
            # Wait a bit before requesting again (simulating segment download)
            await asyncio.sleep(2)
            
    except Exception as e:
        print(f"Viewer {viewer_id} error: {str(e)}")

async def run_benchmark(base_url, stream_name, num_viewers, duration):
    """Run the benchmark with the specified number of viewers"""
    print(f"Starting benchmark with {num_viewers} viewers for {duration} seconds")
    
    all_tasks = []  # Keep track of all tasks
    
    async with aiohttp.ClientSession() as session:
        with tqdm(total=num_viewers, desc="Connecting viewers") as pbar:
            # Start viewers gradually to avoid overwhelming the server
            for i in range(0, num_viewers, 10):
                batch = []
                for j in range(i, min(i+10, num_viewers)):
                    task = asyncio.create_task(simulate_viewer(session, base_url, stream_name, j, duration))
                    batch.append(task)
                    all_tasks.append(task)
                
                pbar.update(len(batch))
                await asyncio.sleep(0.5)  # Small delay between batches
                
        print(f"All {num_viewers} viewers connected. Running for {duration} seconds...")
        
        # Wait for all tasks to complete
        await asyncio.gather(*all_tasks)
        
        print(f"Benchmark completed after {duration} seconds.")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description='Benchmark NGINX-RTMP HLS streaming with simulated viewers')
    parser.add_argument('--url', default='http://localhost:8888', help='Base URL of the NGINX server')
    parser.add_argument('--stream', required=True, help='Stream name to connect to')
    parser.add_argument('--viewers', type=int, default=100, help='Number of simulated viewers')
    parser.add_argument('--duration', type=int, default=60, help='Duration in seconds to run the test')
    
    args = parser.parse_args()
    
    print(f"Benchmarking stream: {args.stream}")
    print(f"Server: {args.url}")
    print(f"Viewers: {args.viewers}")
    print(f"Duration: {args.duration} seconds")
    
    asyncio.run(run_benchmark(args.url, args.stream, args.viewers, args.duration))