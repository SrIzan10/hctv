import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function LandingPage() {
  return (
    <>
      <main className="flex-1">
          <section className="w-full py-12 md:py-24 lg:py-32 xl:py-48">
            <div className="container px-4 md:px-6">
              <div className="flex flex-col items-center space-y-4 text-center">
                <div className="flex items-center rounded-lg px-3 py-1 text-sm bg-mantle text-red-500">
                    THIS IS A PLACEHOLDER WITH NO &quot;HACK CLUB&quot; VIBE, I&apos;M REALLY BAD AT LANDING PAGES SORRY
                </div>
                <div className="space-y-2">
                  <h1 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl lg:text-6xl/none">
                    This is hackclub.tv
                  </h1>
                  <p className="mx-auto max-w-[700px] text-gray-500 md:text-xl dark:text-gray-400">
                    The streaming service made by and for Hack Clubbers. Share your coding sessions, workshops, and hackathon moments live!
                  </p>
                </div>
                <div className="space-x-4">
                  <Link href="/login">
                    <Button>Start Streaming Now!</Button>
                  </Link>
                </div>
              </div>
            </div>
          </section>
          <section className="w-full py-12 md:py-24 lg:py-32 bg-mantle" id="features">
            <div className="container px-4 md:px-6">
              <div className="flex flex-col items-center justify-center space-y-4 text-center">
                <div className="space-y-2">
                  <div className="inline-block rounded-lg bg-gray-100 px-3 py-1 text-sm dark:bg-gray-800">
                    Platform Features
                  </div>
                  <h2 className="text-3xl font-bold tracking-tighter sm:text-5xl">
                    Built for Hack Clubbers, by Hack Clubbers
                  </h2>
                  <p className="max-w-[900px] text-gray-500 md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed dark:text-gray-400">
                    Everything you need to have a closer relationship with the Hack Club community!
                  </p>
                </div>
              </div>
              <div className="mx-auto max-w-5xl items-center gap-6 py-12 lg:grid-cols-2 lg:gap-12">
                <div className="flex flex-col justify-center items-center text-center space-y-4">
                  <ul className="grid gap-6">
                    <li>
                      <div className="grid gap-1">
                        <h3 className="text-xl font-bold">Live Streaming</h3>
                        <p className="text-gray-500 dark:text-gray-400">
                          Stream your coding sessions with low-latency and high quality
                        </p>
                      </div>
                    </li>
                    <li>
                      <div className="grid gap-1">
                        <h3 className="text-xl font-bold">Chat Integration</h3>
                        <p className="text-gray-500 dark:text-gray-400">
                          Interact with viewers in real-time through the built-in chat system
                        </p>
                      </div>
                    </li>
                    <li>
                      <div className="grid gap-1">
                          <h3 className="text-xl font-bold">Community Features</h3>
                          <p className="text-gray-500 dark:text-gray-400">
                            Follow other streamers and build your network of Hack Club friends!
                          </p>
                      </div>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </section>
        </main>
      </>
  );
}